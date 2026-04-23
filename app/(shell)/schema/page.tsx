'use client';

import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { SchemaRecord } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export default function SchemaPage() {
  const { data, loading, error } = useFetchState<SchemaRecord[]>('/api/schema', []);

  return (
    <>
      <PageHeader title="Schema" description="View the active validation contract and schema compatibility context for outputs." />
      {loading ? <StateCard message="Loading schema configuration..." /> : error ? <StateCard message={`Unable to load schema: ${error}`} /> : data.length === 0 ? <StateCard message="No schema loaded. Upload or configure a schema to validate outputs." /> : (
        <div className="space-y-4">{data.map((schema) => <section key={schema.id} className="rounded-xl border border-border bg-panel p-4"><h3 className="font-semibold">{schema.name} v{schema.version}</h3><p className="text-xs text-muted">Source: {schema.source} · Updated: {formatDateTime(schema.updatedAt)}</p><pre className="code-view mt-2 max-h-96 overflow-auto text-xs">{schema.content}</pre></section>)}</div>
      )}
    </>
  );
}
