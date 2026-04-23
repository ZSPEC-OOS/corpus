import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline-executor';
import { updatePipeline } from '@/lib/inMemoryStore';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const now = new Date().toISOString();

  const run = updatePipeline(params.id, (current) => {
    if (current.status !== 'idle') return current;
    return {
      ...current,
      status: 'running',
      startedAt: current.startedAt ?? now,
      steps: current.steps.map((step, index) => {
        if (index === 0) return { ...step, status: 'running', startedAt: now };
        return { ...step, status: 'waiting' };
      }),
    };
  });

  if (!run) return NextResponse.json({ error: 'Pipeline run not found.' }, { status: 404 });

  // Fire-and-forget: run the pipeline in the background without blocking the response.
  // Next.js keeps the Node.js process alive while requests are in-flight, so this
  // completes even after the HTTP response is sent.
  void runPipeline(params.id).catch((err: unknown) =>
    console.error(`[pipeline-executor] unhandled error for ${params.id}:`, err),
  );

  return NextResponse.json(run);
}
