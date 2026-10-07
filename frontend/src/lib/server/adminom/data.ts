import 'server-only';
// Figures and lists of the /adminom back-office.
import { invalidateStorefront } from '@/lib/server/store/public-cache';
import type { Prisma, StoreSubscription } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { isStorePro, PRO_PLAN_PRICE_FCFA } from '@/lib/store/plans';
import { promoStatus, promoLabel, type PromoType } from '@/lib/store/marketing';
import { partnerStatus } from '@/lib/store/partners';
import { balancesOf } from './moderation';

export const PERIODS = [7, 30, 90] as const;
export type AdminPeriod = (typeof PERIODS)[number];
export type SubStatus = 'paid' | 'pending' | 'failed' | 'abandoned' | 'manual';
export type SubFilter = 'all' | 'paid' | 'pending' | 'failed' | 'abandoned';

const DAY = 86_400_000;
/** A checkout still unpaid after 1 h is considered abandoned. */
const ABANDON_AFTER_MS = 3600_000;

/** Moneriz commission on subscription payments (MONERIZ_FEE_PERCENT, default 5 %). */
export function monerizFeePercent(): number {
  const raw = process.env.MONERIZ_FEE_PERCENT?.trim();
  const v = raw ? Number(raw.replace(',', '.')) : NaN;
  return Number.isFinite(v) && v >= 0 && v < 100 ? v : 5;
}
const fee = (gross: number) => Math.round((gross * monerizFeePercent()) / 100);

export function subStatus(
  s: Pick<StoreSubscription, 'status' | 'source' | 'createdAt'>,
  now = Date.now(),
): SubStatus {
  if (s.source === 'manual') return 'manual';
  if (s.status === 'active' || s.status === 'expired') return 'paid';
  if (s.status === 'failed') return 'failed';
  return now - s.createdAt.getTime() > ABANDON_AFTER_MS ? 'abandoned' : 'pending';
}

const paidWhere: Prisma.StoreSubscriptionWhereInput = {
  source: 'moneriz',
  status: { in: ['active', 'expired'] },
};
const paidAt = (s: Pick<StoreSubscription, 'startsAt' | 'createdAt'>) => s.startsAt ?? s.createdAt;

function monthBounds(now = new Date()) {
  const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return { thisMonth, lastMonth };
}

/** Daily totals over the period (Dakar = UTC). */
function dailySeries(points: { at: Date; value: number }[], period: number) {
  const today = new Date();
  const start =
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - (period - 1) * DAY;
  const series = Array.from({ length: period }, (_, i) => ({
    day: new Date(start + i * DAY).toISOString().slice(0, 10),
    value: 0,
  }));
  for (const p of points) {
    const i = Math.floor((p.at.getTime() - start) / DAY);
    if (i >= 0 && i < period) series[i]!.value += p.value;
  }
  return series;
}

// ─────────────────────────────────────────────────────────────────────────
// Abonnements
// ─────────────────────────────────────────────────────────────────────────
export async function subscriptionsView(period: AdminPeriod, filter: SubFilter) {
  const now = new Date();
  const since = new Date(now.getTime() - period * DAY);
  const { thisMonth, lastMonth } = monthBounds(now);

  const [paid, pendingAgg, activeStores, expiring, recent] = await Promise.all([
    prisma.storeSubscription.findMany({
      where: paidWhere,
      select: { amount: true, startsAt: true, createdAt: true },
    }),
    prisma.storeSubscription.aggregate({
      where: { source: 'moneriz', status: 'pending' },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.store.count({ where: { plan: 'PRO', planExpiresAt: { gt: now } } }),
    prisma.store.findMany({
      where: { plan: 'PRO', planExpiresAt: { gt: now, lte: new Date(now.getTime() + 7 * DAY) } },
      orderBy: { planExpiresAt: 'asc' },
      select: {
        id: true,
        name: true,
        subdomain: true,
        whatsapp: true,
        planExpiresAt: true,
        user: { select: { email: true, name: true } },
      },
    }),
    prisma.storeSubscription.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
  ]);

  const gross = paid.reduce((s, p) => s + p.amount, 0);
  const sumSince = (from: Date, to?: Date) =>
    paid
      .filter((p) => paidAt(p) >= from && (!to || paidAt(p) < to))
      .reduce((s, p) => s + p.amount, 0);
  const grossThisMonth = sumSince(thisMonth);
  const grossLastMonth = sumSince(lastMonth, thisMonth);
  const periodPaid = paid.filter((p) => paidAt(p) >= since);
  const mrr = activeStores * PRO_PLAN_PRICE_FCFA;

  const storeIds = [...new Set(recent.map((r) => r.storeId))];
  const stores = await prisma.store.findMany({
    where: { id: { in: storeIds } },
    select: { id: true, name: true, subdomain: true, user: { select: { email: true } } },
  });
  const storeById = new Map(stores.map((s) => [s.id, s]));
  const list = recent
    .map((r) => ({ r, status: subStatus(r, now.getTime()) }))
    .filter(({ status }) => filter === 'all' || status === filter)
    .map(({ r, status }) => {
      const st = storeById.get(r.storeId);
      return {
        id: r.id,
        storeName: st?.name ?? st?.subdomain ?? 'Boutique supprimée',
        subdomain: st?.subdomain ?? null,
        email: st?.user.email ?? '',
        amount: r.amount,
        status,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt?.toISOString() ?? null,
      };
    });

  return {
    feePercent: monerizFeePercent(),
    net: {
      total: gross - fee(gross),
      gross,
      fees: fee(gross),
      thisMonth: grossThisMonth - fee(grossThisMonth),
      lastMonth: grossLastMonth - fee(grossLastMonth),
    },
    fees: { total: fee(gross), thisMonth: fee(grossThisMonth), ifAllRenew: fee(mrr) },
    kpis: {
      totalGross: gross,
      paymentsCount: paid.length,
      thisMonth: grossThisMonth,
      lastMonth: grossLastMonth,
      mrr,
      activeStores,
      pendingCount: pendingAgg._count._all,
      pendingAmount: pendingAgg._sum.amount ?? 0,
    },
    chart: {
      total: periodPaid.reduce((s, p) => s + p.amount, 0),
      count: periodPaid.length,
      series: dailySeries(
        periodPaid.map((p) => ({ at: paidAt(p), value: p.amount })),
        period,
      ),
    },
    expiring: expiring.map((s) => ({
      id: s.id,
      name: s.name ?? s.subdomain ?? '—',
      subdomain: s.subdomain,
      whatsapp: s.whatsapp,
      ownerName: s.user.name,
      email: s.user.email,
      daysLeft: Math.max(0, Math.ceil((s.planExpiresAt!.getTime() - now.getTime()) / DAY)),
      expiresAt: s.planExpiresAt!.toISOString(),
    })),
    list,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Tableau de bord
// ─────────────────────────────────────────────────────────────────────────
export async function overviewView(period: AdminPeriod) {
  const now = new Date();
  const since = new Date(now.getTime() - period * DAY);
  const actor = 'adminom@system.juula.store';
  const [merchants, newMerchants, stores, liveStores, orders, subs] = await Promise.all([
    prisma.user.count({ where: { store: { isNot: null }, email: { not: actor } } }),
    prisma.user.count({ where: { store: { isNot: null }, createdAt: { gte: since } } }),
    prisma.store.count(),
    prisma.store.count({
      where: {
        storefrontPublished: true,
        plan: 'PRO',
        OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }],
      },
    }),
    prisma.storeOrder.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, totalAmount: true, status: true, paymentStatus: true },
    }),
    prisma.storeSubscription.findMany({
      where: {
        ...paidWhere,
        OR: [{ startsAt: { gte: since } }, { startsAt: null, createdAt: { gte: since } }],
      },
      select: { amount: true },
    }),
  ]);
  const valid = orders.filter((o) => o.status !== 'cancelled');
  const delivered = orders.filter((o) => o.status === 'delivered').length;
  return {
    merchants,
    newMerchants,
    stores,
    liveStores,
    orders: orders.length,
    gmv: valid.reduce((s, o) => s + o.totalAmount, 0),
    deliveredRate: orders.length ? Math.round((delivered / orders.length) * 100) : 0,
    paidOnline: orders.filter((o) => o.paymentStatus === 'paid').length,
    subscriptionRevenue: subs.reduce((s, x) => s + x.amount, 0),
    series: dailySeries(
      valid.map((o) => ({ at: o.createdAt, value: o.totalAmount })),
      period,
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Marchands / Boutiques
// ─────────────────────────────────────────────────────────────────────────
function storeSearch(q: string): Prisma.StoreWhereInput {
  const t = q.trim();
  if (!t) return {};
  return {
    OR: [
      { name: { contains: t, mode: 'insensitive' } },
      { subdomain: { contains: t.toLowerCase() } },
      { user: { email: { contains: t, mode: 'insensitive' } } },
      { user: { name: { contains: t, mode: 'insensitive' } } },
    ],
  };
}

export async function merchantsView(q: string, take = 100) {
  const stores = await prisma.store.findMany({
    where: storeSearch(q),
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      name: true,
      subdomain: true,
      plan: true,
      planExpiresAt: true,
      storefrontPublished: true,
      whatsapp: true,
      logoUrl: true,
      suspendedAt: true,
      suspendedReason: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          role: true,
          createdAt: true,
          _count: { select: { products: true, storeOrders: true } },
        },
      },
    },
  });
  return stores.map((s) => ({
    userId: s.user.id,
    email: s.user.email,
    name: s.user.name,
    joinedAt: s.user.createdAt.toISOString(),
    storeId: s.id,
    storeName: s.name ?? s.subdomain ?? '—',
    subdomain: s.subdomain,
    whatsapp: s.whatsapp,
    logoUrl: s.logoUrl,
    accountStatus: s.user.status as 'ACTIVE' | 'SUSPENDED',
    isAdmin: s.user.role !== 'USER',
    suspended: Boolean(s.suspendedAt),
    suspendedReason: s.suspendedReason,
    pro: isStorePro(s),
    planExpiresAt: s.planExpiresAt?.toISOString() ?? null,
    published: s.storefrontPublished,
    products: s.user._count.products,
    orders: s.user._count.storeOrders,
  }));
}

export async function storesView(q: string) {
  const list = await merchantsView(q, 200);
  const sums = await prisma.storeOrder.groupBy({
    by: ['merchantId'],
    where: { merchantId: { in: list.map((m) => m.userId) }, status: { not: 'cancelled' } },
    _sum: { totalAmount: true },
  });
  const gmv = new Map(sums.map((s) => [s.merchantId, s._sum.totalAmount ?? 0]));
  const balances = await balancesOf(list.map((m) => m.userId));
  return list.map((m) => ({
    ...m,
    online: m.published && m.pro && !m.suspended,
    gmv: gmv.get(m.userId) ?? 0,
    balance: balances.get(m.userId) ?? 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────
// Commandes
// ─────────────────────────────────────────────────────────────────────────
export async function ordersView(period: AdminPeriod, status: string, q: string) {
  const since = new Date(Date.now() - period * DAY);
  const where: Prisma.StoreOrderWhereInput = {
    createdAt: { gte: since },
    ...(status !== 'all' ? { status } : {}),
    ...(q.trim()
      ? {
          OR: [
            { reference: { contains: q.trim(), mode: 'insensitive' } },
            { productName: { contains: q.trim(), mode: 'insensitive' } },
            { merchant: { store: { name: { contains: q.trim(), mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };
  const [rows, agg] = await Promise.all([
    prisma.storeOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        reference: true,
        productName: true,
        totalAmount: true,
        status: true,
        paymentType: true,
        paymentStatus: true,
        createdAt: true,
        merchant: { select: { store: { select: { name: true, subdomain: true } } } },
      },
    }),
    prisma.storeOrder.aggregate({ where, _count: { _all: true }, _sum: { totalAmount: true } }),
  ]);
  return {
    count: agg._count._all,
    total: agg._sum.totalAmount ?? 0,
    orders: rows.map((o) => ({
      id: o.id,
      reference: o.reference,
      product: o.productName,
      total: o.totalAmount,
      status: o.status,
      paymentType: o.paymentType,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
      store: o.merchant.store?.name ?? o.merchant.store?.subdomain ?? '—',
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Marketing (all shops)
// ─────────────────────────────────────────────────────────────────────────
export async function marketingView() {
  const [codes, partners] = await Promise.all([
    prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { merchant: { select: { store: { select: { name: true, subdomain: true } } } } },
    }),
    prisma.partner.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        merchant: { select: { store: { select: { name: true, subdomain: true } } } },
        _count: { select: { visits: true, orders: true } },
      },
    }),
  ]);
  return {
    codes: codes.map((c) => ({
      id: c.id,
      code: c.code,
      label: promoLabel({ type: c.type as PromoType, value: c.value }),
      used: c.usedCount,
      maxUses: c.maxUses,
      status: promoStatus({
        active: c.active,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        maxUses: c.maxUses,
        usedCount: c.usedCount,
      }),
      store: c.merchant.store?.name ?? c.merchant.store?.subdomain ?? '—',
    })),
    partners: partners.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: partnerStatus({
        startsAt: p.startsAt?.toISOString() ?? null,
        expiresAt: p.expiresAt.toISOString(),
        suspended: p.suspended,
      }),
      clicks: p._count.visits,
      orders: p._count.orders,
      store: p.merchant.store?.name ?? p.merchant.store?.subdomain ?? '—',
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Accès PRO manuel
// ─────────────────────────────────────────────────────────────────────────
export const GRANT_DURATIONS = [
  '7d',
  '14d',
  '30d',
  '90d',
  '180d',
  '365d',
  'lifetime',
  'custom',
] as const;
export type GrantDuration = (typeof GRANT_DURATIONS)[number];
const DAYS: Record<Exclude<GrantDuration, 'lifetime' | 'custom'>, number> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90,
  '180d': 180,
  '365d': 365,
};

export type GrantResult =
  | { ok: true; storeName: string; expiresAt: string | null }
  | { ok: false; status: number; message: string };

export async function grantPro(
  input: { userId: string; duration: GrantDuration; until?: string | null; note: string },
  meta: { actorId: string; ip?: string; userAgent?: string },
): Promise<GrantResult> {
  const store = await prisma.store.findUnique({ where: { userId: input.userId } });
  if (!store) return { ok: false, status: 404, message: 'Ce compte n’a pas encore de boutique.' };
  const now = new Date();
  let expiresAt: Date | null;
  if (input.duration === 'lifetime') {
    expiresAt = null;
  } else if (input.duration === 'custom') {
    const d = input.until ? new Date(input.until) : null;
    if (!d || Number.isNaN(d.getTime()) || d <= now) {
      return { ok: false, status: 400, message: 'Choisissez une date de fin dans le futur.' };
    }
    expiresAt = d;
  } else {
    // Added on top of a running subscription (nothing is lost).
    const base =
      store.plan === 'PRO' && store.planExpiresAt && store.planExpiresAt > now
        ? store.planExpiresAt
        : now;
    expiresAt = new Date(base.getTime() + DAYS[input.duration] * DAY);
  }
  const previous = { plan: store.plan, planExpiresAt: store.planExpiresAt?.toISOString() ?? null };
  await prisma.$transaction(async (tx) => {
    await tx.store.update({
      where: { id: store.id },
      data: { plan: 'PRO', planExpiresAt: expiresAt },
    });
    const sub = await tx.storeSubscription.create({
      data: {
        storeId: store.id,
        userId: input.userId,
        plan: 'PRO',
        amount: 0,
        status: 'active',
        source: 'manual',
        note: input.note.trim() || null,
        startsAt: now,
        expiresAt,
      },
    });
    await logAdminAction(tx, {
      actorId: meta.actorId,
      action: 'store.grant_pro',
      targetType: 'Store',
      targetId: store.id,
      metadata: {
        duration: input.duration,
        expiresAt: expiresAt?.toISOString() ?? null,
        note: input.note.trim(),
        subscriptionId: sub.id,
        previous,
      },
      ...(meta.ip ? { ip: meta.ip } : {}),
      ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    });
  });
  invalidateStorefront({ userId: input.userId });
  return {
    ok: true,
    storeName: store.name ?? store.subdomain ?? '',
    expiresAt: expiresAt?.toISOString() ?? null,
  };
}
