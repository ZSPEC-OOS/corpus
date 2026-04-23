import { NextResponse } from 'next/server';
import { updatePipeline } from '@/lib/inMemoryStore';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const run = updatePipeline(params.id, (current) => ({
    ...current,
    status: 'canceled',
    steps: current.steps.map((step) =>
      step.status === 'running' || step.status === 'waiting' ? { ...step, status: 'canceled' } : step,
    ),
  }));

  if (!run) {
    return NextResponse.json({ error: 'Pipeline run not found.' }, { status: 404 });
  }

  return NextResponse.json(run);
}
