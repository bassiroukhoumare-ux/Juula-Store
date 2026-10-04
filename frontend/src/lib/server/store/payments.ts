// Online payments for store orders + the merchant wallet ledger.
//
// Money flow: customers pay through the platform's Moneriz account; each
// paid order credits its merchant's wallet with `netAmount`. Moneriz settles
// funds after 72h, so a credit only becomes withdrawable at `availableAt`
// (paidAt + PAYOUT_HOLD_HOURS). Withdrawals (generic `Withdrawal` rows) are
// debited from the same ledger.
//
// Trust rule: an order is marked paid ONLY after re-reading its checkout
// session from the Moneriz API with our secret key. Webhook bodies and
// browser callbacks are just hints to go and check — a forged webhook or
// postMessage can never credit a wallet.
import 'server-only';
import type { Prisma, PrismaClient, StoreOrder } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import {
  getMonerizCheckoutSession,
  getMonerizConfig,
  MonerizApiError,
} from '@/lib/server/payments/moneriz';
import type { TxClient } from '@/lib/server/withdrawals/lock';
import { log } from '@/lib/server/observability/log';
import { sendPaymentConfirmedEmail } from '@/lib/server/store/notify';

function intEnv(name: string, fallback: number, max: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.floor(n) : fallback;
}

/** Hours between payment and withdrawability (provider settlement delay). */
export function payoutHoldHours(): number {
  return intEnv('PAYOUT_HOLD_HOURS', 72, 24 * 60);
}

/** Platform commission on online orders, in percent (default 0). */
export function commissionPercent(): number {
  return intEnv('PLATFORM_COMMISSION_PERCENT', 0, 100);
}

export function netAmountFor(totalAmount: number): number {
  return totalAmount - Math.round((totalAmount * commissionPercent()) / 100);
}

export function isMonerizConfigured(): boolean {
  return Boolean(getMonerizConfig().secretKey);
}

export type PaymentCheckResult =
  | { status: 'paid'; order: StoreOrder }
  | { status: 'pending' | 'not_online' | 'not_found' | 'mismatch' | 'unavailable' };

/**
 * Re-verify an online order against Moneriz and mark it paid if (and only
 * if) its checkout session is complete for exactly the expected amount and
 * reference. Idempotent: safe to call from the webhook, the customer's
 * return page and the dashboard at the same time.
 */
export async function verifyOrderPayment(orderId: string): Promise<PaymentCheckResult> {
  const order = await prisma.storeOrder.findUnique({ where: { id: orderId } });
  if (!order) return { status: 'not_found' };
  if (order.paymentStatus === 'paid') return { status: 'paid', order };
  if (order.paymentType === 'cod' || !order.providerSessionId) return { status: 'not_online' };
  if (!isMonerizConfigured()) return { status: 'unavailable' };

  let session;
  try {
    session = await getMonerizCheckoutSession(order.providerSessionId);
  } catch (err) {
    // Moneriz says the session doesn't exist: definitive, not retryable.
    if (err instanceof MonerizApiError && err.statusCode === 404) return { status: 'mismatch' };
    log.warn('store.payment.verify_failed', {
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 'unavailable' };
  }

  if (session.status !== 'complete') return { status: 'pending' };
  if (session.reference !== order.id || session.amount !== order.totalAmount) {
    log.error('store.payment.mismatch', {
      orderId,
      sessionId: session.id,
      expectedAmount: order.totalAmount,
      sessionAmount: session.amount,
    });
    return { status: 'mismatch' };
  }

  const paidAt = new Date();
  const updated = await prisma.storeOrder.updateMany({
    where: { id: order.id, paymentStatus: { not: 'paid' } },
    data: {
      paymentStatus: 'paid',
      paidAt,
      availableAt: new Date(paidAt.getTime() + payoutHoldHours() * 3600_000),
      netAmount: netAmountFor(order.totalAmount),
      providerPaymentId: session.paymentId,
      deliveryNotes: `Payé en ligne via Moneriz (réf. ${session.paymentId ?? session.id})`,
    },
  });
  if (updated.count > 0) {
    log.info('store.payment.confirmed', {
      orderId,
      merchantId: order.merchantId,
      amount: order.totalAmount,
    });
    sendPaymentConfirmedEmail(order.id).catch((err) =>
      log.error('store.payment.email_failed', { orderId, error: String(err) }),
    );
  }
  const fresh = await prisma.storeOrder.findUniqueOrThrow({ where: { id: order.id } });
  return { status: 'paid', order: fresh };
}

/**
 * Opportunistic catch-up for orders whose webhook was missed: re-verify a
 * few recent pending online orders of this merchant. Bounded and parallel
 * so the dashboard stays fast.
 */
export async function syncPendingPayments(merchantId: string, limit = 5): Promise<number> {
  if (!isMonerizConfigured()) return 0;
  const since = new Date(Date.now() - 48 * 3600_000);
  const pending = await prisma.storeOrder.findMany({
    where: {
      merchantId,
      paymentStatus: 'pending_online',
      providerSessionId: { not: null },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true },
  });
  const results = await Promise.all(pending.map((o) => verifyOrderPayment(o.id).catch(() => null)));
  return results.filter((r) => r?.status === 'paid').length;
}

// ─────────────────────────────────────────────────────────────────────────
// Wallet ledger
// ─────────────────────────────────────────────────────────────────────────

/** Withdrawal statuses that hold money (in flight or paid out). */
export const RESERVING_WITHDRAWAL_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED'];

export interface MerchantWallet {
  /** Withdrawable now: matured credits − reserved/paid-out withdrawals. */
  available: number;
  /** Paid but still inside the 72h hold. */
  pending: number;
  /** When the next pending credit becomes available (ISO), if any. */
  nextReleaseAt: string | null;
  /** Sum of COMPLETED withdrawals. */
  totalWithdrawn: number;
  /** Sum of PENDING/PROCESSING withdrawals. */
  inFlight: number;
}

/**
 * Read the merchant's ledger. Pass `tx` to bind the read to the withdrawal
 * transaction (advisory lock + Serializable) so the balance can't change
 * between the check and the debit.
 */
export async function computeMerchantWallet(
  merchantId: string,
  tx?: TxClient,
  now: Date = new Date(),
): Promise<MerchantWallet> {
  const client = (tx ?? prisma) as PrismaClient;
  const paidWhere: Prisma.StoreOrderWhereInput = {
    merchantId,
    paymentStatus: 'paid',
    status: { not: 'cancelled' },
  };
  const [matured, held, nextRelease, withdrawals] = await Promise.all([
    client.storeOrder.aggregate({
      where: { ...paidWhere, availableAt: { lte: now } },
      _sum: { netAmount: true },
    }),
    client.storeOrder.aggregate({
      where: { ...paidWhere, availableAt: { gt: now } },
      _sum: { netAmount: true },
    }),
    client.storeOrder.findFirst({
      where: { ...paidWhere, availableAt: { gt: now } },
      orderBy: { availableAt: 'asc' },
      select: { availableAt: true },
    }),
    client.withdrawal.groupBy({
      by: ['status'],
      where: { userId: merchantId, status: { in: RESERVING_WITHDRAWAL_STATUSES } },
      _sum: { amount: true },
    }),
  ]);

  const sumFor = (status: string) => withdrawals.find((w) => w.status === status)?._sum.amount ?? 0;
  const totalWithdrawn = sumFor('COMPLETED');
  const inFlight = sumFor('PENDING') + sumFor('PROCESSING');
  const credited = matured._sum.netAmount ?? 0;

  return {
    available: Math.max(0, credited - totalWithdrawn - inFlight),
    pending: held._sum.netAmount ?? 0,
    nextReleaseAt: nextRelease?.availableAt?.toISOString() ?? null,
    totalWithdrawn,
    inFlight,
  };
}

/** `BalanceComputer` adapter for the shared withdrawal guards. */
export async function storeBalanceComputer(userId: string, tx?: TxClient): Promise<number> {
  return (await computeMerchantWallet(userId, tx)).available;
}
