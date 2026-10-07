// POST /api/adminom/login — { code } → admin session cookie. 5 tries / 15 min per IP.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  checkAccessCode,
  createAdminToken,
  isAdminomConfigured,
  loginRateLimit,
} from '@/lib/server/adminom/session';

const Body = z.object({ code: z.string().min(1).max(200) });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    if (!isAdminomConfigured()) {
      return NextResponse.json(
        { error: 'NOT_CONFIGURED', message: 'Accès administrateur non configuré sur ce serveur.' },
        { status: 503, headers },
      );
    }
    const retryAfter = await loginRateLimit(req);
    if (retryAfter !== null) {
      return NextResponse.json(
        { error: 'TOO_MANY_ATTEMPTS', message: 'Trop d’essais. Réessayez dans quelques minutes.' },
        { status: 429, headers: { ...headers, 'Retry-After': String(retryAfter) } },
      );
    }
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success || !checkAccessCode(parsed.data.code)) {
      return NextResponse.json(
        { error: 'INVALID_CODE', message: 'Code d’accès incorrect.' },
        { status: 401, headers },
      );
    }
    const res = NextResponse.json({ ok: true }, { headers });
    res.cookies.set(ADMIN_COOKIE, await createAdminToken(), adminCookieOptions());
    return res;
  });
}
