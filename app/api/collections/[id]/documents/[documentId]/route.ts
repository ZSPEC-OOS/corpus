import { NextResponse } from 'next/server';
import { getCollection, updateCollection } from '@/lib/inMemoryStore';

export async function DELETE(_: Request, { params }: { params: { id: string; documentId: string } }) {
  const collection = getCollection(params.id);
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });

  const updated = updateCollection(params.id, {
    documentIds: collection.documentIds.filter((documentId) => documentId !== params.documentId),
  });

  return NextResponse.json(updated);
}
