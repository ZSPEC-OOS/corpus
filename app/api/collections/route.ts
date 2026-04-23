import { NextResponse } from 'next/server';
import { createCollection, listCollections } from '@/lib/inMemoryStore';

export async function GET() {
  return NextResponse.json(listCollections());
}

export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body?.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const record = createCollection({
    name: body.name.trim(),
    description: typeof body.description === 'string' ? body.description : undefined,
  });
  return NextResponse.json(record, { status: 201 });
}
