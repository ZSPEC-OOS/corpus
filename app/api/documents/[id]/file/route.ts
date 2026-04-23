import { readFileSync } from 'fs';
import { NextResponse } from 'next/server';
import { getDocument } from '@/lib/inMemoryStore';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const document = getDocument(params.id);
  if (!document?.storagePath) return NextResponse.json({ error: 'Document file not found.' }, { status: 404 });

  try {
    const bytes = readFileSync(document.storagePath);
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `inline; filename="${document.filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Document file not found.' }, { status: 404 });
  }
}
