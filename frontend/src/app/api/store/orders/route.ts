// GET /api/store/orders — orders captured on the merchant's product pages,
// newest first, shaped as the dashboard's OrderLead.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { toOrderLead } from '@/lib/server/store/orders';
import { syncPendingPayments } from '@/lib/server/store/payments';

const MAX_ORDERS = 500;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    // Catch up on online payments whose webhook was missed (bounded).
    await syncPendingPayments(auth.user.sub).catch(() => 0);

    const orders = await prisma.storeOrder.findMany({
      where: { merchantId: auth.user.sub },
      orderBy: { createdAt: 'desc' },
      take: MAX_ORDERS,
    });
    return NextResponse.json(
      { orders: orders.map(toOrderLead) },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
