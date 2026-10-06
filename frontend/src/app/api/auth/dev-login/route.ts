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

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Only available in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const requestedEmail = req.nextUrl.searchParams.get('email') || 'bassiroukhoumare@gmail.com';
  const nextPath = req.nextUrl.searchParams.get('next') || '/dashboard';

  let user = await prisma.user.findUnique({
    where: { email: requestedEmail },
    select: { id: true, email: true, tokenVersion: true },
  });

  if (!user) {
    user = await prisma.user.findFirst({
      select: { id: true, email: true, tokenVersion: true },
    });
  }

  if (!user) {
    return NextResponse.json(
      { error: 'No user found in database. Run pnpm seed:dev first.' },
      { status: 404 },
    );
  }

  const accessToken = await createAccessToken({
    sub: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion,
  });
  const refreshToken = await createRefreshToken(user.id, user.tokenVersion);

  await setAuthCookies(accessToken, refreshToken);
  await setCsrfCookie();

  const redirectUrl = new URL(nextPath, req.url);
  return NextResponse.redirect(redirectUrl);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let requestedEmail = 'bassiroukhoumare@gmail.com';
  try {
    const body = (await req.json()) as { email?: string };
    if (body.email) requestedEmail = body.email;
  } catch {
    // Body optional
  }

  let user = await prisma.user.findUnique({
    where: { email: requestedEmail },
    select: { id: true, email: true, tokenVersion: true },
  });

  if (!user) {
    user = await prisma.user.findFirst({
      select: { id: true, email: true, tokenVersion: true },
    });
  }

  if (!user) {
    return NextResponse.json({ error: 'No user found in database' }, { status: 404 });
  }

  const accessToken = await createAccessToken({
    sub: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion,
  });
  const refreshToken = await createRefreshToken(user.id, user.tokenVersion);

  await setAuthCookies(accessToken, refreshToken);
  await setCsrfCookie();

  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
}
