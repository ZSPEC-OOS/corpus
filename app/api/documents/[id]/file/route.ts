import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getDocument, resolveStoragePath } from '@/lib/inMemoryStore';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const document = getDocument(params.id);
  if (!document?.storagePath) return NextResponse.json({ error: 'Document file not found.' }, { status: 404 });

  try {
    const bytes = await readFile(resolveStoragePath(document.storagePath));
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `inline; filename="${document.filename.replace(/["\\;\r\n]/g, '_')}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Document file not found.' }, { status: 404 });
  }
}
