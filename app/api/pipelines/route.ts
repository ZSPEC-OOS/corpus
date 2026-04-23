import { NextResponse } from 'next/server';
import { createPipeline, documents } from '@/lib/inMemoryStore';

export async function POST(request: Request) {
  const body = await request.json();
  const documentId = body?.documentId;

  if (typeof documentId !== 'string') {
    return NextResponse.json({ error: 'documentId is required.' }, { status: 400 });
  }

  if (!documents.has(documentId)) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  const run = createPipeline(documentId);
  return NextResponse.json(run, { status: 201 });
}
