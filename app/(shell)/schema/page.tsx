'use client';

import { useState } from 'react';
import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { SchemaRecord } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export default function SchemaPage() {
  const { data, loading, error } = useFetchState<SchemaRecord[]>('/api/schema', []);
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [content, setContent] = useState('');

  const create = async () => {
    if (!name.trim() || !content.trim()) return;
    await fetch('/api/schema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, version, content, format: 'json_schema' }),
    });
    window.location.reload();
  };

  const activate = async (id: string) => {
    await fetch(`/api/schema/${id}/activate`, { method: 'PATCH' });
    window.location.reload();
  };

  return (
    <>
      <PageHeader title="Schema" description="View the active validation contract and schema compatibility context for outputs." />
      {loading ? <StateCard message="Loading schema configuration..." /> : error ? <StateCard message={`Unable to load schema: ${error}`} /> : (
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-panel p-4">
            <h3 className="mb-2 font-semibold">Create schema</h3>
            <div className="grid gap-2 lg:grid-cols-3"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Schema name" className="rounded border border-border bg-panelAlt px-3 py-2 text-sm" /><input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="Version" className="rounded border border-border bg-panelAlt px-3 py-2 text-sm lg:col-span-1" /><button onClick={create} disabled={!name.trim() || !content.trim()} className="rounded bg-accent px-3 py-2 text-sm font-medium disabled:opacity-50">Save</button></div>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Paste JSON schema content" className="mt-2 h-36 w-full rounded border border-border bg-panelAlt p-3 text-xs" />
          </section>
          {data.length === 0 ? <StateCard message="No schema loaded. Upload or configure a schema to validate outputs." /> : data.map((schema) => <section key={schema.id} className="rounded-xl border border-border bg-panel p-4"><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">{schema.name} v{schema.version}</h3><button onClick={() => activate(schema.id)} disabled={schema.isActive} className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50">{schema.isActive ? 'Active' : 'Activate'}</button></div><p className="text-xs text-muted">Format: {schema.format} · Updated: {formatDateTime(schema.updatedAt)}</p><pre className="code-view mt-2 max-h-96 overflow-auto text-xs">{schema.content}</pre></section>) }
        </div>
      )}
    </>
  );
}
