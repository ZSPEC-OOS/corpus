import { NextResponse } from 'next/server';
import { updatePipeline } from '@/lib/inMemoryStore';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const run = updatePipeline(params.id, (current) => {
    if (!(current.status === 'running' || current.status === 'waiting')) return current;
    return {
      ...current,
      status: 'canceled',
      completedAt: new Date().toISOString(),
      steps: current.steps.map((step) => {
        if (step.status === 'running' || step.status === 'waiting') {
          return { ...step, status: 'canceled', completedAt: new Date().toISOString() };
        }
        return step;
      }),
    };
  });

  if (!run) return NextResponse.json({ error: 'Pipeline run not found.' }, { status: 404 });
  return NextResponse.json(run);
}
