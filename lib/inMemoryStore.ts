import { createIdleSteps } from './pipeline';
import { DocumentRecord, PipelineRun } from './types';

export const documents = new Map<string, DocumentRecord>();
export const pipelines = new Map<string, PipelineRun>();

const nowIso = () => new Date().toISOString();

export const createPipeline = (documentId: string): PipelineRun => {
  const run: PipelineRun = {
    id: crypto.randomUUID(),
    documentId,
    status: 'idle',
    steps: createIdleSteps(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  pipelines.set(run.id, run);
  return run;
};

export const updatePipeline = (id: string, updater: (run: PipelineRun) => PipelineRun): PipelineRun | null => {
  const current = pipelines.get(id);
  if (!current) return null;
  const next = { ...updater(current), updatedAt: nowIso() };
  pipelines.set(id, next);
  return next;
};
