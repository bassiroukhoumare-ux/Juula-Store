import 'server-only';
// First-party analytics of public product pages: views, order-form opens,
// visitors' countries and traffic sources, and abandoned checkouts.
//
// Events are written by the unauthenticated /api/public/products/[slug]/events
// route (rate-limited per IP) and read by the merchant through
// /api/store/analytics — always scoped to the merchant's own products.
import type { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import {
  MemoryRateLimitStore,
  RedisRateLimitStore,
  type RateLimitStore,
} from '@/lib/server/rate-limit-store';
import { countryLabel, isCountryCode, sourceLabel } from '@/lib/store/traffic-source';
import { productConfig } from '@/lib/server/store/products';
import type { ProductStats, StoreAnalytics } from '@/lib/store/analytics-types';

export type { ProductStats, StoreAnalytics };

// ---------------------------------------------------------------- writes

const WINDOW_MS = 60 * 1000;
const MAX_EVENTS_PER_WINDOW = 60;
let limiter: RateLimitStore | null = null;

function getLimiter(): RateLimitStore {
  if (!limiter) {
    limiter = redis
      ? new RedisRateLimitStore({ redis, prefix: 'rl:product-event:', windowMs: WINDOW_MS })
      : new MemoryRateLimitStore({ windowMs: WINDOW_MS });
  }
  return limiter;
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** True when this IP sent too many analytics events in the last minute. */
export async function isEventRateLimited(req: NextRequest): Promise<boolean> {
  const { totalHits } = await getLimiter().increment(clientIp(req));
  return totalHits > MAX_EVENTS_PER_WINDOW;
}

/** Visitor's country from the hosting edge (Vercel), when available. */
export function requestCountry(req: NextRequest): string | null {
  const raw = req.headers.get('x-vercel-ip-country')?.toUpperCase() ?? null;
  return isCountryCode(raw) ? raw : null;
}

/** Published product id for a public slug, or null. */
export async function publishedProductId(slug: string): Promise<string | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
  return product && product.status === 'published' ? product.id : null;
}

export async function recordProductEvent(input: {
  productId: string;
  type: 'view' | 'checkout_open';
  visitorId: string;
  source: string;
  referrer: string | null;
  country: string | null;
}): Promise<void> {
  await prisma.productEvent.create({ data: input });
}

export async function saveCheckoutDraft(input: {
  productId: string;
  visitorId: string;
  customerName: string | null;
  phone: string | null;
  address: string | null;
  quantity: number;
  country: string | null;
}): Promise<void> {
  const { productId, visitorId, ...fields } = input;
  await prisma.checkoutDraft.upsert({
    where: { productId_visitorId: { productId, visitorId } },
    create: { productId, visitorId, ...fields },
    update: fields,
  });
}

/** The order went through: it is no longer an abandoned checkout. */
export async function clearCheckoutDraft(productId: string, visitorId: string): Promise<void> {
  await prisma.checkoutDraft.deleteMany({ where: { productId, visitorId } });
}

// ----------------------------------------------------------------- reads

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

export async function getStoreAnalytics(
  userId: string,
  range: { from: Date; to: Date; productId?: string | undefined },
): Promise<StoreAnalytics> {
  const products = await prisma.product.findMany({
    where: { userId, ...(range.productId ? { id: range.productId } : {}) },
    orderBy: { updatedAt: 'desc' },
  });
  const ids = products.map((p) => p.id);
  const empty: StoreAnalytics = {
    totals: {
      views: 0,
      visitors: 0,
      checkoutOpens: 0,
      orders: 0,
      revenue: 0,
      conversionRate: 0,
      abandoned: 0,
    },
    products: [],
    countries: [],
    sources: [],
    abandoned: [],
  };
  if (ids.length === 0) return empty;

  const window = Prisma.sql`"productId" IN (${Prisma.join(ids)}) AND "createdAt" >= ${range.from} AND "createdAt" < ${range.to}`;

  const [eventRows, totalRows, countryRows, sourceRows, orderRows, draftCounts, drafts] =
    await Promise.all([
      prisma.$queryRaw<{ productId: string; type: string; total: number; visitors: number }[]>`
        SELECT "productId", "type", COUNT(*)::int AS total, COUNT(DISTINCT "visitorId")::int AS visitors
        FROM "ProductEvent" WHERE ${window} GROUP BY 1, 2`,
      prisma.$queryRaw<{ visitors: number }[]>`
        SELECT COUNT(DISTINCT "visitorId")::int AS visitors
        FROM "ProductEvent" WHERE ${window} AND "type" = 'view'`,
      prisma.$queryRaw<{ country: string | null; visitors: number }[]>`
        SELECT "country", COUNT(DISTINCT "visitorId")::int AS visitors
        FROM "ProductEvent" WHERE ${window} AND "type" = 'view'
        GROUP BY 1 ORDER BY 2 DESC LIMIT 15`,
      prisma.$queryRaw<{ source: string; visitors: number }[]>`
        SELECT "source", COUNT(DISTINCT "visitorId")::int AS visitors
        FROM "ProductEvent" WHERE ${window} AND "type" = 'view'
        GROUP BY 1 ORDER BY 2 DESC LIMIT 15`,
      prisma.storeOrder.groupBy({
        by: ['productId'],
        where: {
          merchantId: userId,
          productId: { in: ids },
          createdAt: { gte: range.from, lt: range.to },
          status: { not: 'cancelled' },
        },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      prisma.checkoutDraft.groupBy({
        by: ['productId'],
        where: {
          productId: { in: ids },
          updatedAt: { gte: range.from, lt: range.to },
          phone: { not: null },
        },
        _count: { _all: true },
      }),
      prisma.checkoutDraft.findMany({
        where: {
          productId: { in: ids },
          updatedAt: { gte: range.from, lt: range.to },
          phone: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
    ]);

  const names = new Map<string, string>();
  const productStats: ProductStats[] = products.map((p) => {
    const config = productConfig(p);
    const name = config.productTitle || p.internalName;
    names.set(p.id, name);
    const ev = (type: string) => eventRows.find((r) => r.productId === p.id && r.type === type);
    const order = orderRows.find((r) => r.productId === p.id);
    const visitors = ev('view')?.visitors ?? 0;
    const orders = order?._count._all ?? 0;
    return {
      id: p.id,
      name,
      status: p.status,
      image: config.mediaItems?.find((m) => m.type === 'image')?.url ?? null,
      views: ev('view')?.total ?? 0,
      visitors,
      checkoutOpens: ev('checkout_open')?.visitors ?? 0,
      orders,
      revenue: order?._sum.totalAmount ?? 0,
      conversionRate: pct(orders, visitors),
      abandoned: draftCounts.find((d) => d.productId === p.id)?._count._all ?? 0,
    };
  });

  const sum = (k: keyof ProductStats) =>
    productStats.reduce((s, p) => s + (typeof p[k] === 'number' ? (p[k] as number) : 0), 0);
  const visitors = totalRows[0]?.visitors ?? 0;
  const orders = sum('orders');

  return {
    totals: {
      views: sum('views'),
      visitors,
      checkoutOpens: sum('checkoutOpens'),
      orders,
      revenue: sum('revenue'),
      conversionRate: pct(orders, visitors),
      abandoned: sum('abandoned'),
    },
    products: productStats,
    countries: countryRows.map((r) => ({
      code: r.country,
      label: countryLabel(r.country),
      visitors: r.visitors,
    })),
    sources: sourceRows.map((r) => ({
      source: r.source,
      label: sourceLabel(r.source),
      visitors: r.visitors,
    })),
    abandoned: drafts.map((d) => ({
      id: d.id,
      productId: d.productId,
      productName: names.get(d.productId) ?? '',
      customerName: d.customerName,
      phone: d.phone,
      address: d.address,
      quantity: d.quantity,
      country: d.country,
      updatedAt: d.updatedAt.toISOString(),
    })),
  };
}
