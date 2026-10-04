// POST /api/webhooks/moneriz — Moneriz payment & payout notifications.
//
// Defense in depth:
//   1. HMAC signature (`t=…,v1=…` over `${t}.${rawBody}`, 5-min replay window)
//      is REQUIRED whenever MONERIZ_WEBHOOK_SECRET is set. The raw body is
//      read once and verified before any JSON parse.
//   2. The body is never trusted for money: a payment event only tells us
//      WHICH order to re-check; `verifyOrderPayment` re-reads the checkout
//      session from the Moneriz API (secret key) and checks amount +
//      reference. Withdrawal events re-read the payout the same way.
//      So even without a webhook secret, a forged call can't credit a wallet.
//   3. Handlers are idempotent; WebhookLog records processed events.
export const runtime = 'nodejs';

import 'server-only';
import { after, NextResponse, type NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { log } from '@/lib/server/observability/log';
import { prisma } from '@/lib/server/prisma';
import {
  getMonerizConfig,
  getMonerizWithdrawal,
  verifyMonerizSignature,
} from '@/lib/server/payments/moneriz';
import { verifyOrderPayment } from '@/lib/server/store/payments';
import { verifyStoreSubscription } from '@/lib/server/store/subscription';
import { sendWithdrawalCompletedEmail, sendWithdrawalFailedEmail } from '@/lib/server/store/notify';

interface MonerizEvent {
  id?: unknown;
  type?: unknown;
  data?: {
    payment?: {
      reference?: unknown;
      metadata?: { orderId?: unknown; subscriptionId?: unknown; type?: unknown };
    };
    checkoutSession?: {
      reference?: unknown;
      metadata?: { orderId?: unknown; subscriptionId?: unknown; type?: unknown };
    };
    withdrawal?: { id?: unknown };
  };
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 && v.length <= 128 ? v : null;
}

/** Our StoreOrder.id travels as the session `reference` and `metadata.orderId`. */
function orderIdFrom(event: MonerizEvent): string | null {
  const p = event.data?.payment;
  const s = event.data?.checkoutSession;
  if (p?.metadata?.type === 'store_subscription' || s?.metadata?.type === 'store_subscription') {
    return null;
  }
  return (
    str(p?.metadata?.orderId) ?? str(p?.reference) ?? str(s?.metadata?.orderId) ?? str(s?.reference)
  );
}

function subscriptionIdFrom(event: MonerizEvent): string | null {
  const p = event.data?.payment;
  const s = event.data?.checkoutSession;
  return (
    str(p?.metadata?.subscriptionId) ??
    str(s?.metadata?.subscriptionId) ??
    (p?.metadata?.type === 'store_subscription' ? str(p?.reference) : null) ??
    (s?.metadata?.type === 'store_subscription' ? str(s?.reference) : null)
  );
}

const COMPLETED = new Set(['completed', 'succeeded', 'success', 'paid']);
const FAILED = new Set(['failed', 'rejected', 'cancelled', 'canceled', 'reversed']);

async function syncWithdrawal(providerPayoutId: string): Promise<void> {
  const payout = (await getMonerizWithdrawal(providerPayoutId)) as {
    status?: unknown;
    failureCode?: unknown;
  };
  const status = typeof payout?.status === 'string' ? payout.status.toLowerCase() : '';
  if (COMPLETED.has(status)) {
    const done = await prisma.withdrawal.updateMany({
      where: { providerPayoutId, status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    if (done.count > 0) {
      const row = await prisma.withdrawal.findFirst({
        where: { providerPayoutId },
        select: { id: true },
      });
      if (row) after(() => sendWithdrawalCompletedEmail(row.id));
    }
  } else if (FAILED.has(status)) {
    // FAILED releases the reserved amount back to the merchant's balance.
    const failed = await prisma.withdrawal.updateMany({
      where: { providerPayoutId, status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'FAILED', failureReason: str(payout?.failureCode) ?? 'Rejeté par Moneriz' },
    });
    // Only the first FAILED transition notifies (webhooks can be redelivered).
    if (failed.count > 0) {
      const row = await prisma.withdrawal.findFirst({
        where: { providerPayoutId },
        select: { id: true },
      });
      if (row) after(() => sendWithdrawalFailedEmail(row.id));
    }
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const { webhookSecret } = getMonerizConfig();

  if (webhookSecret) {
    const signature =
      req.headers.get('x-moneriz-signature') || req.headers.get('x-izipaye-signature') || '';
    if (!verifyMonerizSignature(rawBody, webhookSecret, signature)) {
      log.warn('moneriz.webhook.bad_signature');
      return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 401 });
    }
  } else {
    log.warn('moneriz.webhook.unsigned', {
      hint: 'Set MONERIZ_WEBHOOK_SECRET — events are still re-verified via the Moneriz API',
    });
  }

  let event: MonerizEvent;
  try {
    event = JSON.parse(rawBody) as MonerizEvent;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }
  const eventId = str(event.id);
  const eventType = str(event.type);
  if (!eventId || !eventType) {
    return NextResponse.json({ error: 'INCOMPLETE_PAYLOAD' }, { status: 400 });
  }

  try {
    switch (eventType) {
      case 'payment.succeeded':
      case 'checkout_session.completed': {
        const orderId = orderIdFrom(event);
        if (orderId) {
          const result = await verifyOrderPayment(orderId);
          log.info('moneriz.webhook.payment', { eventId, orderId, result: result.status });
          // Moneriz not reachable right now: ask for a redelivery.
          if (result.status === 'unavailable') {
            return NextResponse.json({ error: 'RETRY_LATER' }, { status: 503 });
          }
        }
        const subId = subscriptionIdFrom(event);
        if (subId) {
          const subResult = await verifyStoreSubscription(subId);
          log.info('moneriz.webhook.subscription', { eventId, subId, status: subResult.status });
          if (subResult.status === 'unavailable') {
            return NextResponse.json({ error: 'RETRY_LATER' }, { status: 503 });
          }
        }
        break;
      }
      case 'withdrawal.completed':
      case 'withdrawal.failed': {
        const payoutId = str(event.data?.withdrawal?.id);
        if (payoutId) await syncWithdrawal(payoutId);
        break;
      }
      default:
        // payment.failed / payment.expired: the order simply stays
        // `pending_online`; nothing is credited.
        log.info('moneriz.webhook.ignored', { eventId, eventType });
    }
  } catch (err) {
    log.error('moneriz.webhook.failed', {
      eventId,
      eventType,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'PROCESSING_FAILED' }, { status: 500 });
  }

  // Audit trail (dedup on externalId+eventType; handlers above are idempotent).
  await prisma.webhookLog
    .create({
      data: {
        provider: 'moneriz',
        externalId: eventId,
        eventType,
        payload: JSON.parse(rawBody) as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
    })
    .catch(() => undefined);

  return NextResponse.json({ received: true });
}
