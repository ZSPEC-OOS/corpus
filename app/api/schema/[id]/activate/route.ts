import { NextResponse } from 'next/server';
import { activateSchema } from '@/lib/inMemoryStore';

export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  const schema = activateSchema(params.id);
  if (!schema) return NextResponse.json({ error: 'Schema not found' }, { status: 404 });
  return NextResponse.json(schema);
}
