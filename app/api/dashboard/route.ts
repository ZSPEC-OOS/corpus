import { NextResponse } from 'next/server';
import { documents, pipelines } from '@/lib/inMemoryStore';

export async function GET() {
  const runs = Array.from(pipelines.values());
  const artifacts = runs.flatMap((run) => run.outputArtifacts ?? []);
  const totalRecords = runs.reduce((sum, run) => sum + (run.statistics?.totalRecords ?? 0), 0);

  return NextResponse.json({
    totalDocuments: documents.size,
    activePipelines: runs.filter((run) => run.status === 'running' || run.status === 'waiting').length,
    completedRuns: runs.filter((run) => run.status === 'completed').length,
    failedRuns: runs.filter((run) => run.status === 'failed').length,
    totalOutputArtifacts: artifacts.length,
    totalRecords,
    recentRuns: runs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8),
  });
}
