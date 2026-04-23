import { NextResponse } from 'next/server';
import { deleteDocument, getDocument } from '@/lib/inMemoryStore';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const document = getDocument(params.id);
  if (!document) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  return NextResponse.json(document);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const ok = deleteDocument(params.id);
  if (!ok) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
