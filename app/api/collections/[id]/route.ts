import { NextResponse } from 'next/server';
import { collections } from '@/lib/inMemoryStore';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const record = collections.get(params.id);
  if (!record) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  return NextResponse.json(record);
}
