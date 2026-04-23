import { NextResponse } from 'next/server';
import { collections } from '@/lib/inMemoryStore';
import { CollectionRecord } from '@/lib/types';

export async function GET() {
  return NextResponse.json(Array.from(collections.values()));
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body?.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const record: CollectionRecord = {
    id: crypto.randomUUID(),
    name: body.name,
    description: typeof body.description === 'string' ? body.description : undefined,
    sourceIds: [],
    pipelineIds: [],
    artifactIds: [],
    updatedAt: new Date().toISOString(),
  };
  collections.set(record.id, record);
  return NextResponse.json(record, { status: 201 });
}
