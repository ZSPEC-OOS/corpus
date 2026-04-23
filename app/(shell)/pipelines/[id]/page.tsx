'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { DocumentRecord, PipelineRun } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

const ACTIVE_STATUSES = new Set(['running', 'waiting']);

export default function PipelineDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const pipeline = useFetchState<PipelineRun | null>(`/api/pipelines/${id}`, null);
  const documents = useFetchState<DocumentRecord[]>('/api/documents', []);

  // Poll while the pipeline is active so the page reflects real-time step progress
  const isActive = pipeline.data ? ACTIVE_STATUSES.has(pipeline.data.status) : false;
  const pollInterval = isActive ? 2000 : undefined;
  const livePipeline = useFetchState<PipelineRun | null>(`/api/pipelines/${id}`, null, pollInterval);
  const displayed = isActive ? livePipeline : pipeline;

  const action = async (name: 'start' | 'retry' | 'cancel') => {
    await fetch(`/api/pipelines/${id}/${name}`, { method: 'POST' });
    pipeline.refresh();
  };

  const source = displayed.data ? documents.data.find((d) => d.id === displayed.data?.documentId) : null;
  const canStart = displayed.data?.status === 'idle';
  const canRetry = displayed.data?.status === 'failed' || displayed.data?.status === 'canceled';
  const canCancel = displayed.data ? ACTIVE_STATUSES.has(displayed.data.status) : false;

  return (
    <>
      <PageHeader
        title={`Pipeline ${id.slice(0, 8)}`}
        description="Inspect step-level execution, status, and output artifacts for this run."
        actions={
          <>
            <button disabled={!canStart} onClick={() => action('start')} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">Start</button>
            <button disabled={!canRetry} onClick={() => action('retry')} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">Retry</button>
            <button disabled={!canCancel} onClick={() => action('cancel')} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">Cancel</button>
          </>
        }
      />
      {displayed.loading ? (
        <StateCard message="Loading pipeline detail..." />
      ) : displayed.error || !displayed.data ? (
        <StateCard message="Unable to load this pipeline run." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-xl border border-border bg-panel p-4">
            <h3 className="mb-2 font-semibold">Source document</h3>
            <p className="text-sm text-muted">{source?.filename ?? 'Unknown document'}</p>
            <p className="text-xs text-muted">Created {formatDateTime(displayed.data.createdAt)}</p>
            <p className="mt-1 text-xs capitalize text-muted">Status: <span className="font-medium text-foreground">{displayed.data.status}</span></p>
          </section>

          <section className="rounded-xl border border-border bg-panel p-4 xl:col-span-2">
            <h3 className="mb-2 font-semibold">Pipeline steps</h3>
            <div className="space-y-2">
              {displayed.data.steps.map((step) => (
                <div key={step.key} className="rounded-lg border border-border bg-panelAlt p-3 text-sm">
                  <div className="flex justify-between">
                    <span>{step.title}</span>
                    <span className="capitalize text-muted">{step.status}{step.durationMs ? ` · ${step.durationMs}ms` : ''}</span>
                  </div>
                  <p className="text-xs text-muted">{step.description}</p>
                  {step.metrics && (
                    <p className="mt-1 text-xs text-muted">
                      {Object.entries(step.metrics).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                  {step.error ? <p className="text-xs text-red-400">{step.error}</p> : null}
                </div>
              ))}
            </div>
          </section>

          {displayed.data.statistics && (
            <section className="rounded-xl border border-border bg-panel p-4">
              <h3 className="mb-2 font-semibold">Statistics</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Records</dt><dd>{displayed.data.statistics.totalRecords ?? 0}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Duplicates removed</dt><dd>{displayed.data.statistics.duplicatesRemoved ?? 0}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Token estimate</dt><dd>{displayed.data.statistics.totalTokens?.toLocaleString() ?? '—'}</dd></div>
              </dl>
            </section>
          )}

          <section className="rounded-xl border border-border bg-panel p-4 xl:col-span-3">
            <h3 className="mb-2 font-semibold">Output artifacts</h3>
            {displayed.data.outputArtifacts?.length ? (
              displayed.data.outputArtifacts.map((artifact) => (
                <div key={artifact.id} className="mb-2 flex items-center justify-between rounded-lg border border-border bg-panelAlt p-3 text-sm">
                  <div>
                    <div>{artifact.filename}</div>
                    <div className="text-xs text-muted">{artifact.recordCount ?? 'Unknown'} records · {artifact.sizeBytes ? `${artifact.sizeBytes} bytes` : ''}</div>
                  </div>
                  {artifact.downloadUrl && (
                    <a href={artifact.downloadUrl} className="rounded border border-border px-2 py-1 text-xs">Download</a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No output artifacts generated yet.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
