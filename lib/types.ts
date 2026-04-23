export type PipelineStatus =
  | 'idle'
  | 'waiting'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'canceled';

export type PipelineStep = {
  key:
    | 'ingestion'
    | 'ocr_text_cleaning'
    | 'structure_detection'
    | 'chunking'
    | 'deduplication'
    | 'quality_scoring'
    | 'schema_validation'
    | 'output_generation';
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
  uploadedAt: string;
  pageCount?: number;
  sha256?: string;
  sourceUrl?: string;
  detectedLanguage?: string;
  docType?: string;
};

export type OutputArtifact = {
  id: string;
  type: 'jsonl' | 'json' | 'directory' | 'shard';
  filename: string;
  sizeBytes?: number;
  recordCount?: number;
  contentPreview?: string;
  downloadUrl?: string;
};

export type PipelineRun = {
  id: string;
  documentId: string;
  status: PipelineStatus;
  steps: PipelineStep[];
  createdAt: string;
  updatedAt: string;
  schemaVersion?: string;
  outputArtifacts?: OutputArtifact[];
  schema?: string;
  statistics?: {
    totalRecords?: number;
    totalSizeBytes?: number;
    avgRecordSizeBytes?: number;
    totalTokens?: number;
    shardCount?: number;
    duplicatesRemoved?: number;
    validationFailures?: number;
  };
};
