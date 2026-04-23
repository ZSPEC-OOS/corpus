import { NextResponse } from 'next/server';
import { getCollection, getDocument, updateCollection } from '@/lib/inMemoryStore';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const documentId = body?.documentId;
  if (typeof documentId !== 'string') return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
  if (!getDocument(documentId)) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  const collection = getCollection(params.id);
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });

  const documentIds = Array.from(new Set([...collection.documentIds, documentId]));
  const updated = updateCollection(params.id, { documentIds });
  return NextResponse.json(updated);
}
