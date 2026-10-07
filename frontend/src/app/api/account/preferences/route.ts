// GET   /api/account/preferences — { theme }
// PATCH /api/account/preferences { theme: light | dark | system }
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';

const Body = z.object({ theme: z.enum(['light', 'dark', 'system']) });

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const user = await prisma.user.findUnique({
      where: { id: auth.user.sub },
      select: { uiTheme: true },
    });
    return NextResponse.json(
      { theme: user?.uiTheme ?? 'system' },
      { headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' } },
    );
  });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Thème invalide.' },
        { status: 400, headers },
      );
    }
    await prisma.user.update({
      where: { id: auth.user.sub },
      data: { uiTheme: parsed.data.theme },
    });
    return NextResponse.json({ theme: parsed.data.theme }, { headers });
  });
}
