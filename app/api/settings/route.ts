import { NextResponse } from 'next/server';
import { settings } from '@/lib/inMemoryStore';

export async function GET() {
  return NextResponse.json(settings);
}
