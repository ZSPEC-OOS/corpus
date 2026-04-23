import { NextResponse } from 'next/server';
import { pipelines } from '@/lib/inMemoryStore';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const run = pipelines.get(params.id);
  if (!run) {
    return NextResponse.json({ error: 'Pipeline run not found.' }, { status: 404 });
  }
  return NextResponse.json(run);
}
