import { createHash } from 'crypto';
import { mkdirSync } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { resolve } from 'path';
import { NextResponse } from 'next/server';
import {
  cleanText,
  chunkDocument,
  detectStructure,
  extractPdfText,
  generateJsonl,
  scoreChunks,
  validateChunks,
  type ScoredChunk,
} from '@/lib/pdf-processor';
import { describePageWithAI, renderPdfPages, type PageImage } from '@/lib/image-extractor';
import { getDataDir, listSchemas, getSettings } from '@/lib/inMemoryStore';

const MAX_PDF_BYTES = 100 * 1024 * 1024;

// Quality threshold below which a page is sent to AI for enhancement.
// Alpha ratio < this value = mostly non-text (garbled OCR, scan noise, etc.)
const DEFAULT_AI_THRESHOLD = 0.5;

export async function POST(request: Request) {
  const formData = await request.formData();
  const settings = getSettings();
  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  const useAI = !!(settings.aiEnhancement && apiKey);
  const extractImages = !!(settings.extractImages);
  const aiThreshold = settings.aiQualityThreshold ?? DEFAULT_AI_THRESHOLD;

  // ── 1. Parse optional base JSONL ─────────────────────────────────────────
  const baseFile = formData.get('base');
  const baseRecords: unknown[] = [];
  const baseHashes = new Set<string>();

  if (baseFile instanceof File && baseFile.size > 0) {
    const text = await baseFile.text();
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const record = JSON.parse(trimmed) as Record<string, unknown>;
        baseRecords.push(record);
        const content = typeof record.content === 'string' ? record.content : trimmed;
        baseHashes.add(createHash('sha256').update(content).digest('hex'));
      } catch { /* skip malformed lines */ }
    }
  }

  // ── 2. Collect and validate PDFs ─────────────────────────────────────────
  const pdfs = formData.getAll('pdf').filter((f): f is File => f instanceof File && f.size > 0);
  if (pdfs.length === 0) return NextResponse.json({ error: 'At least one PDF is required.' }, { status: 400 });

  for (const pdf of pdfs) {
    if (pdf.type !== 'application/pdf') return NextResponse.json({ error: `${pdf.name} is not a PDF.` }, { status: 415 });
    if (pdf.size > MAX_PDF_BYTES) return NextResponse.json({ error: `${pdf.name} exceeds 100 MB.` }, { status: 413 });
  }

  // ── 3. Process each PDF ───────────────────────────────────────────────────
  const dataDir = getDataDir();
  const runId = crypto.randomUUID();
  const tmpDir = resolve(dataDir, 'tmp');
  mkdirSync(tmpDir, { recursive: true });

  const allNewChunks: ScoredChunk[] = [];
  const seenHashes = new Set<string>(baseHashes);
  const stats = { pagesProcessed: 0, chunksBeforeDedup: 0, duplicatesRemoved: 0, aiPagesEnhanced: 0 };

  // Map page number → rendered image info, built per-PDF when extractImages is on
  let pageImages: PageImage[] = [];

  for (const pdf of pdfs) {
    const tmpPath = resolve(tmpDir, `${crypto.randomUUID()}-${pdf.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    try {
      await writeFile(tmpPath, Buffer.from(await pdf.arrayBuffer()));

      // Render pages to PNG if image extraction or AI fallback is enabled
      if (extractImages || useAI) {
        pageImages = await renderPdfPages(tmpPath, dataDir, runId);
      }

      // Extract text — enhanced with AI for low-quality pages when enabled
      let pages = (await extractPdfText(tmpPath)).map((p) => ({ ...p, text: cleanText(p.text) }));

      if (useAI) {
        pages = await Promise.all(
          pages.map(async (p) => {
            const alphaRatio = (p.text.match(/[a-zA-Z]/g) ?? []).length / Math.max(p.text.length, 1);
            if (alphaRatio < aiThreshold || p.text.length < 100) {
              const img = pageImages.find((pi) => pi.pageNumber === p.pageNumber);
              if (img) {
                const absPath = resolve(dataDir, img.storagePath);
                const aiText = await describePageWithAI(absPath, apiKey, p.pageNumber).catch(() => p.text);
                if (aiText) { stats.aiPagesEnhanced++; return { ...p, text: aiText }; }
              }
            }
            return p;
          }),
        );
      }

      stats.pagesProcessed += pages.length;
      const structure = detectStructure(pages);
      const rawChunks = chunkDocument(structure);
      stats.chunksBeforeDedup += rawChunks.length;

      // Attach image references to chunks if extractImages is on
      const chunksWithImages = rawChunks.map((chunk) => {
        if (!extractImages) return chunk;
        const imgs = pageImages
          .filter((pi) => pi.pageNumber === chunk.pageNumber)
          .map(({ pageNumber, storagePath, widthPx, heightPx, description }) => ({
            pageNumber, storagePath, widthPx, heightPx, ...(description ? { description } : {}),
          }));
        return imgs.length ? { ...chunk, images: imgs } : chunk;
      });

      for (const chunk of chunksWithImages) {
        if (seenHashes.has(chunk.hash)) {
          stats.duplicatesRemoved++;
        } else {
          seenHashes.add(chunk.hash);
          allNewChunks.push(...scoreChunks([chunk]));
        }
      }
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  }

  // ── 4. Schema validation ──────────────────────────────────────────────────
  const activeSchema = listSchemas().find((s) => s.isActive);
  const { valid, failed } = validateChunks(allNewChunks, activeSchema?.content);
  if (settings.strictSchemaValidation && failed > 0 && valid.length === 0) {
    return NextResponse.json({ error: 'All chunks failed schema validation.' }, { status: 422 });
  }

  // ── 5. Build master output ────────────────────────────────────────────────
  const newJsonl = generateJsonl(valid, runId);
  const baseJsonl = baseRecords.map((r) => JSON.stringify(r)).join('\n');
  const masterJsonl = [baseJsonl, newJsonl].filter(Boolean).join('\n');

  const totalRecords = baseRecords.length + valid.length;
  const avgQuality = valid.length ? valid.reduce((s, c) => s + c.qualityScore, 0) / valid.length : 0;

  return new NextResponse(masterJsonl, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': 'attachment; filename="master_corpus.jsonl"',
      'X-Corpus-Total-Records': String(totalRecords),
      'X-Corpus-New-Records': String(valid.length),
      'X-Corpus-Duplicates-Removed': String(stats.duplicatesRemoved),
      'X-Corpus-Pages-Processed': String(stats.pagesProcessed),
      'X-Corpus-AI-Pages-Enhanced': String(stats.aiPagesEnhanced),
      'X-Corpus-Avg-Quality': avgQuality.toFixed(3),
    },
  });
}
