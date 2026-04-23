'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { DocumentRecord, PipelineRun } from '@/lib/types';
import { formatBytes, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

export default function SourceDetailPage() {
  const params = useParams<{ id: string }>();
  const source = useFetchState<DocumentRecord | null>(`/api/documents/${params.id}`, null);
  const runs = useFetchState<PipelineRun[]>('/api/pipelines', []);
  const [creating, setCreating] = useState(false);

  const linkedRuns = runs.data.filter((run) => run.documentId === params.id);

  const createPipeline = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: params.id }),
      });
      if (res.ok) {
        const run: PipelineRun = await res.json();
        window.location.href = `/pipelines/${run.id}`;
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Source detail"
        description="Source metadata, linked pipelines, and PDF preview."
        actions={
          <button
            onClick={createPipeline}
            disabled={creating || !source.data}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create pipeline'}
          </button>
        }
      />
      {source.loading ? (
        <StateCard message="Loading source detail..." />
      ) : source.error || !source.data ? (
        <StateCard message="Source not found." />
      ) : (
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-panel p-4 text-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 lg:grid-cols-3">
              <div><dt className="text-muted">Filename</dt><dd className="font-medium">{source.data.filename}</dd></div>
              <div><dt className="text-muted">Type</dt><dd>{source.data.mimeType}</dd></div>
              <div><dt className="text-muted">Size</dt><dd>{formatBytes(source.data.sizeBytes)}</dd></div>
              <div><dt className="text-muted">Uploaded</dt><dd>{formatDateTime(source.data.uploadedAt)}</dd></div>
              <div><dt className="text-muted">Pages</dt><dd>{source.data.pageCount ?? 'Unknown'}</dd></div>
              <div className="col-span-2 lg:col-span-1"><dt className="text-muted">SHA-256</dt><dd className="truncate font-mono text-xs">{source.data.sha256 ?? '—'}</dd></div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-panel p-4">
            <h3 className="mb-2 font-semibold">PDF Preview</h3>
            <iframe
              title="PDF preview"
              src={`/api/documents/${params.id}/file`}
              className="h-[520px] w-full rounded border border-border bg-panelAlt"
            />
          </section>

          <section className="rounded-xl border border-border bg-panel p-4">
            <h3 className="mb-2 font-semibold">Linked pipeline runs</h3>
            {linkedRuns.length ? (
              <div className="space-y-2">
                {linkedRuns.map((run) => (
                  <Link
                    href={`/pipelines/${run.id}`}
                    key={run.id}
                    className="flex items-center justify-between rounded border border-border bg-panelAlt p-2 text-sm"
                  >
                    <span className="font-mono text-xs">{run.id.slice(0, 8)}</span>
                    <span className="capitalize text-muted">{run.status}</span>
                    <span className="text-xs text-muted">{formatDateTime(run.createdAt)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No pipelines linked to this source yet. Click "Create pipeline" above to start one.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
