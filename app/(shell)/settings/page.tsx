'use client';

import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { AppSettings } from '@/lib/types';

export default function SettingsPage() {
  const { data, loading, error } = useFetchState<AppSettings | null>('/api/settings', null);

  return (
    <>
      <PageHeader title="Settings" description="Live configuration for runtime behavior, output defaults, and workspace preferences." />
      {loading ? <StateCard message="Loading settings..." /> : error || !data ? <StateCard message={`Unable to load settings: ${error ?? 'No data'}`} /> : (
        <section className="rounded-xl border border-border bg-panel p-4 text-sm">
          <div className="grid gap-2 lg:grid-cols-2">
            <div className="rounded border border-border bg-panelAlt p-3">Timezone: {data.timezone}</div>
            <div className="rounded border border-border bg-panelAlt p-3">Default landing page: {data.defaultLandingPage}</div>
            <div className="rounded border border-border bg-panelAlt p-3">Output format: {data.outputFormat}</div>
            <div className="rounded border border-border bg-panelAlt p-3">Include provenance metadata: {data.includeProvenance ? 'Enabled' : 'Disabled'}</div>
          </div>
        </section>
      )}
    </>
  );
}
