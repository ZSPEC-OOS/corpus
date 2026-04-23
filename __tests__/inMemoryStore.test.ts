import { describe, it, expect, beforeEach, vi } from 'vitest';

// Stub fs so tests never touch the disk
vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(() => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); }),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => false),
}));
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(() => Promise.resolve()),
}));

// Re-import after mocks are in place
const store = await import('../lib/inMemoryStore');
const {
  createDocument, getDocument, listDocuments, deleteDocument,
  createPipeline, getPipeline, listPipelines, updatePipeline,
  createArtifact, listArtifacts, deleteArtifactsByPipelineId,
  createCollection, getCollection, deleteCollection,
  createSchema, activateSchema, listSchemas,
  getSettings, updateSettings,
  toRelativePath, resolveStoragePath,
} = store;

describe('documents', () => {
  it('creates and retrieves a document', () => {
    const doc = createDocument({ filename: 'test.pdf', mimeType: 'application/pdf', sizeBytes: 1024 });
    expect(doc.id).toBeTruthy();
    expect(getDocument(doc.id)).toMatchObject({ filename: 'test.pdf' });
  });

  it('lists documents in reverse insertion order', () => {
    const before = listDocuments().length;
    createDocument({ filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 1 });
    createDocument({ filename: 'b.pdf', mimeType: 'application/pdf', sizeBytes: 1 });
    const docs = listDocuments();
    expect(docs.length).toBe(before + 2);
    expect(docs[0].filename).toBe('b.pdf');
  });

  it('deletes a document and removes it from collections', () => {
    const doc = createDocument({ filename: 'del.pdf', mimeType: 'application/pdf', sizeBytes: 1 });
    const col = createCollection({ name: 'col' });
    store.updateCollection(col.id, { documentIds: [doc.id] });
    deleteDocument(doc.id);
    expect(getDocument(doc.id)).toBeUndefined();
    const updatedCol = getCollection(col.id);
    expect(updatedCol?.documentIds).not.toContain(doc.id);
  });

  it('returns false when deleting a non-existent id', () => {
    expect(deleteDocument('nonexistent')).toBe(false);
  });
});

describe('pipelines', () => {
  it('creates a pipeline linked to a document', () => {
    const doc = createDocument({ filename: 'pipe.pdf', mimeType: 'application/pdf', sizeBytes: 1 });
    const run = createPipeline(doc.id);
    expect(run.documentId).toBe(doc.id);
    expect(run.status).toBe('idle');
    expect(run.steps).toHaveLength(8);
  });

  it('updatePipeline applies the updater function', () => {
    const doc = createDocument({ filename: 'upd.pdf', mimeType: 'application/pdf', sizeBytes: 1 });
    const run = createPipeline(doc.id);
    expect(run.status).toBe('idle');
    const updated = updatePipeline(run.id, (r) => ({ ...r, status: 'running' }));
    expect(updated?.status).toBe('running');
    // verify the in-memory store reflects the change
    expect(getPipeline(run.id)?.status).toBe('running');
  });

  it('updatePipeline returns null for unknown id', () => {
    expect(updatePipeline('nope', (r) => r)).toBeNull();
  });
});

describe('artifacts', () => {
  it('creates artifact and links it to the pipeline', () => {
    const doc = createDocument({ filename: 'art.pdf', mimeType: 'application/pdf', sizeBytes: 1 });
    const run = createPipeline(doc.id);
    const artifact = createArtifact({
      pipelineRunId: run.id,
      type: 'jsonl',
      filename: 'out.jsonl',
    });
    expect(artifact.id).toBeTruthy();
    const updatedRun = getPipeline(run.id);
    expect(updatedRun?.outputArtifactIds).toContain(artifact.id);
  });

  it('deleteArtifactsByPipelineId removes matching artifacts', () => {
    const doc = createDocument({ filename: 'da.pdf', mimeType: 'application/pdf', sizeBytes: 1 });
    const run = createPipeline(doc.id);
    createArtifact({ pipelineRunId: run.id, type: 'jsonl', filename: 'x.jsonl' });
    createArtifact({ pipelineRunId: run.id, type: 'jsonl', filename: 'y.jsonl' });
    const deleted = deleteArtifactsByPipelineId(run.id);
    expect(deleted).toBe(2);
    expect(listArtifacts().filter((a) => a.pipelineRunId === run.id)).toHaveLength(0);
  });
});

describe('schemas', () => {
  it('activateSchema sets only one schema active', () => {
    const s1 = createSchema({ name: 'A', version: '1', content: '{}', format: 'json_schema' });
    const s2 = createSchema({ name: 'B', version: '1', content: '{}', format: 'json_schema' });
    activateSchema(s1.id);
    activateSchema(s2.id);
    const active = listSchemas().filter((s) => s.isActive);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(s2.id);
  });
});

describe('settings', () => {
  it('updateSettings merges partial updates', () => {
    const settings = updateSettings({ targetShardSizeMb: 128 });
    expect(settings.targetShardSizeMb).toBe(128);
    // Other defaults preserved
    expect(settings.defaultExportFormat).toBeTruthy();
  });
});

describe('path helpers', () => {
  it('toRelativePath strips DATA_DIR prefix from absolute paths', () => {
    const abs = `${process.cwd()}/.corpus-data/uploads/file.pdf`;
    const rel = toRelativePath(abs);
    expect(rel.startsWith('/')).toBe(false);
    expect(rel).toContain('uploads/file.pdf');
  });

  it('toRelativePath returns relative paths unchanged', () => {
    expect(toRelativePath('uploads/file.pdf')).toBe('uploads/file.pdf');
  });

  it('resolveStoragePath resolves relative to DATA_DIR', () => {
    const abs = resolveStoragePath('uploads/file.pdf');
    expect(abs).toContain('.corpus-data');
    expect(abs).toContain('uploads/file.pdf');
  });

  it('resolveStoragePath returns legacy absolute paths unchanged', () => {
    expect(resolveStoragePath('/tmp/file.pdf')).toBe('/tmp/file.pdf');
  });
});
