import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { documents } from '@/lib/inMemoryStore';
import { DocumentRecord } from '@/lib/types';

export async function GET() {
  return NextResponse.json(Array.from(documents.values()));
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const pageCountValue = formData.get('pageCount');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File upload is required.' }, { status: 400 });
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF uploads are supported.' }, { status: 415 });
  }

  const pageCount = typeof pageCountValue === 'string' ? Number(pageCountValue) : undefined;
  const normalizedPageCount = Number.isFinite(pageCount) && pageCount > 0 ? pageCount : undefined;

  const arrayBuffer = await file.arrayBuffer();
  const sha256 = createHash('sha256').update(Buffer.from(arrayBuffer)).digest('hex');

  const document: DocumentRecord = {
    id: crypto.randomUUID(),
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
    pageCount: normalizedPageCount,
    sha256,
  };

  documents.set(document.id, document);

  return NextResponse.json(document, { status: 201 });
}
