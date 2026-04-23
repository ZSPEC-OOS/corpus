import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { resolve, dirname, relative } from 'path';
import { createIdleSteps } from './pipeline';
import { AppSettings, CollectionRecord, DocumentRecord, OutputArtifact, PipelineRun, SchemaRecord, StoreData } from './types';

const DATA_DIR = resolve(process.cwd(), '.corpus-data');
const DATA_FILE = resolve(DATA_DIR, 'store.json');

const defaultSettings: AppSettings = {
  defaultExportFormat: 'jsonl',
  targetShardSizeMb: 64,
  includeTokenCounts: true,
  includeProvenance: true,
  strictSchemaValidation: true,
  ocrEnabled: true,
  dedupeSensitivity: 'medium',
};

const initialData: StoreData = {
  documents: [],
  pipelines: [],
  artifacts: [],
  collections: [],
  schemas: [],
  settings: defaultSettings,
};

const ensureDataDir = () => mkdirSync(DATA_DIR, { recursive: true });

const loadData = (): StoreData => {
  ensureDataDir();
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return { ...initialData };
  }
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf-8')) as Partial<StoreData>;
    return {
      documents: parsed.documents ?? [],
      pipelines: parsed.pipelines ?? [],
      artifacts: parsed.artifacts ?? [],
      collections: parsed.collections ?? [],
      schemas: parsed.schemas ?? [],
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return { ...initialData };
  }
};

let db = loadData();

// Async write queue: serialises concurrent persist calls without blocking the
// event loop. Each call captures the current db snapshot and chains onto the
// previous write so writes never race.
let persistQueue: Promise<void> = Promise.resolve();

const persist = (): void => {
  const snapshot = JSON.stringify(db, null, 2);
  persistQueue = persistQueue
    .then(() => {
      ensureDataDir();
      return writeFile(DATA_FILE, snapshot, 'utf-8');
    })
    .catch((err: unknown) => console.error('[store] persist error:', err));
};

// Convert an absolute path inside DATA_DIR to a relative one for portability.
// Paths already relative are returned unchanged.
export const toRelativePath = (absOrRel: string): string => {
  if (!absOrRel.startsWith('/')) return absOrRel;
  return relative(DATA_DIR, absOrRel);
};

// Resolve a stored path (relative or legacy absolute) to an absolute path.
export const resolveStoragePath = (stored: string): string =>
  stored.startsWith('/') ? stored : resolve(DATA_DIR, stored);

export const getDataDir = () => DATA_DIR;
export const ensureParentDir = (filePath: string) => mkdirSync(dirname(filePath), { recursive: true });

export const listDocuments = () => db.documents;
export const getDocument = (id: string) => db.documents.find((d) => d.id === id);

export const createDocument = (input: Omit<DocumentRecord, 'id' | 'uploadedAt'>): DocumentRecord => {
  const record: DocumentRecord = {
    id: crypto.randomUUID(),
    uploadedAt: new Date().toISOString(),
    ...input,
    // Normalise to relative path so the store is portable across machines.
    storagePath: input.storagePath ? toRelativePath(input.storagePath) : input.storagePath,
    collectionIds: input.collectionIds ?? [],
  };
  db.documents = [record, ...db.documents];
  persist();
  return record;
};

export const deleteDocument = (id: string): boolean => {
  const before = db.documents.length;
  db.documents = db.documents.filter((d) => d.id !== id);
  if (db.documents.length === before) return false;
  db.collections = db.collections.map((c) => ({
    ...c,
    documentIds: c.documentIds.filter((dId) => dId !== id),
    updatedAt: new Date().toISOString(),
  }));
  persist();
  return true;
};

export const createPipeline = (documentId: string): PipelineRun => {
  const now = new Date().toISOString();
  const run: PipelineRun = {
    id: crypto.randomUUID(),
    documentId,
    status: 'idle',
    steps: createIdleSteps(),
    createdAt: now,
    updatedAt: now,
  };
  db.pipelines = [run, ...db.pipelines];
  persist();
  return run;
};

export const listPipelines = () => db.pipelines;
export const getPipeline = (id: string) => db.pipelines.find((p) => p.id === id);

export const updatePipeline = (id: string, updater: (run: PipelineRun) => PipelineRun): PipelineRun | null => {
  const current = getPipeline(id);
  if (!current) return null;
  const updated = { ...updater(current), updatedAt: new Date().toISOString() };
  db.pipelines = db.pipelines.map((p) => (p.id === id ? updated : p));
  persist();
  return updated;
};

export const listArtifacts = () => db.artifacts;
export const getArtifact = (id: string) => db.artifacts.find((a) => a.id === id);

export const deleteArtifactsByPipelineId = (pipelineRunId: string): number => {
  const before = db.artifacts.length;
  db.artifacts = db.artifacts.filter((a) => a.pipelineRunId !== pipelineRunId);
  const deleted = before - db.artifacts.length;
  if (deleted > 0) persist();
  return deleted;
};

export const createArtifact = (artifact: Omit<OutputArtifact, 'id' | 'createdAt'>): OutputArtifact => {
  const next: OutputArtifact = {
    ...artifact,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    // Normalise storagePath to relative
    storagePath: artifact.storagePath ? toRelativePath(artifact.storagePath) : artifact.storagePath,
  };
  db.artifacts = [next, ...db.artifacts];
  db.pipelines = db.pipelines.map((run) => {
    if (run.id !== artifact.pipelineRunId) return run;
    return { ...run, outputArtifactIds: [...(run.outputArtifactIds ?? []), next.id], updatedAt: new Date().toISOString() };
  });
  persist();
  return next;
};

export const listCollections = () => db.collections;
export const getCollection = (id: string) => db.collections.find((c) => c.id === id);

export const createCollection = (payload: { name: string; description?: string }): CollectionRecord => {
  const now = new Date().toISOString();
  const collection: CollectionRecord = {
    id: crypto.randomUUID(),
    name: payload.name,
    description: payload.description,
    createdAt: now,
    updatedAt: now,
    documentIds: [],
  };
  db.collections = [collection, ...db.collections];
  persist();
  return collection;
};

export const updateCollection = (
  id: string,
  payload: Partial<Pick<CollectionRecord, 'name' | 'description' | 'documentIds'>>,
) => {
  const existing = getCollection(id);
  if (!existing) return null;
  const updated: CollectionRecord = { ...existing, ...payload, updatedAt: new Date().toISOString() };
  db.collections = db.collections.map((c) => (c.id === id ? updated : c));
  persist();
  return updated;
};

export const deleteCollection = (id: string) => {
  const before = db.collections.length;
  db.collections = db.collections.filter((c) => c.id !== id);
  if (before === db.collections.length) return false;
  db.documents = db.documents.map((d) => ({
    ...d,
    collectionIds: (d.collectionIds ?? []).filter((cId) => cId !== id),
  }));
  persist();
  return true;
};

export const listSchemas = () => db.schemas;
export const getSchema = (id: string) => db.schemas.find((s) => s.id === id);

export const createSchema = (
  payload: Omit<SchemaRecord, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> & { isActive?: boolean },
) => {
  const now = new Date().toISOString();
  const schema: SchemaRecord = { ...payload, id: crypto.randomUUID(), isActive: false, createdAt: now, updatedAt: now };
  db.schemas = [schema, ...db.schemas];
  if (payload.isActive) return activateSchema(schema.id) ?? schema;
  persist();
  return schema;
};

export const activateSchema = (id: string): SchemaRecord | null => {
  let found: SchemaRecord | null = null;
  db.schemas = db.schemas.map((s) => {
    const next = { ...s, isActive: s.id === id, updatedAt: new Date().toISOString() };
    if (next.id === id) found = next;
    return next;
  });
  if (!found) return null;
  persist();
  return found;
};

export const getSettings = () => db.settings;
export const updateSettings = (payload: Partial<AppSettings>): AppSettings => {
  db.settings = { ...db.settings, ...payload };
  persist();
  return db.settings;
};
