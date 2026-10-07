// GET /api/adminom/overview?period=30 — platform KPIs.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { PERIODS, overviewView, type AdminPeriod } from '@/lib/server/adminom/data';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const sp = req.nextUrl.searchParams;
    const p = Number(sp.get('period'));
    const period = (PERIODS as readonly number[]).includes(p) ? (p as AdminPeriod) : 30;
    const data = await overviewView(period);
    return NextResponse.json(data, {
      headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' },
    });
  });
}
