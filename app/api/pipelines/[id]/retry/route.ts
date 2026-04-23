import { NextResponse } from 'next/server';
import { createIdleSteps } from '@/lib/pipeline';
import { updatePipeline } from '@/lib/inMemoryStore';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const run = updatePipeline(params.id, (current) => ({
    ...current,
    status: 'idle',
    outputArtifacts: undefined,
    schema: undefined,
    statistics: undefined,
    steps: createIdleSteps(),
  }));

  if (!run) {
    return NextResponse.json({ error: 'Pipeline run not found.' }, { status: 404 });
  }

  return NextResponse.json(run);
}
