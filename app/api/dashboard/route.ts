import { NextResponse } from 'next/server';
import { listArtifacts, listDocuments, listPipelines } from '@/lib/inMemoryStore';

export async function GET() {
  const documents = listDocuments();
  const runs = listPipelines();
  const artifacts = listArtifacts();

  return NextResponse.json({
    totalDocuments: documents.length,
    activePipelines: runs.filter((run) => run.status === 'running' || run.status === 'waiting').length,
    completedRuns: runs.filter((run) => run.status === 'completed').length,
    failedRuns: runs.filter((run) => run.status === 'failed').length,
    totalOutputArtifacts: artifacts.length,
    totalRecords: runs.reduce((sum, run) => sum + (run.statistics?.totalRecords ?? 0), 0),
    recentRuns: [...runs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8),
  });
}
