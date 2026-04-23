'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { CollectionRecord } from '@/lib/types';

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const collection = useFetchState<CollectionRecord | null>(`/api/collections/${params.id}`, null);

  return (
    <>
      <PageHeader title="Collection detail" description="Review sources, pipelines, outputs, and metadata attached to this collection." />
      {collection.loading ? <StateCard message="Loading collection..." /> : collection.error || !collection.data ? <StateCard message="Collection not found." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-panel p-4"><h3 className="mb-2 font-semibold">Sources</h3><p className="text-sm text-muted">{collection.data.sourceIds.length ? collection.data.sourceIds.join(', ') : 'No sources added yet.'}</p></section>
          <section className="rounded-xl border border-border bg-panel p-4"><h3 className="mb-2 font-semibold">Pipelines</h3><p className="text-sm text-muted">{collection.data.pipelineIds.length ? collection.data.pipelineIds.join(', ') : 'No pipelines linked yet.'}</p></section>
          <section className="rounded-xl border border-border bg-panel p-4"><h3 className="mb-2 font-semibold">Outputs</h3><p className="text-sm text-muted">{collection.data.artifactIds.length ? collection.data.artifactIds.join(', ') : 'No output artifacts linked yet.'}</p></section>
          <section className="rounded-xl border border-border bg-panel p-4"><h3 className="mb-2 font-semibold">Metadata</h3><p className="text-sm text-muted">{collection.data.description ?? 'No metadata provided.'}</p></section>
        </div>
      )}
    </>
  );
}
