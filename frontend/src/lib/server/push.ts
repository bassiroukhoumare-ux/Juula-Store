import 'server-only';
// Web Push (VAPID) — sending notifications to browsers and installed PWAs.
//
//   sendPushNotification(subscription, payload)  one device
//   sendPushToUser(userId, payload)               every device of a user
//   broadcastPush(payload)                        every subscribed device
//
// Subscriptions answered 404 / 410 (expired, unsubscribed) are deleted.
// Without VAPID keys every helper is a silent no-op (push is optional).
import webpush, { WebPushError, type PushSubscription as WebPushSubscription } from 'web-push';
import type { PushSubscription } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { log } from '@/lib/server/observability/log';

/** What the service worker (public/sw.js) displays. */
export interface PushPayload {
  title: string;
  body: string;
  /** Relative URL opened on click (same origin), e.g. /dashboard?tab=kanban. */
  url?: string;
  icon?: string;
  /** Notifications sharing a tag replace each other (e.g. one per order). */
  tag?: string;
}

export interface PushReport {
  sent: number;
  failed: number;
  /** Expired subscriptions removed during the send. */
  removed: number;
}

let configured: boolean | null = null;
export function isPushConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'https://www.juula.store';
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

const DEFAULT_ICON = '/icons/icon-192.png';
const BADGE = '/icons/badge-72.png';
const TTL_SECONDS = 24 * 3600;

function toWebPush(s: PushSubscription): WebPushSubscription {
  return { endpoint: s.endpoint, keys: { p256dh: s.keysP256dh, auth: s.keysAuth } };
}

/** Sanitised payload: same-origin relative URL only, bounded texts. */
function serialise(p: PushPayload): string {
  const url = p.url && p.url.startsWith('/') && !p.url.startsWith('//') ? p.url : '/dashboard';
  return JSON.stringify({
    title: p.title.slice(0, 120),
    body: p.body.slice(0, 400),
    url,
    icon: p.icon ?? DEFAULT_ICON,
    badge: BADGE,
    ...(p.tag ? { tag: p.tag.slice(0, 64) } : {}),
  });
}

/**
 * Sends one notification. Returns 'sent', 'removed' (subscription expired and
 * deleted) or 'failed'. Never throws.
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload,
): Promise<'sent' | 'removed' | 'failed'> {
  if (!isPushConfigured()) return 'failed';
  try {
    await webpush.sendNotification(toWebPush(subscription), serialise(payload), {
      TTL: TTL_SECONDS,
      urgency: 'high',
    });
    await prisma.pushSubscription
      .update({ where: { id: subscription.id }, data: { lastSentAt: new Date(), failures: 0 } })
      .catch(() => undefined);
    return 'sent';
  } catch (err) {
    const status = err instanceof WebPushError ? err.statusCode : 0;
    if (status === 404 || status === 410) {
      await prisma.pushSubscription
        .delete({ where: { id: subscription.id } })
        .catch(() => undefined);
      return 'removed';
    }
    // Other errors (network, 429, 5xx): keep it, but drop after 10 failures in a row.
    const updated = await prisma.pushSubscription
      .update({ where: { id: subscription.id }, data: { failures: { increment: 1 } } })
      .catch(() => null);
    if (updated && updated.failures >= 10) {
      await prisma.pushSubscription
        .delete({ where: { id: subscription.id } })
        .catch(() => undefined);
    }
    log.warn('push.send_failed', {
      status,
      error: err instanceof Error ? err.message : String(err),
    });
    return 'failed';
  }
}

async function sendMany(subs: PushSubscription[], payload: PushPayload): Promise<PushReport> {
  const report: PushReport = { sent: 0, failed: 0, removed: 0 };
  const BATCH = 50; // concurrent requests per batch
  for (let i = 0; i < subs.length; i += BATCH) {
    const results = await Promise.all(
      subs.slice(i, i + BATCH).map((s) => sendPushNotification(s, payload)),
    );
    for (const r of results)
      report[r === 'sent' ? 'sent' : r === 'removed' ? 'removed' : 'failed']++;
  }
  return report;
}

/** Every device of a user. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushReport> {
  if (!isPushConfigured()) return { sent: 0, failed: 0, removed: 0 };
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  return sendMany(subs, payload);
}

/** Every subscribed device, page by page (broadcast). */
export async function broadcastPush(payload: PushPayload): Promise<PushReport> {
  const total: PushReport = { sent: 0, failed: 0, removed: 0 };
  if (!isPushConfigured()) return total;
  let cursor: string | undefined;
  for (;;) {
    const page = await prisma.pushSubscription.findMany({
      take: 500,
      orderBy: { id: 'asc' },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (page.length === 0) break;
    const r = await sendMany(page, payload);
    total.sent += r.sent;
    total.failed += r.failed;
    total.removed += r.removed;
    cursor = page[page.length - 1]!.id;
    if (page.length < 500) break;
  }
  return total;
}

/** « Nouvelle commande » for the merchant (called right after an order is created). */
export async function pushNewOrder(orderId: string): Promise<void> {
  if (!isPushConfigured()) return;
  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    select: {
      merchantId: true,
      reference: true,
      customerName: true,
      totalAmount: true,
      productName: true,
    },
  });
  if (!order) return;
  const amount = `${order.totalAmount.toLocaleString('fr-FR').replace(/\s/g, ' ')} FCFA`;
  await sendPushToUser(order.merchantId, {
    title: `Nouvelle commande ${order.reference} reçue !`,
    body: `${order.customerName} · ${amount} · ${order.productName}`,
    url: `/dashboard?commande=${encodeURIComponent(order.reference)}`,
    tag: `order-${order.reference}`,
  });
}

/** « Paiement reçu » for the merchant (online payment confirmed). */
export async function pushPaymentReceived(orderId: string): Promise<void> {
  if (!isPushConfigured()) return;
  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    select: { merchantId: true, reference: true, totalAmount: true, customerName: true },
  });
  if (!order) return;
  const amount = `${order.totalAmount.toLocaleString('fr-FR').replace(/\s/g, ' ')} FCFA`;
  await sendPushToUser(order.merchantId, {
    title: `Paiement reçu · ${order.reference}`,
    body: `${amount} payés en ligne par ${order.customerName}.`,
    url: '/dashboard?tab=wallet',
    tag: `paid-${order.reference}`,
  });
}
