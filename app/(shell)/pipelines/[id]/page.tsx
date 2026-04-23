'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { DocumentRecord, PipelineRun } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export default function PipelineDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const pipeline = useFetchState<PipelineRun | null>(`/api/pipelines/${id}`, null);
  const documents = useFetchState<DocumentRecord[]>('/api/documents', []);

  const action = async (name: 'start' | 'retry' | 'cancel') => {
    await fetch(`/api/pipelines/${id}/${name}`, { method: 'POST' });
    window.location.reload();
  };

  const source = pipeline.data ? documents.data.find((d) => d.id === pipeline.data?.documentId) : null;

  return (
    <>
      <PageHeader title={`Pipeline ${id.slice(0, 8)}`} description="Inspect step-level execution, status, and output artifacts for this run." actions={<><button onClick={() => action('start')} className="rounded-lg border border-border px-3 py-2 text-sm">Start</button><button onClick={() => action('retry')} className="rounded-lg border border-border px-3 py-2 text-sm">Retry</button><button onClick={() => action('cancel')} className="rounded-lg border border-border px-3 py-2 text-sm">Cancel</button></>} />
      {pipeline.loading ? <StateCard message="Loading pipeline detail..." /> : pipeline.error || !pipeline.data ? <StateCard message="Unable to load this pipeline run." /> : (
        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-xl border border-border bg-panel p-4"><h3 className="mb-2 font-semibold">Source document</h3><p className="text-sm text-muted">{source?.filename ?? 'Unknown document'}</p><p className="text-xs text-muted">Created {formatDateTime(pipeline.data.createdAt)}</p></section>
          <section className="rounded-xl border border-border bg-panel p-4 xl:col-span-2"><h3 className="mb-2 font-semibold">Pipeline steps</h3><div className="space-y-2">{pipeline.data.steps.map((step) => <div key={step.key} className="rounded-lg border border-border bg-panelAlt p-3 text-sm"><div className="flex justify-between"><span>{step.title}</span><span className="capitalize text-muted">{step.status}</span></div><p className="text-xs text-muted">{step.description}</p>{step.error ? <p className="text-xs text-danger">{step.error}</p> : null}</div>)}</div></section>
          <section className="rounded-xl border border-border bg-panel p-4 xl:col-span-3"><h3 className="mb-2 font-semibold">Final output and logs</h3>{pipeline.data.outputArtifacts?.length ? pipeline.data.outputArtifacts.map((artifact) => <div key={artifact.id} className="rounded-lg border border-border bg-panelAlt p-3 text-sm">{artifact.filename}</div>) : <p className="text-sm text-muted">No output artifacts generated yet.</p>}</section>
        </div>
      )}
    </>
  );
}
