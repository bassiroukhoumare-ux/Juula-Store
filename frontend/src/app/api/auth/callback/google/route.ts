// Fallback / alias for Google OAuth callback
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = req.nextUrl.clone();
  url.pathname = '/api/auth/oauth/google/callback';
  return NextResponse.redirect(url, 307);
}
