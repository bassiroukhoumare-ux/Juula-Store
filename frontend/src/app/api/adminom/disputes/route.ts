// GET /api/adminom/disputes?period=7|30|90&status=&q= — every online payment
// (Moneriz) with its financial status: maturing (72 h), available, withdrawn,
// frozen, refunding, refunded.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { PERIODS, type AdminPeriod } from '@/lib/server/adminom/data';
import { disputesView, type DisputeFilter } from '@/lib/server/adminom/moderation';

const FILTERS: DisputeFilter[] = [
  'all',
  'maturing',
  'available',
  'withdrawn',
  'frozen',
  'refunding',
  'refunded',
  'released',
];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const sp = req.nextUrl.searchParams;
    const p = Number(sp.get('period'));
    const period = (PERIODS as readonly number[]).includes(p) ? (p as AdminPeriod) : 30;
    const status = sp.get('status') as DisputeFilter;
    const data = await disputesView(
      period,
      FILTERS.includes(status) ? status : 'all',
      sp.get('q') ?? '',
    );
    return NextResponse.json(data, {
      headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' },
    });
  });
}
