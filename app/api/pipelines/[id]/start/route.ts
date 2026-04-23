import { NextResponse } from 'next/server';
import { updatePipeline } from '@/lib/inMemoryStore';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const run = updatePipeline(params.id, (current) => {
    if (!(current.status === 'idle' || current.status === 'waiting')) return current;
    const now = new Date().toISOString();
    return {
      ...current,
      status: 'running',
      startedAt: current.startedAt ?? now,
      steps: current.steps.map((step, index) => {
        if (index === 0 && step.status === 'idle') return { ...step, status: 'running', startedAt: now };
        if (step.status === 'idle') return { ...step, status: 'waiting' };
        return step;
      }),
    };
  });

  if (!run) return NextResponse.json({ error: 'Pipeline run not found.' }, { status: 404 });
  return NextResponse.json(run);
}
