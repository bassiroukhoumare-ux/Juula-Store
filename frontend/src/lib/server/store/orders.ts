// StoreOrder helpers: row → dashboard OrderLead, per-merchant numbering,
// and a small per-IP limiter for the public (unauthenticated) order route.
import 'server-only';
import type { NextRequest } from 'next/server';
import type { Prisma, StoreOrder } from '@prisma/client';
import { redis } from '@/lib/server/redis';
import {
  MemoryRateLimitStore,
  RedisRateLimitStore,
  type RateLimitStore,
} from '@/lib/server/rate-limit-store';
import type { OrderLead, OrderStatus, PaymentStatus, PaymentType } from '@/types/juula';

const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Dakar',
});

export function toOrderLead(order: StoreOrder): OrderLead {
  return {
    id: order.reference,
    sequenceNumber: order.number,
    customerName: order.customerName,
    phone: order.phone,
    whatsappNumber: order.whatsappNumber,
    neighborhood: order.neighborhood ?? '',
    city: order.city ?? '',
    productName: order.productName,
    ...(order.productId ? { productId: order.productId } : {}),
    ...(order.productImage ? { productImage: order.productImage } : {}),
    amount: order.amount,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    currency: order.currency,
    status: order.status as OrderStatus,
    createdAt: dateTimeFmt.format(order.createdAt),
    createdAtIso: order.createdAt.toISOString(),
    deliveryNotes: order.deliveryNotes ?? undefined,
    deliveryAddress: order.deliveryAddress ?? undefined,
    quantity: order.quantity,
    selectedColor: order.selectedColor ?? undefined,
    paymentType: order.paymentType as PaymentType,
    paymentStatus: order.paymentStatus as PaymentStatus,
  };
}

/**
 * Allocate the merchant's next order number inside `tx`. The Store row is
 * created lazily; the increment is a single atomic UPDATE so concurrent
 * orders never get the same number (the @@unique([merchantId, number])
 * index is the backstop).
 */
export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  merchantId: string,
): Promise<number> {
  const store = await tx.store.upsert({
    where: { userId: merchantId },
    create: { userId: merchantId, orderCounter: 1 },
    update: { orderCounter: { increment: 1 } },
    select: { orderCounter: true },
  });
  return store.orderCounter;
}

// Public order route limiter: 10 orders / 10 min per IP. Redis when
// configured; otherwise a per-instance in-memory bucket (best effort).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ORDERS_PER_WINDOW = 10;
let limiter: RateLimitStore | null = null;

function getLimiter(): RateLimitStore {
  if (!limiter) {
    limiter = redis
      ? new RedisRateLimitStore({ redis, prefix: 'rl:public-order:', windowMs: WINDOW_MS })
      : new MemoryRateLimitStore({ windowMs: WINDOW_MS });
  }
  return limiter;
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** Returns seconds to wait when the IP is over the limit, null otherwise. */
export async function publicOrderRateLimit(req: NextRequest): Promise<number | null> {
  const { totalHits, resetTime } = await getLimiter().increment(clientIp(req));
  if (totalHits <= MAX_ORDERS_PER_WINDOW) return null;
  return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
}
