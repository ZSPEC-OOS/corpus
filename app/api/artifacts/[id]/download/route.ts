import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getArtifact } from '@/lib/inMemoryStore';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const artifact = getArtifact(params.id);
  if (!artifact?.storagePath) return NextResponse.json({ error: 'Artifact not found.' }, { status: 404 });

  try {
    const bytes = await readFile(artifact.storagePath);
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': artifact.type === 'jsonl' ? 'application/x-ndjson' : 'application/json',
        'Content-Disposition': `attachment; filename="${artifact.filename.replace(/["\\;\r\n]/g, '_')}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Artifact not found.' }, { status: 404 });
  }
}
