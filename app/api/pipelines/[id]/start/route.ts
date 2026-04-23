import { NextResponse } from 'next/server';
import { updatePipeline } from '@/lib/inMemoryStore';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const run = updatePipeline(params.id, (current) => ({
    ...current,
    status: 'running',
    steps: current.steps.map((step, index) => {
      if (index === 0) {
        return { ...step, status: 'running', startedAt: new Date().toISOString() };
      }
      if (step.status === 'idle') {
        return { ...step, status: 'waiting' };
      }
      return step;
    }),
  }));

  if (!run) {
    return NextResponse.json({ error: 'Pipeline run not found.' }, { status: 404 });
  }

  return NextResponse.json(run);
}
