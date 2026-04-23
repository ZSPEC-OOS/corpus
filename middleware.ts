import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.CORPUS_API_KEY;

export function middleware(req: NextRequest) {
  // Only guard API routes
  if (!req.nextUrl.pathname.startsWith('/api')) return NextResponse.next();

  // If no key is configured (default dev mode), allow all requests through
  if (!API_KEY) return NextResponse.next();

  const provided =
    req.headers.get('x-api-key') ??
    req.nextUrl.searchParams.get('api_key');

  if (provided !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
