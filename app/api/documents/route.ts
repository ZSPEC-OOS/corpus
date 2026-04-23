import { createHash } from 'crypto';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { NextResponse } from 'next/server';
import { createDocument, ensureParentDir, getDataDir, listDocuments } from '@/lib/inMemoryStore';

export async function GET() {
  return NextResponse.json(listDocuments());
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

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = resolve(getDataDir(), 'uploads', `${crypto.randomUUID()}-${safeName}`);
  ensureParentDir(storagePath);
  writeFileSync(storagePath, buffer);

  const pageCount = typeof pageCountValue === 'string' ? Number(pageCountValue) : undefined;

  const created = createDocument({
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    storagePath,
    pageCount: Number.isFinite(pageCount) && pageCount && pageCount > 0 ? pageCount : undefined,
    sha256,
  });

  return NextResponse.json(created, { status: 201 });
}
