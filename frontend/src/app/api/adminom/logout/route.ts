// POST /api/adminom/logout — ends the admin session.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, adminCookieOptions } from '@/lib/server/adminom/session';

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', adminCookieOptions(0));
  return res;
}
