import { NextResponse } from 'next/server';
import { listArtifacts } from '@/lib/inMemoryStore';

export async function GET() {
  return NextResponse.json(listArtifacts());
}
