import { NextResponse } from 'next/server';
import { schemas } from '@/lib/inMemoryStore';

export async function GET() {
  return NextResponse.json(Array.from(schemas.values()));
}
