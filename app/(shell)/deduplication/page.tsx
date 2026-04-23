'use client';

import { PageHeader, StateCard } from '@/app/components/page-header';
import { useFetchState } from '@/app/components/use-fetch-state';
import { PipelineRun } from '@/lib/types';

export default function DeduplicationPage() {
  const { data, loading, error } = useFetchState<PipelineRun[]>('/api/pipelines', []);
  const rows = data.filter((run) => run.statistics?.duplicatesRemoved !== undefined);

  return (
    <>
      <PageHeader title="Deduplication" description="Track duplicate and near-duplicate handling outcomes from real pipeline executions." />
      {loading ? <StateCard message="Loading deduplication results..." /> : error ? <StateCard message={`Unable to load deduplication data: ${error}`} /> : rows.length === 0 ? <StateCard message="No deduplication data yet. Results appear after runs complete deduplication steps." /> : (
        <div className="space-y-2 rounded-xl border border-border bg-panel p-2">{rows.map((run) => <div key={run.id} className="grid grid-cols-1 gap-1 rounded-lg border border-border bg-panelAlt p-3 text-sm lg:grid-cols-4"><div>Run {run.id.slice(0, 8)}</div><div>Duplicates removed: {run.statistics?.duplicatesRemoved ?? 0}</div><div>Retained records: {run.statistics?.totalRecords ?? 0}</div><div>Dedupe rate: {(run.statistics?.totalRecords ? ((run.statistics.duplicatesRemoved ?? 0) / run.statistics.totalRecords * 100).toFixed(1) : '0.0')}%</div></div>)}</div>
      )}
    </>
  );
}
