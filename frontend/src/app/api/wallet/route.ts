// GET /api/wallet — the merchant's wallet, computed from the ledger:
// paid online orders (withdrawable 72h after payment) minus withdrawals.
// Also catches up on online payments whose webhook was missed.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import {
  computeMerchantWallet,
  payoutHoldHours,
  syncPendingPayments,
} from '@/lib/server/store/payments';
import type { InflowRecord, PayoutRecord, WalletState } from '@/types/juula';

const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Dakar',
});

function startOfDakarDay(now: Date): Date {
  // Dakar is UTC+0 all year.
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const userId = auth.user.sub;

    await syncPendingPayments(userId).catch(() => 0);

    const now = new Date();
    const dayStart = startOfDakarDay(now);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [ledger, user, withdrawals, paidOrders, today, month, codCollected, codPending] =
      await Promise.all([
        computeMerchantWallet(userId, undefined, now),
        prisma.user.findUnique({ where: { id: userId }, select: { withdrawalPinHash: true } }),
        prisma.withdrawal.findMany({
          where: { userId },
          orderBy: { requestedAt: 'desc' },
          take: 50,
        }),
        prisma.storeOrder.findMany({
          where: { merchantId: userId, paymentStatus: 'paid' },
          orderBy: { paidAt: 'desc' },
          take: 50,
        }),
        prisma.storeOrder.aggregate({
          where: { merchantId: userId, status: { not: 'cancelled' }, createdAt: { gte: dayStart } },
          _sum: { totalAmount: true },
        }),
        prisma.storeOrder.aggregate({
          where: {
            merchantId: userId,
            status: { not: 'cancelled' },
            createdAt: { gte: monthStart },
          },
          _sum: { totalAmount: true },
        }),
        prisma.storeOrder.aggregate({
          where: { merchantId: userId, paymentType: 'cod', status: 'delivered' },
          _sum: { totalAmount: true },
        }),
        prisma.storeOrder.aggregate({
          where: { merchantId: userId, paymentType: 'cod', status: { in: ['new', 'confirmed'] } },
          _sum: { totalAmount: true },
        }),
      ]);

    const payoutHistory: PayoutRecord[] = withdrawals.map((w) => {
      const dest = (w.destination ?? {}) as {
        method?: string;
        phone?: string;
        accountName?: string;
      };
      return {
        id: w.id,
        amount: w.amount,
        provider: dest.method === 'ORANGE_MONEY' ? 'orange_money' : 'wave',
        phoneNumber: dest.phone ?? '',
        recipientName: dest.accountName ?? '',
        date: dateTimeFmt.format(w.requestedAt),
        status:
          w.status === 'COMPLETED'
            ? 'completed'
            : w.status === 'FAILED' || w.status === 'CANCELLED'
              ? 'failed'
              : 'processing',
        reference: w.providerPayoutId ?? w.id,
      };
    });

    const inflowHistory: InflowRecord[] = paidOrders.map((o) => ({
      id: o.id,
      orderId: o.reference,
      customerName: o.customerName,
      neighborhood: o.neighborhood ?? '',
      source: o.paymentType === 'online_orange' ? 'online_orange' : 'online_wave',
      amount: o.netAmount ?? o.totalAmount,
      date: o.paidAt ? dateTimeFmt.format(o.paidAt) : '',
      status: o.availableAt && o.availableAt <= now ? 'confirmed' : 'received',
      ...(o.availableAt ? { availableAt: o.availableAt.toISOString() } : {}),
    }));

    const wallet: WalletState = {
      availableBalance: ledger.available,
      pendingOnlineAmount: ledger.pending,
      nextReleaseAt: ledger.nextReleaseAt,
      payoutHoldHours: payoutHoldHours(),
      todayRevenue: today._sum.totalAmount ?? 0,
      monthRevenue: month._sum.totalAmount ?? 0,
      codCollectedAmount: codCollected._sum.totalAmount ?? 0,
      pendingCodAmount: codPending._sum.totalAmount ?? 0,
      totalWithdrawn: ledger.totalWithdrawn,
      currency: 'FCFA',
      payoutHistory,
      inflowHistory,
    };

    return NextResponse.json(
      { wallet, hasWithdrawalPin: Boolean(user?.withdrawalPinHash) },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
