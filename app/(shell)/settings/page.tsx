'use client';

import { useState } from 'react';
import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { AppSettings } from '@/lib/types';

export default function SettingsPage() {
  const { data, loading, error } = useFetchState<AppSettings | null>('/api/settings', null);
  const [saving, setSaving] = useState(false);

  const update = async (patch: Partial<AppSettings>) => {
    setSaving(true);
    await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    window.location.reload();
  };

  return (
    <>
      <PageHeader title="Settings" description="Live configuration for runtime behavior and output defaults." />
      {loading ? <StateCard message="Loading settings..." /> : error || !data ? <StateCard message={`Unable to load settings: ${error ?? 'No data'}`} /> : (
        <section className="rounded-xl border border-border bg-panel p-4 text-sm">
          <div className="grid gap-2 lg:grid-cols-2">
            <label className="rounded border border-border bg-panelAlt p-3">Default export format
              <select value={data.defaultExportFormat ?? 'jsonl'} onChange={(e) => update({ defaultExportFormat: e.target.value as 'jsonl' | 'json' })} className="mt-2 block w-full rounded border border-border bg-panel px-2 py-1">
                <option value="jsonl">jsonl</option><option value="json">json</option>
              </select>
            </label>
            <label className="rounded border border-border bg-panelAlt p-3">Dedupe sensitivity
              <select value={data.dedupeSensitivity ?? 'medium'} onChange={(e) => update({ dedupeSensitivity: e.target.value as 'low' | 'medium' | 'high' })} className="mt-2 block w-full rounded border border-border bg-panel px-2 py-1">
                <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
              </select>
            </label>
            <button disabled={saving} onClick={() => update({ includeProvenance: !data.includeProvenance })} className="rounded border border-border bg-panelAlt p-3 text-left">Include provenance: {data.includeProvenance ? 'Enabled' : 'Disabled'}</button>
            <button disabled={saving} onClick={() => update({ strictSchemaValidation: !data.strictSchemaValidation })} className="rounded border border-border bg-panelAlt p-3 text-left">Strict schema validation: {data.strictSchemaValidation ? 'Enabled' : 'Disabled'}</button>
          </div>
        </section>
      )}
    </>
  );
}
