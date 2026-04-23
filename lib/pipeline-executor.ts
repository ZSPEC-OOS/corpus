import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import { createArtifact, getDataDir, getDocument, getPipeline, getSettings, listSchemas, updatePipeline } from './inMemoryStore';
import {
  Chunk,
  DeduplicationResult,
  DocumentStructure,
  PageContent,
  ScoredChunk,
  chunkDocument,
  cleanText,
  deduplicateChunks,
  detectStructure,
  extractPdfText,
  generateJsonl,
  scoreChunks,
  validateChunks,
} from './pdf-processor';
import { PipelineStepKey } from './types';

interface StepContext {
  pages?: PageContent[];
  structure?: DocumentStructure;
  chunks?: Chunk[];
  dedupeResult?: DeduplicationResult;
  scored?: ScoredChunk[];
}

function markStepRunning(pipelineId: string, key: PipelineStepKey): number {
  const now = new Date().toISOString();
  updatePipeline(pipelineId, (run) => ({
    ...run,
    steps: run.steps.map((s) => (s.key === key ? { ...s, status: 'running', startedAt: now } : s)),
  }));
  return Date.now();
}

function markStepDone(
  pipelineId: string,
  key: PipelineStepKey,
  startMs: number,
  metrics?: Record<string, string | number | boolean | null>,
) {
  const now = new Date().toISOString();
  const durationMs = Date.now() - startMs;
  updatePipeline(pipelineId, (run) => {
    const idx = run.steps.findIndex((s) => s.key === key);
    const next = idx + 1 < run.steps.length ? run.steps[idx + 1] : null;
    return {
      ...run,
      steps: run.steps.map((s, i) => {
        if (s.key === key) return { ...s, status: 'completed', completedAt: now, durationMs, metrics };
        if (next && i === idx + 1) return { ...s, status: 'running', startedAt: now };
        return s;
      }),
    };
  });
}

function markStepFailed(pipelineId: string, key: PipelineStepKey, error: string, startMs: number) {
  const now = new Date().toISOString();
  const durationMs = Date.now() - startMs;
  updatePipeline(pipelineId, (run) => ({
    ...run,
    status: 'failed',
    completedAt: now,
    steps: run.steps.map((s) => {
      if (s.key === key) return { ...s, status: 'failed', completedAt: now, durationMs, error };
      if (s.status === 'waiting' || s.status === 'running') return { ...s, status: 'canceled', completedAt: now };
      return s;
    }),
  }));
}

export async function runPipeline(pipelineId: string): Promise<void> {
  const run = getPipeline(pipelineId);
  if (!run) return;

  const doc = getDocument(run.documentId);
  if (!doc?.storagePath) {
    markStepFailed(pipelineId, 'ingestion', 'Source document file not found on disk.', Date.now());
    return;
  }

  const resolvedPath = doc.storagePath.startsWith('/')
    ? doc.storagePath
    : resolve(getDataDir(), doc.storagePath);

  const ctx: StepContext = {};

  // ── 1. ingestion ──────────────────────────────────────────────────────────
  {
    const t = markStepRunning(pipelineId, 'ingestion');
    try {
      ctx.pages = await extractPdfText(resolvedPath);
      markStepDone(pipelineId, 'ingestion', t, {
        pageCount: ctx.pages.length,
        totalChars: ctx.pages.reduce((s, p) => s + p.text.length, 0),
      });
    } catch (err) {
      markStepFailed(pipelineId, 'ingestion', String(err), t);
      return;
    }
  }

  // ── 2. ocr_text_cleaning ──────────────────────────────────────────────────
  {
    const t = markStepRunning(pipelineId, 'ocr_text_cleaning');
    try {
      ctx.pages = ctx.pages!.map((p) => ({ ...p, text: cleanText(p.text) }));
      const totalChars = ctx.pages.reduce((s, p) => s + p.text.length, 0);
      markStepDone(pipelineId, 'ocr_text_cleaning', t, { cleanedPages: ctx.pages.length, totalChars });
    } catch (err) {
      markStepFailed(pipelineId, 'ocr_text_cleaning', String(err), t);
      return;
    }
  }

  // ── 3. structure_detection ────────────────────────────────────────────────
  {
    const t = markStepRunning(pipelineId, 'structure_detection');
    try {
      ctx.structure = detectStructure(ctx.pages!);
      markStepDone(pipelineId, 'structure_detection', t, { sectionCount: ctx.structure.sections.length });
    } catch (err) {
      markStepFailed(pipelineId, 'structure_detection', String(err), t);
      return;
    }
  }

  // ── 4. chunking ───────────────────────────────────────────────────────────
  {
    const t = markStepRunning(pipelineId, 'chunking');
    try {
      ctx.chunks = chunkDocument(ctx.structure!);
      markStepDone(pipelineId, 'chunking', t, { chunkCount: ctx.chunks.length });
    } catch (err) {
      markStepFailed(pipelineId, 'chunking', String(err), t);
      return;
    }
  }

  // ── 5. deduplication ──────────────────────────────────────────────────────
  {
    const t = markStepRunning(pipelineId, 'deduplication');
    try {
      ctx.dedupeResult = deduplicateChunks(ctx.chunks!);
      markStepDone(pipelineId, 'deduplication', t, {
        uniqueChunks: ctx.dedupeResult.unique.length,
        duplicatesRemoved: ctx.dedupeResult.duplicateCount,
      });
    } catch (err) {
      markStepFailed(pipelineId, 'deduplication', String(err), t);
      return;
    }
  }

  // ── 6. quality_scoring ────────────────────────────────────────────────────
  {
    const t = markStepRunning(pipelineId, 'quality_scoring');
    try {
      ctx.scored = scoreChunks(ctx.dedupeResult!.unique);
      const avgScore = ctx.scored.reduce((s, c) => s + c.qualityScore, 0) / Math.max(ctx.scored.length, 1);
      markStepDone(pipelineId, 'quality_scoring', t, {
        chunksScored: ctx.scored.length,
        avgQualityScore: Math.round(avgScore * 100) / 100,
      });
    } catch (err) {
      markStepFailed(pipelineId, 'quality_scoring', String(err), t);
      return;
    }
  }

  // ── 7. schema_validation ─────────────────────────────────────────────────
  {
    const t = markStepRunning(pipelineId, 'schema_validation');
    try {
      const activeSchema = listSchemas().find((s) => s.isActive);
      const settings = getSettings();
      const result = validateChunks(ctx.scored!, activeSchema?.content);
      if (settings.strictSchemaValidation && result.failed > 0) {
        markStepFailed(
          pipelineId,
          'schema_validation',
          `${result.failed} chunk(s) failed schema validation: ${result.errors.slice(0, 3).join('; ')}`,
          t,
        );
        return;
      }
      ctx.scored = result.valid;
      markStepDone(pipelineId, 'schema_validation', t, {
        validChunks: result.valid.length,
        failedChunks: result.failed,
        schemaVersion: activeSchema?.version ?? 'none',
      });
    } catch (err) {
      markStepFailed(pipelineId, 'schema_validation', String(err), t);
      return;
    }
  }

  // ── 8. output_generation ─────────────────────────────────────────────────
  {
    const t = markStepRunning(pipelineId, 'output_generation');
    try {
      const settings = getSettings();
      const format = settings.defaultExportFormat ?? 'jsonl';
      const jsonlContent = generateJsonl(ctx.scored!, run.documentId);
      const outputFilename = `${pipelineId}.${format}`;
      const outputPath = resolve(getDataDir(), 'outputs', outputFilename);
      const { mkdirSync } = await import('fs');
      mkdirSync(resolve(getDataDir(), 'outputs'), { recursive: true });
      await writeFile(outputPath, jsonlContent, 'utf-8');

      const sizeBytes = Buffer.byteLength(jsonlContent, 'utf-8');
      const totalTokenEstimate = Math.round(jsonlContent.length / 4);
      const targetShardBytes = (settings.targetShardSizeMb ?? 64) * 1024 * 1024;
      const shardCount = Math.max(1, Math.ceil(sizeBytes / targetShardBytes));

      const artifact = createArtifact({
        pipelineRunId: pipelineId,
        type: format === 'jsonl' ? 'jsonl' : 'json',
        filename: outputFilename,
        sizeBytes,
        recordCount: ctx.scored!.length,
        contentPreview: jsonlContent.slice(0, 300),
        checksumSha256: (await import('crypto')).createHash('sha256').update(jsonlContent).digest('hex'),
        schemaVersion: listSchemas().find((s) => s.isActive)?.version,
        storagePath: `outputs/${outputFilename}`,
        downloadUrl: `/api/artifacts/${pipelineId}/download`,
      });

      const now = new Date().toISOString();
      updatePipeline(pipelineId, (r) => ({
        ...r,
        status: 'completed',
        completedAt: now,
        statistics: {
          totalRecords: ctx.scored!.length,
          totalSizeBytes: sizeBytes,
          avgRecordSizeBytes: Math.round(sizeBytes / Math.max(ctx.scored!.length, 1)),
          totalTokens: totalTokenEstimate,
          shardCount,
          duplicatesRemoved: ctx.dedupeResult!.duplicateCount,
          validationFailures: 0,
        },
        steps: r.steps.map((s) =>
          s.key === 'output_generation'
            ? {
                ...s,
                status: 'completed',
                completedAt: now,
                durationMs: Date.now() - t,
                metrics: { outputFile: outputFilename, recordCount: ctx.scored!.length, sizeBytes },
              }
            : s,
        ),
      }));

      void artifact; // referenced only for side-effect of createArtifact
    } catch (err) {
      markStepFailed(pipelineId, 'output_generation', String(err), t);
    }
  }
}
