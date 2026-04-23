import { describe, it, expect } from 'vitest';
import {
  cleanText,
  detectStructure,
  chunkDocument,
  deduplicateChunks,
  scoreChunks,
  validateChunks,
  generateJsonl,
  PageContent,
} from '../lib/pdf-processor';

// ── cleanText ────────────────────────────────────────────────────────────────

describe('cleanText', () => {
  it('collapses multiple spaces to one', () => {
    expect(cleanText('hello   world')).toBe('hello world');
  });

  it('normalises CRLF to LF', () => {
    expect(cleanText('a\r\nb')).toBe('a\nb');
  });

  it('collapses 3+ blank lines to 2', () => {
    expect(cleanText('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('strips control characters', () => {
    expect(cleanText('hello\x00world')).toBe('helloworld');
  });

  it('trims leading and trailing whitespace', () => {
    expect(cleanText('  hello  ')).toBe('hello');
  });
});

// ── detectStructure ──────────────────────────────────────────────────────────

describe('detectStructure', () => {
  const pages: PageContent[] = [
    { pageNumber: 1, text: 'Introduction\n\nThis is the intro paragraph about the topic.' },
    { pageNumber: 2, text: 'METHODS\n\nWe used a quantitative approach with 100 subjects.' },
  ];

  it('returns one section per distinct block when no headings detected', () => {
    const pages2: PageContent[] = [
      { pageNumber: 1, text: 'Just a simple paragraph. No headings here at all.' },
    ];
    const { sections } = detectStructure(pages2);
    expect(sections.length).toBeGreaterThan(0);
  });

  it('includes page reference in section', () => {
    const { sections } = detectStructure(pages);
    expect(sections.some((s) => s.pageStart === 1)).toBe(true);
  });

  it('does not produce empty sections', () => {
    const { sections } = detectStructure(pages);
    for (const s of sections) {
      expect(s.content.trim().length).toBeGreaterThan(0);
    }
  });
});

// ── chunkDocument ────────────────────────────────────────────────────────────

describe('chunkDocument', () => {
  const longText = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ');
  const structure = {
    pages: [{ pageNumber: 1, text: longText }],
    sections: [{ content: longText, pageStart: 1, pageEnd: 1 }],
  };

  it('splits long section into multiple chunks', () => {
    const chunks = chunkDocument(structure);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('each chunk has a sha256 hash', () => {
    const chunks = chunkDocument(structure);
    for (const c of chunks) {
      expect(c.hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('respects MIN_CHUNK_CHARS — no tiny chunks', () => {
    const tiny = { pages: [], sections: [{ content: 'hi', pageStart: 1, pageEnd: 1 }] };
    const chunks = chunkDocument(tiny);
    expect(chunks).toHaveLength(0);
  });
});

// ── deduplicateChunks ────────────────────────────────────────────────────────

describe('deduplicateChunks', () => {
  const makeChunk = (content: string, id: string) => {
    const { createHash } = require('crypto') as typeof import('crypto');
    return {
      id,
      content,
      pageNumber: 1,
      sectionIndex: 0,
      hash: createHash('sha256').update(content).digest('hex'),
      metadata: { wordCount: content.split(' ').length, charCount: content.length, pageNumber: 1 },
    };
  };

  it('removes exact duplicate chunks', () => {
    const c1 = makeChunk('hello world this is content', 'c1');
    const c2 = makeChunk('hello world this is content', 'c2');
    const c3 = makeChunk('different content entirely', 'c3');
    const { unique, duplicateCount } = deduplicateChunks([c1, c2, c3]);
    expect(unique).toHaveLength(2);
    expect(duplicateCount).toBe(1);
  });

  it('returns all chunks when none are duplicated', () => {
    const c1 = makeChunk('first chunk', 'c1');
    const c2 = makeChunk('second chunk', 'c2');
    const { unique, duplicateCount } = deduplicateChunks([c1, c2]);
    expect(unique).toHaveLength(2);
    expect(duplicateCount).toBe(0);
  });
});

// ── scoreChunks ──────────────────────────────────────────────────────────────

describe('scoreChunks', () => {
  const makeChunk = (content: string) => ({
    id: 'c1',
    content,
    pageNumber: 1,
    sectionIndex: 0,
    hash: 'abc',
    metadata: { wordCount: content.split(' ').length, charCount: content.length, pageNumber: 1 },
  });

  it('assigns score 1 to clean, rich text', () => {
    const content = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ') + '. Full sentence here.';
    const [scored] = scoreChunks([makeChunk(content)]);
    expect(scored.qualityScore).toBeGreaterThan(0.7);
  });

  it('penalises very short chunks', () => {
    const [scored] = scoreChunks([makeChunk('short')]);
    expect(scored.qualityFlags).toContain('too_short');
    expect(scored.qualityScore).toBeLessThan(0.8);
  });

  it('penalises chunks with mostly non-alpha chars', () => {
    const [scored] = scoreChunks([makeChunk('123 456 789 000 !!! ### @@@')]);
    expect(scored.qualityFlags).toContain('low_alpha_ratio');
  });
});

// ── validateChunks ───────────────────────────────────────────────────────────

describe('validateChunks', () => {
  const makeScored = (content: string) => ({
    id: 'c1', content, pageNumber: 1, sectionIndex: 0, hash: 'abc',
    metadata: { wordCount: 5, charCount: content.length, pageNumber: 1 },
    qualityScore: 1, qualityFlags: [],
  });

  it('passes all chunks when no schema is provided', () => {
    const chunks = [makeScored('hello world')];
    const { valid, failed } = validateChunks(chunks);
    expect(valid).toHaveLength(1);
    expect(failed).toBe(0);
  });

  it('passes when schema has no required fields', () => {
    const chunks = [makeScored('some text here')];
    const { valid } = validateChunks(chunks, JSON.stringify({ type: 'object' }));
    expect(valid).toHaveLength(1);
  });

  it('fails chunk missing a required field', () => {
    const chunks = [makeScored('some text')];
    const schema = JSON.stringify({ required: ['nonExistentField'] });
    const { valid, failed } = validateChunks(chunks, schema);
    expect(valid).toHaveLength(0);
    expect(failed).toBe(1);
  });

  it('passes chunk that has all required fields', () => {
    const chunks = [makeScored('some text')];
    const schema = JSON.stringify({ required: ['content'] });
    const { valid, failed } = validateChunks(chunks, schema);
    expect(valid).toHaveLength(1);
    expect(failed).toBe(0);
  });
});

// ── generateJsonl ────────────────────────────────────────────────────────────

describe('generateJsonl', () => {
  const chunk = {
    id: 'c1', content: 'hello world', pageNumber: 1, sectionIndex: 0, hash: 'abc',
    metadata: { wordCount: 2, charCount: 11, pageNumber: 1 },
    qualityScore: 0.9, qualityFlags: [],
  };

  it('produces one JSON line per chunk', () => {
    const out = generateJsonl([chunk], 'doc-123');
    const lines = out.trim().split('\n');
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.content).toBe('hello world');
    expect(parsed.source_document_id).toBe('doc-123');
    expect(parsed.quality_score).toBe(0.9);
  });

  it('is valid JSONL — every line parses', () => {
    const chunk2 = { ...chunk, id: 'c2', content: 'second chunk content' };
    const out = generateJsonl([chunk, chunk2], 'doc-456');
    for (const line of out.split('\n')) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});
