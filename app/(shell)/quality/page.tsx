'use client';

import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { DocumentRecord, PipelineRun } from '@/lib/types';

export default function QualityPage() {
  const pipelines = useFetchState<PipelineRun[]>('/api/pipelines', []);
  const documents = useFetchState<DocumentRecord[]>('/api/documents', []);
  const rows = pipelines.data.filter((run) => run.statistics?.validationFailures !== undefined || run.statistics?.totalRecords !== undefined);

  return (
    <>
      <PageHeader title="Quality" description="Inspect quality metrics produced by processed runs." />
      {pipelines.loading || documents.loading ? <StateCard message="Loading quality metrics..." /> : pipelines.error || documents.error ? <StateCard message={`Unable to load quality data: ${pipelines.error ?? documents.error}`} /> : rows.length === 0 ? <StateCard message="No quality metrics available yet. Metrics appear after pipeline processing with quality scoring enabled." /> : (
        <div className="space-y-2 rounded-xl border border-border bg-panel p-2">{rows.map((run) => <div key={run.id} className="grid grid-cols-1 gap-1 rounded-lg border border-border bg-panelAlt p-3 text-sm lg:grid-cols-5"><div>{documents.data.find((d) => d.id === run.documentId)?.filename ?? run.documentId}</div><div>{run.id.slice(0, 8)}</div><div>{run.statistics?.totalRecords ?? '—'} records</div><div>{run.statistics?.validationFailures ?? '—'} failures</div><div>{run.status}</div></div>)}</div>
      )}
    </>
  );
}
