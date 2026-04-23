import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/inMemoryStore';

const allowed = new Set([
  'defaultExportFormat',
  'targetShardSizeMb',
  'includeTokenCounts',
  'includeProvenance',
  'strictSchemaValidation',
  'ocrEnabled',
  'dedupeSensitivity',
]);

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const payload = Object.fromEntries(Object.entries(body ?? {}).filter(([key]) => allowed.has(key)));
  return NextResponse.json(updateSettings(payload));
}
