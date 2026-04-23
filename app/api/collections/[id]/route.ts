import { NextResponse } from 'next/server';
import { deleteCollection, getCollection, updateCollection } from '@/lib/inMemoryStore';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const record = getCollection(params.id);
  if (!record) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  return NextResponse.json(record);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const updated = updateCollection(params.id, {
    name: typeof body?.name === 'string' ? body.name.trim() : undefined,
    description: typeof body?.description === 'string' ? body.description : undefined,
    documentIds: Array.isArray(body?.documentIds) ? body.documentIds : undefined,
  });

  if (!updated) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const ok = deleteCollection(params.id);
  if (!ok) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
