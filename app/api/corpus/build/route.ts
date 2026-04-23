import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import {
  cleanText,
  chunkDocument,
  deduplicateChunks,
  detectStructure,
  extractPdfText,
  generateJsonl,
  scoreChunks,
  validateChunks,
} from '@/lib/pdf-processor';
import { getDataDir, listSchemas, getSettings } from '@/lib/inMemoryStore';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import { mkdirSync } from 'fs';

const MAX_PDF_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();

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
        // Hash the content field so we can dedup new chunks against it
        const content = typeof record.content === 'string' ? record.content : trimmed;
        baseHashes.add(createHash('sha256').update(content).digest('hex'));
      } catch {
        // skip malformed lines
      }
    }
  }

  // ── 2. Collect PDF files ──────────────────────────────────────────────────
  const pdfs = formData.getAll('pdf').filter((f): f is File => f instanceof File && f.size > 0);

  if (pdfs.length === 0) {
    return NextResponse.json({ error: 'At least one PDF is required.' }, { status: 400 });
  }

  for (const pdf of pdfs) {
    if (pdf.type !== 'application/pdf') {
      return NextResponse.json({ error: `${pdf.name} is not a PDF.` }, { status: 415 });
    }
    if (pdf.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: `${pdf.name} exceeds the 100 MB limit.` }, { status: 413 });
    }
  }

  // ── 3. Process each PDF ───────────────────────────────────────────────────
  const dataDir = getDataDir();
  const tmpDir = resolve(dataDir, 'tmp');
  mkdirSync(tmpDir, { recursive: true });

  const allNewChunks: ReturnType<typeof scoreChunks> = [];
  const seenHashes = new Set<string>(baseHashes); // dedup against base + within batch
  const stats = { pagesProcessed: 0, chunksBeforeDedup: 0, duplicatesRemoved: 0 };

  for (const pdf of pdfs) {
    const tmpPath = resolve(tmpDir, `${crypto.randomUUID()}-${pdf.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    try {
      const buffer = Buffer.from(await pdf.arrayBuffer());
      await writeFile(tmpPath, buffer);

      const pages = (await extractPdfText(tmpPath)).map((p) => ({ ...p, text: cleanText(p.text) }));
      stats.pagesProcessed += pages.length;

      const structure = detectStructure(pages);
      const chunks = chunkDocument(structure);
      stats.chunksBeforeDedup += chunks.length;

      // Cross-dedup: against base AND previously processed PDFs in this batch
      for (const chunk of chunks) {
        if (seenHashes.has(chunk.hash)) {
          stats.duplicatesRemoved++;
        } else {
          seenHashes.add(chunk.hash);
          allNewChunks.push(...scoreChunks([chunk]));
        }
      }
    } finally {
      // Clean up temp file
      await import('fs/promises').then((fs) => fs.unlink(tmpPath).catch(() => {}));
    }
  }

  // ── 4. Schema validation (uses active schema if set) ─────────────────────
  const activeSchema = listSchemas().find((s) => s.isActive);
  const settings = getSettings();
  const { valid, failed } = validateChunks(allNewChunks, activeSchema?.content);

  if (settings.strictSchemaValidation && failed > 0 && valid.length === 0) {
    return NextResponse.json({ error: 'All chunks failed schema validation.' }, { status: 422 });
  }

  // ── 5. Build master output ────────────────────────────────────────────────
  // Base records first (unchanged), then new validated chunks
  const newJsonl = generateJsonl(valid, 'corpus-build');
  const baseJsonl = baseRecords.map((r) => JSON.stringify(r)).join('\n');
  const masterJsonl = [baseJsonl, newJsonl].filter(Boolean).join('\n');

  const totalRecords = baseRecords.length + valid.length;
  const avgQuality = valid.length
    ? valid.reduce((s, c) => s + c.qualityScore, 0) / valid.length
    : 0;

  return new NextResponse(masterJsonl, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': 'attachment; filename="master_corpus.jsonl"',
      'X-Corpus-Total-Records': String(totalRecords),
      'X-Corpus-New-Records': String(valid.length),
      'X-Corpus-Duplicates-Removed': String(stats.duplicatesRemoved),
      'X-Corpus-Pages-Processed': String(stats.pagesProcessed),
      'X-Corpus-Avg-Quality': avgQuality.toFixed(3),
    },
  });
}
