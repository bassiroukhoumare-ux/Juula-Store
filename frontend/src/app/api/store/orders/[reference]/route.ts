// PATCH /api/store/orders/[reference] — move an order through the Kanban
// (new → confirmed → delivered | cancelled). `reference` is the order id the
// dashboard displays (CMD-XXX-000001), unique per merchant.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { toOrderLead } from '@/lib/server/store/orders';

const PatchBody = z.object({
  status: z.enum(['new', 'confirmed', 'delivered', 'cancelled']),
});

export async function PATCH(
  req: NextRequest,
  routeCtx: { params: Promise<{ reference: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { reference } = await routeCtx.params;

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Statut invalide', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const existing = await prisma.storeOrder.findFirst({
      where: { merchantId: auth.user.sub, reference: decodeURIComponent(reference) },
      select: { id: true, paymentStatus: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'ORDER_NOT_FOUND', message: 'Commande introuvable' },
        { status: 404, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // A paid online order is part of the merchant's wallet ledger: cancelling
    // it here would silently change the balance (possibly after a payout).
    // Refunds go through support.
    if (existing.paymentStatus === 'paid' && parsed.data.status === 'cancelled') {
      return NextResponse.json(
        {
          error: 'PAID_ORDER_NOT_CANCELLABLE',
          message:
            'Commande déjà payée en ligne : contactez le support Juula pour un remboursement.',
        },
        { status: 409, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const order = await prisma.storeOrder.update({
      where: { id: existing.id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json(
      { order: toOrderLead(order) },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
