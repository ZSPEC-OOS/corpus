import { NextResponse } from 'next/server';
import { getArtifact } from '@/lib/inMemoryStore';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const artifact = getArtifact(params.id);
  if (!artifact) return NextResponse.json({ error: 'Artifact not found.' }, { status: 404 });
  return NextResponse.json(artifact);
}
