// GET /api/store/analytics?from=<iso>&to=<iso>[&productId=<id>] — the
// merchant's product-page analytics (views, visitors, countries, sources,
// conversion, abandoned checkouts), scoped to their own products.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { getStoreAnalytics } from '@/lib/server/store/analytics';

const DAY = 86_400_000;

function parseDate(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const q = req.nextUrl.searchParams;
    const to = parseDate(q.get('to')) ?? new Date();
    let from = parseDate(q.get('from')) ?? new Date(to.getTime() - 30 * DAY);
    // Cap the window at ~13 months.
    if (to.getTime() - from.getTime() > 400 * DAY) from = new Date(to.getTime() - 400 * DAY);
    const productId = q.get('productId') ?? undefined;
    const analytics = await getStoreAnalytics(auth.user.sub, { from, to, productId });
    return NextResponse.json(
      { analytics },
      { headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' } },
    );
  });
}
