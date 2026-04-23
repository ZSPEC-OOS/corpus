'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { DocumentRecord, PipelineRun } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export default function PipelinesPage() {
  const pipelines = useFetchState<PipelineRun[]>('/api/pipelines', []);
  const documents = useFetchState<DocumentRecord[]>('/api/documents', []);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [docId, setDocId] = useState('');

  const docMap = useMemo(() => new Map(documents.data.map((d) => [d.id, d.filename])), [documents.data]);

  const filtered = useMemo(
    () => pipelines.data.filter((run) => (status === 'all' || run.status === status) && (`${run.id} ${docMap.get(run.documentId) ?? ''}`.toLowerCase().includes(query.toLowerCase()))),
    [pipelines.data, status, query, docMap],
  );

  const createPipeline = async () => {
    if (!docId) return;
    const res = await fetch('/api/pipelines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: docId }) });
    if (!res.ok) return;
    const run: PipelineRun = await res.json();
    window.location.href = `/pipelines/${run.id}`;
  };

  return (
    <>
      <PageHeader title="Pipelines" description="Create, monitor, retry, and inspect ingestion and transformation runs." actions={<><select value={docId} onChange={(e) => setDocId(e.target.value)} className="rounded-lg border border-border bg-panelAlt px-3 py-2 text-sm"><option value="">Select source document</option>{documents.data.map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}</select><button onClick={createPipeline} disabled={!docId} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium disabled:opacity-50">New pipeline</button></>} />
      {pipelines.loading || documents.loading ? <StateCard message="Loading pipeline workspace..." /> : pipelines.error || documents.error ? <StateCard message={`Unable to load data: ${pipelines.error ?? documents.error}`} /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-panel p-3">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by filename or run id" className="min-w-72 flex-1 rounded-lg border border-border bg-panelAlt px-3 py-2 text-sm" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-border bg-panelAlt px-3 py-2 text-sm"><option value="all">All statuses</option><option value="idle">Idle</option><option value="running">Running</option><option value="waiting">Waiting</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="canceled">Canceled</option></select>
          </div>
          {filtered.length === 0 ? <StateCard message="No pipelines found. Upload a source document and create a new run." cta={<Link href="/sources" className="rounded-lg bg-accent px-3 py-2 text-sm font-medium">Go to Sources</Link>} /> : (
            <div className="rounded-xl border border-border bg-panel p-2">{filtered.map((run) => <div key={run.id} className="grid grid-cols-1 gap-1 rounded-lg border border-border bg-panelAlt p-3 text-sm lg:grid-cols-6"><Link href={`/pipelines/${run.id}`} className="font-medium">{run.id.slice(0, 8)}</Link><div>{docMap.get(run.documentId) ?? 'Unknown source'}</div><div className="capitalize text-muted">{run.status}</div><div className="text-muted">{formatDateTime(run.createdAt)}</div><div className="text-muted">{formatDateTime(run.updatedAt)}</div><div>{run.outputArtifactIds?.length ? 'Output ready' : 'No output'}</div></div>)}</div>
          )}
        </div>
      )}
    </>
  );
}
