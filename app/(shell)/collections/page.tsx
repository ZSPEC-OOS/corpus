'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { CollectionRecord } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export default function CollectionsPage() {
  const { data, loading, error } = useFetchState<CollectionRecord[]>('/api/collections', []);
  const [name, setName] = useState('');

  const create = async () => {
    if (!name.trim()) return;
    await fetch('/api/collections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    window.location.reload();
  };

  return (
    <>
      <PageHeader title="Collections" description="Organize sources, runs, and outputs into reusable project groupings." actions={<><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Collection name" className="rounded-lg border border-border bg-panelAlt px-3 py-2 text-sm" /><button onClick={create} disabled={!name.trim()} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium disabled:opacity-50">Create collection</button></>} />
      {loading ? <StateCard message="Loading collections..." /> : error ? <StateCard message={`Unable to load collections: ${error}`} /> : data.length === 0 ? <StateCard message="No collections created yet. Create one to group related sources and outputs." /> : (
        <div className="rounded-xl border border-border bg-panel p-2">{data.map((collection) => <Link href={`/collections/${collection.id}`} key={collection.id} className="grid grid-cols-1 gap-1 rounded-lg border border-border bg-panelAlt p-3 text-sm lg:grid-cols-4"><div className="font-medium">{collection.name}</div><div>{collection.sourceIds.length + collection.pipelineIds.length + collection.artifactIds.length} items</div><div>{collection.description ?? 'No description'}</div><div className="text-muted">{formatDateTime(collection.updatedAt)}</div></Link>)}</div>
      )}
    </>
  );
}
