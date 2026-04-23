'use client';

import Link from 'next/link';
import { useFetchState } from '@/app/components/use-fetch-state';
import { PageHeader, StateCard } from '@/app/components/page-header';
import { formatDateTime } from '@/lib/utils';
import { PipelineRun } from '@/lib/types';

type DashboardData = {
  totalDocuments: number;
  activePipelines: number;
  completedRuns: number;
  failedRuns: number;
  totalOutputArtifacts: number;
  totalRecords: number;
  recentRuns: PipelineRun[];
};

export default function DashboardPage() {
  const { data, loading, error } = useFetchState<DashboardData>('/api/dashboard', { totalDocuments: 0, activePipelines: 0, completedRuns: 0, failedRuns: 0, totalOutputArtifacts: 0, totalRecords: 0, recentRuns: [] });

  return (
    <>
      <PageHeader title="Dashboard" description="Operational overview of ingestion, processing, and output readiness." actions={<><Link href="/sources" className="rounded-lg border border-border px-3 py-2 text-sm">Upload PDF</Link><Link href="/pipelines" className="rounded-lg bg-accent px-3 py-2 text-sm font-medium">Start pipeline</Link></>} />
      {loading ? <StateCard message="Loading dashboard metrics..." /> : error ? <StateCard message={`Unable to load dashboard: ${error}`} /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {Object.entries({ 'Total documents': data.totalDocuments, 'Active pipelines': data.activePipelines, 'Completed runs': data.completedRuns, 'Failed runs': data.failedRuns, 'Output artifacts': data.totalOutputArtifacts, 'Records generated': data.totalRecords }).map(([k, v]) => <div key={k} className="rounded-xl border border-border bg-panel p-4"><div className="text-xs text-muted">{k}</div><div className="text-2xl font-semibold">{v}</div></div>)}
          </div>
          <section className="rounded-xl border border-border bg-panel p-4">
            <h3 className="mb-3 font-semibold">Recent pipeline runs</h3>
            {data.recentRuns.length === 0 ? <StateCard message="No pipeline activity yet. Upload a PDF and create your first run." /> : (
              <div className="space-y-2">{data.recentRuns.map((run) => <Link href={`/pipelines/${run.id}`} key={run.id} className="flex items-center justify-between rounded-lg border border-border bg-panelAlt p-3 text-sm"><span>{run.id.slice(0, 8)}</span><span className="text-muted">{run.status}</span><span className="text-muted">{formatDateTime(run.updatedAt)}</span></Link>)}</div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
