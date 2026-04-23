import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Artifact not found.' }, { status: 404 });
}
