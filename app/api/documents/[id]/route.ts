import { NextResponse } from 'next/server';
import { documents } from '@/lib/inMemoryStore';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const document = documents.get(params.id);
  if (!document) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }
  return NextResponse.json(document);
}
