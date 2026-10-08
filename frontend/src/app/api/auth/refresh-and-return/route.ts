// GET /api/auth/refresh-and-return?next=<path>
//
// Browser-friendly silent refresh: bounces the user through a 302 → mints
// fresh access+refresh+csrf cookies (same flow as POST /api/auth/refresh) →
// 302s to the validated `next` path. Used by `frontend/proxy.ts` when a
// protected page is requested with a missing/expired access cookie but a
// still-valid refresh cookie.
//
// Why a separate route instead of fetching POST /refresh from middleware?
//   1. The refresh cookie is path-scoped to /api/auth (D-21) — the browser
//      attaches it when navigating to /api/auth/refresh-and-return, which is
//      exactly what middleware NextResponse.redirect produces.
//   2. Middleware runs on Edge runtime (no Prisma, no bcrypt). Doing the
//      rotation here keeps DB access + jose in the Node runtime where it
//      belongs.
//
// Open-redirect mitigation: `next` MUST be a same-origin path (`^/[^/]`) —
// `//evil.com` and `https://evil.com` are rejected and fall back to `/`.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import {
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  clearCsrfCookie,
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  setCsrfCookie,
  verifyRefreshToken,
} from '@/lib/server/auth';
import { acquireRefreshLock } from '@/lib/server/auth/refresh-lock';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const FALLBACK_NEXT = '/';

function safeNext(raw: string | null): string {
  if (!raw) return FALLBACK_NEXT;
  if (!raw.startsWith('/')) return FALLBACK_NEXT;
  if (raw.startsWith('//')) return FALLBACK_NEXT;
  if (raw.startsWith('/\\')) return FALLBACK_NEXT;
  if (raw.length > 2000) return FALLBACK_NEXT;
  return raw;
}

/** Dead session: wipe every auth cookie (incl. the CSRF "session hint" the
 *  middleware reads) and land on the login page. `expired=1` tells the
 *  middleware not to bounce /login back here — no redirect loop possible. */
async function loginRedirect(req: NextRequest, next: string): Promise<NextResponse> {
  await clearAuthCookies();
  await clearCsrfCookie();
  const url = req.nextUrl.clone();
  url.pathname = process.env.AUTH_LOGIN_PATH || '/login';
  url.search = new URLSearchParams({ next, expired: '1' }).toString();
  return NextResponse.redirect(url, 303);
}

/** `next` keeps its query string (e.g. /dashboard?commande=CMD-…). */
function redirectToNext(req: NextRequest, next: string): NextResponse {
  return NextResponse.redirect(new URL(next, req.nextUrl.origin), 303);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const next = safeNext(req.nextUrl.searchParams.get('next'));

    const refreshCookie = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
    if (!refreshCookie) return await loginRedirect(req, next);

    const payload = await verifyRefreshToken(refreshCookie);
    if (!payload) return await loginRedirect(req, next);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, tokenVersion: true, status: true },
    });
    if (!user || user.tokenVersion !== payload.tokenVersion || user.status === 'SUSPENDED') {
      return await loginRedirect(req, next);
    }

    const release = await acquireRefreshLock(user.id);
    if (!release) {
      // Another tab is rotating. Bounce back to `next` — the in-flight
      // rotation will land cookies before the user's next request.
      return redirectToNext(req, next);
    }

    try {
      const accessToken = await createAccessToken({
        sub: user.id,
        email: user.email,
        tokenVersion: user.tokenVersion,
      });
      const refreshToken = await createRefreshToken(user.id, user.tokenVersion);
      await setAuthCookies(accessToken, refreshToken);
      await setCsrfCookie();
    } finally {
      await release();
    }

    const res = redirectToNext(req, next);
    res.headers.set('x-request-id', ctx.requestId);
    return res;
  });
}
