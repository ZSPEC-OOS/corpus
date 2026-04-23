'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { DocumentRecord, PipelineRun } from '@/lib/types';
import { formatBytes, formatDateTime } from '@/lib/utils';

export default function SourceDetailPage() {
  const params = useParams<{ id: string }>();
  const source = useFetchState<DocumentRecord | null>(`/api/documents/${params.id}`, null);
  const runs = useFetchState<PipelineRun[]>('/api/pipelines', []);

  const linkedRuns = runs.data.filter((run) => run.documentId === params.id);

  return (
    <>
      <PageHeader title="Source detail" description="Source metadata, linked pipelines, and PDF preview." actions={<Link href="/pipelines" className="rounded-lg bg-accent px-3 py-2 text-sm font-medium">Start pipeline</Link>} />
      {source.loading ? <StateCard message="Loading source detail..." /> : source.error || !source.data ? <StateCard message="Source not found." /> : (
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-panel p-4 text-sm"><div>Filename: {source.data.filename}</div><div>Type: {source.data.mimeType}</div><div>Size: {formatBytes(source.data.sizeBytes)}</div><div>Uploaded: {formatDateTime(source.data.uploadedAt)}</div><div>Page count: {source.data.pageCount ?? 'Unknown'}</div><div>SHA-256: {source.data.sha256 ?? 'Unavailable'}</div></section>
          <section className="rounded-xl border border-border bg-panel p-4"><h3 className="mb-2 font-semibold">PDF Preview</h3><iframe title="PDF preview" src={`/api/documents/${params.id}/file`} className="h-[480px] w-full rounded border border-border bg-panelAlt" /></section>
          <section className="rounded-xl border border-border bg-panel p-4"><h3 className="mb-2 font-semibold">Linked pipeline runs</h3>{linkedRuns.length ? linkedRuns.map((run) => <Link href={`/pipelines/${run.id}`} key={run.id} className="mb-2 block rounded border border-border bg-panelAlt p-2 text-sm">{run.id.slice(0, 8)} · {run.status}</Link>) : <p className="text-sm text-muted">No pipelines linked to this source yet.</p>}</section>
        </div>
      )}
    </>
  );
}
