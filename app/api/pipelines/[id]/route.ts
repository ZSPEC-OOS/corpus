import { NextResponse } from 'next/server';
import { getArtifact, getPipeline } from '@/lib/inMemoryStore';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const run = getPipeline(params.id);
  if (!run) return NextResponse.json({ error: 'Pipeline run not found.' }, { status: 404 });

  const outputArtifacts = (run.outputArtifactIds ?? []).map((id) => getArtifact(id)).filter(Boolean);
  return NextResponse.json({ ...run, outputArtifacts });
}
