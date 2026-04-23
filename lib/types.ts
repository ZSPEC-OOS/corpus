export type PipelineStatus =
  | 'idle'
  | 'waiting'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'canceled';

export type PipelineStepKey =
  | 'ingestion'
  | 'ocr_text_cleaning'
  | 'structure_detection'
  | 'chunking'
  | 'deduplication'
  | 'quality_scoring'
  | 'schema_validation'
  | 'output_generation';

export type PipelineStep = {
  key: PipelineStepKey;
  title: string;
  description: string;
  status: PipelineStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  metrics?: Record<string, string | number | boolean | null>;
  message?: string;
  error?: string;
  logs?: string[];
};

export type DocumentRecord = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath?: string;
  uploadedAt: string;
  pageCount?: number;
  sha256?: string;
  sourceUrl?: string;
  detectedLanguage?: string;
  docType?: string;
  collectionIds?: string[];
};

export type PipelineStatistics = {
  totalRecords?: number;
  totalSizeBytes?: number;
  avgRecordSizeBytes?: number;
  totalTokens?: number;
  shardCount?: number;
  duplicatesRemoved?: number;
  validationFailures?: number;
};

export type PipelineRun = {
  id: string;
  documentId: string;
  status: PipelineStatus;
  steps: PipelineStep[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  schemaVersion?: string;
  outputArtifactIds?: string[];
  outputArtifacts?: OutputArtifact[];
  schema?: string;
  statistics?: PipelineStatistics;
};

export type OutputArtifact = {
  id: string;
  pipelineRunId: string;
  type: 'jsonl' | 'json' | 'directory' | 'shard';
  filename: string;
  sizeBytes?: number;
  recordCount?: number;
  contentPreview?: string;
  checksumSha256?: string;
  schemaVersion?: string;
  createdAt: string;
  downloadUrl?: string;
  storagePath?: string;
};

export type CollectionRecord = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  documentIds: string[];
};

export type SchemaRecord = {
  id: string;
  name: string;
  version: string;
  content: string;
  format: 'json_schema' | 'pydantic_export' | 'other';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  defaultExportFormat?: 'jsonl' | 'json';
  targetShardSizeMb?: number;
  includeTokenCounts?: boolean;
  includeProvenance?: boolean;
  strictSchemaValidation?: boolean;
  ocrEnabled?: boolean;
  dedupeSensitivity?: 'low' | 'medium' | 'high';
};

export type StoreData = {
  documents: DocumentRecord[];
  pipelines: PipelineRun[];
  artifacts: OutputArtifact[];
  collections: CollectionRecord[];
  schemas: SchemaRecord[];
  settings: AppSettings;
};
