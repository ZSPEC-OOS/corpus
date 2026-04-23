import { NextResponse } from 'next/server';
import { createSchema, listSchemas } from '@/lib/inMemoryStore';

export async function GET() {
  return NextResponse.json(listSchemas());
}

export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body?.name !== 'string' || typeof body?.version !== 'string' || typeof body?.content !== 'string') {
    return NextResponse.json({ error: 'name, version, and content are required' }, { status: 400 });
  }

  const schema = createSchema({
    name: body.name,
    version: body.version,
    content: body.content,
    format: body.format === 'json_schema' || body.format === 'pydantic_export' || body.format === 'other' ? body.format : 'other',
    isActive: Boolean(body.isActive),
  });

  return NextResponse.json(schema, { status: 201 });
}
