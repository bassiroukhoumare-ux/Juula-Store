// POST /api/public/orders/[id]/payment-status — the customer's page asks
// the server to re-check an online payment (after the Moneriz iframe
// reports success, or on return from the hosted checkout). The server
// verifies against the Moneriz API itself; the caller only learns the
// resulting status, nothing else about the order.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { publicOrderRateLimit } from '@/lib/server/store/orders';
import { verifyOrderPayment } from '@/lib/server/store/payments';

export async function POST(
  req: NextRequest,
  routeCtx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const retryAfter = await publicOrderRateLimit(req);
    if (retryAfter !== null) {
      return NextResponse.json(
        { error: 'TOO_MANY_REQUESTS' },
        { status: 429, headers: { ...headers, 'Retry-After': String(retryAfter) } },
      );
    }

    const { id } = await routeCtx.params;
    const result = await verifyOrderPayment(id.slice(0, 64));
    if (result.status === 'not_found' || result.status === 'not_online') {
      return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404, headers });
    }
    if (result.status === 'paid') {
      return NextResponse.json(
        {
          paymentStatus: 'paid',
          reference: result.order.reference,
          totalAmount: result.order.totalAmount,
        },
        { headers },
      );
    }
    // pending / mismatch / unavailable: not (yet) confirmed.
    return NextResponse.json({ paymentStatus: 'pending' }, { headers });
  });
}
