// LOCAL DEVELOPMENT ONLY — signs in as an existing account without a password.
// Refused unless ALL of these hold:
//   - NODE_ENV is not « production » (Vercel builds always are);
//   - DEV_LOGIN_ENABLED=1 is set explicitly in .env.local;
//   - the request comes from localhost / 127.0.0.1.
// Usage: http://localhost:3000/api/auth/dev-login?email=<account email>
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import {
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  setCsrfCookie,
} from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';

function devLoginAllowed(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.DEV_LOGIN_ENABLED !== '1') return false;
  const host = (req.headers.get('host') ?? '').split(':')[0]!.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
}

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

async function signIn(email: string | null) {
  if (!email) return null;
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true, tokenVersion: true },
  });
  if (!user) return null;
  const accessToken = await createAccessToken({
    sub: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion,
  });
  const refreshToken = await createRefreshToken(user.id, user.tokenVersion);
  await setAuthCookies(accessToken, refreshToken);
  await setCsrfCookie();
  return user;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!devLoginAllowed(req)) return notFound();
  const user = await signIn(req.nextUrl.searchParams.get('email'));
  if (!user) return NextResponse.json({ error: 'Unknown email' }, { status: 404 });
  const next = req.nextUrl.searchParams.get('next') ?? '/dashboard';
  // Same-site paths only (no open redirect).
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  return NextResponse.redirect(new URL(safeNext, req.url));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!devLoginAllowed(req)) return notFound();
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const user = await signIn(body.email ?? null);
  if (!user) return NextResponse.json({ error: 'Unknown email' }, { status: 404 });
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
}
