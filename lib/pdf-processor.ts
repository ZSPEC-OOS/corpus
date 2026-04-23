import { createHash } from 'crypto';

export interface PageContent {
  pageNumber: number;
  text: string;
}

export interface Section {
  title?: string;
  content: string;
  pageStart: number;
  pageEnd: number;
}

export interface DocumentStructure {
  pages: PageContent[];
  sections: Section[];
}

export interface Chunk {
  id: string;
  content: string;
  pageNumber: number;
  sectionIndex: number;
  hash: string;
  metadata: { wordCount: number; charCount: number; pageNumber: number };
}

export interface ScoredChunk extends Chunk {
  qualityScore: number;
  qualityFlags: string[];
}

export interface DeduplicationResult {
  unique: Chunk[];
  duplicateCount: number;
}

export interface ValidationResult {
  valid: ScoredChunk[];
  failed: number;
  errors: string[];
}

export async function extractPdfText(filePath: string): Promise<PageContent[]> {
  const { readFile } = await import('fs/promises');
  // Dynamic import keeps pdfjs-dist out of the client bundle and away from
  // Next.js's webpack pass for server-only routes.
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  GlobalWorkerOptions.workerSrc = '';

  const buffer = await readFile(filePath);
  const data = new Uint8Array(buffer);
  const loadingTask = getDocument({ data, verbosity: 0 });
  const doc = await loadingTask.promise;

  const pages: PageContent[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join(' ');
    pages.push({ pageNumber: i, text });
    page.cleanup();
  }

  await doc.destroy();
  return pages;
}

export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]+$/gm, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

const HEADING_RE = /^([A-Z][A-Z\s\d:,\-]{3,59})$|^#{1,4}\s.+/;

export function detectStructure(pages: PageContent[]): DocumentStructure {
  const sections: Section[] = [];
  let current: Section | null = null;

  const flush = () => {
    if (current && current.content.trim()) sections.push(current);
  };

  for (const page of pages) {
    const cleaned = cleanText(page.text);
    const paragraphs = cleaned.split(/\n{2,}/);

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      if (HEADING_RE.test(trimmed) && trimmed.length < 100) {
        flush();
        current = { title: trimmed, content: '', pageStart: page.pageNumber, pageEnd: page.pageNumber };
      } else {
        if (!current) current = { content: '', pageStart: page.pageNumber, pageEnd: page.pageNumber };
        current.content += (current.content ? '\n\n' : '') + trimmed;
        current.pageEnd = page.pageNumber;
      }
    }
  }

  flush();

  if (sections.length === 0) {
    for (const page of pages) {
      const cleaned = cleanText(page.text);
      if (cleaned) sections.push({ content: cleaned, pageStart: page.pageNumber, pageEnd: page.pageNumber });
    }
  }

  return { pages, sections };
}

const MAX_CHUNK_CHARS = 1500;
const MIN_CHUNK_CHARS = 50;

export function chunkDocument(structure: DocumentStructure): Chunk[] {
  const chunks: Chunk[] = [];
  let index = 0;

  for (let si = 0; si < structure.sections.length; si++) {
    const section = structure.sections[si];
    const words = section.content.split(/\s+/).filter(Boolean);
    if (!words.length) continue;

    let currentWords: string[] = [];
    let currentChars = 0;

    const flush = () => {
      if (!currentWords.length) return;
      const content = currentWords.join(' ');
      if (content.length < MIN_CHUNK_CHARS) return;
      chunks.push({
        id: `chunk_${index++}`,
        content,
        pageNumber: section.pageStart,
        sectionIndex: si,
        hash: createHash('sha256').update(content).digest('hex'),
        metadata: { wordCount: currentWords.length, charCount: content.length, pageNumber: section.pageStart },
      });
      currentWords = [];
      currentChars = 0;
    };

    for (const word of words) {
      currentWords.push(word);
      currentChars += word.length + 1;
      if (currentChars >= MAX_CHUNK_CHARS) flush();
    }
    flush();
  }

  return chunks;
}

export function deduplicateChunks(chunks: Chunk[]): DeduplicationResult {
  const seen = new Set<string>();
  const unique: Chunk[] = [];
  let duplicateCount = 0;

  for (const chunk of chunks) {
    if (seen.has(chunk.hash)) {
      duplicateCount++;
    } else {
      seen.add(chunk.hash);
      unique.push(chunk);
    }
  }

  return { unique, duplicateCount };
}

export function scoreChunks(chunks: Chunk[]): ScoredChunk[] {
  return chunks.map((chunk) => {
    const flags: string[] = [];
    let score = 1.0;

    const words = chunk.content.split(/\s+/).filter(Boolean);
    const sentences = chunk.content.split(/[.!?]+/).filter((s) => s.trim().length > 5);
    const avgWordLen = words.reduce((s, w) => s + w.length, 0) / Math.max(words.length, 1);
    const alphaRatio = (chunk.content.match(/[a-zA-Z]/g) ?? []).length / Math.max(chunk.content.length, 1);

    if (words.length < 10) { score -= 0.3; flags.push('too_short'); }
    if (avgWordLen < 3) { score -= 0.2; flags.push('low_avg_word_length'); }
    if (sentences.length === 0) { score -= 0.2; flags.push('no_sentences'); }
    if (alphaRatio < 0.4) { score -= 0.3; flags.push('low_alpha_ratio'); }

    return { ...chunk, qualityScore: Math.max(0, Math.min(1, score)), qualityFlags: flags };
  });
}

export function validateChunks(chunks: ScoredChunk[], schemaContent?: string): ValidationResult {
  if (!schemaContent) return { valid: chunks, failed: 0, errors: [] };

  let schema: Record<string, unknown>;
  try {
    schema = JSON.parse(schemaContent) as Record<string, unknown>;
  } catch {
    return { valid: chunks, failed: 0, errors: ['Schema is not valid JSON — validation skipped'] };
  }

  const required = (schema.required as string[] | undefined) ?? [];
  const valid: ScoredChunk[] = [];
  const errors: string[] = [];
  let failed = 0;

  for (const chunk of chunks) {
    const record: Record<string, unknown> = { content: chunk.content, ...chunk.metadata };
    const missing = required.filter((f) => !(f in record));
    if (missing.length) {
      failed++;
      errors.push(`${chunk.id}: missing required fields: ${missing.join(', ')}`);
    } else {
      valid.push(chunk);
    }
  }

  return { valid, failed, errors };
}

export function generateJsonl(chunks: ScoredChunk[], documentId: string): string {
  return chunks
    .map((chunk) =>
      JSON.stringify({
        id: chunk.id,
        content: chunk.content,
        source_document_id: documentId,
        page_number: chunk.pageNumber,
        section_index: chunk.sectionIndex,
        quality_score: chunk.qualityScore,
        quality_flags: chunk.qualityFlags,
        word_count: chunk.metadata.wordCount,
        char_count: chunk.metadata.charCount,
      }),
    )
    .join('\n');
}
