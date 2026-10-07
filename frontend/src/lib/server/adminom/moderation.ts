import 'server-only';
// /adminom super-administration: product moderation, shop / account
// sanctions, escrow (frozen payments) and dispute resolution. Every write is
// recorded in the audit log (AdminAction) inside the same transaction.
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { lockUserTx } from '@/lib/server/withdrawals/lock';
import { RESERVING_WITHDRAWAL_STATUSES } from '@/lib/server/store/payments';
import { createMonerizWithdrawal, MonerizApiError } from '@/lib/server/payments/moneriz';
import { log } from '@/lib/server/observability/log';
import { storeProductUrl } from '@/lib/store/subdomain';
import type { AdminPeriod } from './data';

export interface AdminMeta {
  actorId: string;
  ip?: string;
  userAgent?: string;
}
export type ModResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; status: number; message: string };

const DAY = 86_400_000;
const fail = (status: number, message: string) => ({ ok: false as const, status, message });
const audit = (
  tx: Prisma.TransactionClient,
  meta: AdminMeta,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown>,
) =>
  logAdminAction(tx, {
    actorId: meta.actorId,
    action,
    targetType,
    targetId,
    metadata,
    ...(meta.ip ? { ip: meta.ip } : {}),
    ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
  });
const clean = (s: string | null | undefined) => (s ?? '').trim() || null;

// ─────────────────────────────────────────────────────────────────────────
// Produits
// ─────────────────────────────────────────────────────────────────────────
export type ProductFilter = 'all' | 'published' | 'draft' | 'disabled';

function mediaOf(config: Prisma.JsonValue): { title: string | null; images: string[] } {
  const c = (config ?? {}) as { productTitle?: unknown; mediaItems?: unknown };
  const items = Array.isArray(c.mediaItems)
    ? (c.mediaItems as { type?: string; url?: string; isPrimary?: boolean }[])
    : [];
  const images = items
    .filter((m) => m && m.type !== 'video' && typeof m.url === 'string')
    .sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)))
    .map((m) => m.url as string);
  return { title: typeof c.productTitle === 'string' ? c.productTitle : null, images };
}

export async function productsView(q: string, filter: ProductFilter) {
  const t = q.trim();
  const where: Prisma.ProductWhereInput = {
    ...(filter === 'disabled'
      ? { adminDisabledAt: { not: null } }
      : filter === 'published'
        ? { status: 'published', adminDisabledAt: null }
        : filter === 'draft'
          ? { status: { in: ['draft', 'inactive'] }, adminDisabledAt: null }
          : {}),
    ...(t
      ? {
          OR: [
            { internalName: { contains: t, mode: 'insensitive' } },
            { slug: { contains: t.toLowerCase() } },
            { user: { email: { contains: t, mode: 'insensitive' } } },
            { user: { store: { name: { contains: t, mode: 'insensitive' } } } },
            { user: { store: { subdomain: { contains: t.toLowerCase() } } } },
          ],
        }
      : {}),
  };
  const rows = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 120,
    select: {
      id: true,
      slug: true,
      internalName: true,
      status: true,
      price: true,
      config: true,
      createdAt: true,
      adminDisabledAt: true,
      adminDisabledReason: true,
      user: {
        select: { id: true, email: true, store: { select: { name: true, subdomain: true } } },
      },
    },
  });
  const sales = rows.length
    ? await prisma.storeOrder.groupBy({
        by: ['productId'],
        where: { productId: { in: rows.map((r) => r.id) }, status: { not: 'cancelled' } },
        _count: { _all: true },
      })
    : [];
  const salesOf = new Map(sales.map((s) => [s.productId, s._count._all]));
  return {
    products: rows.map((p) => {
      const media = mediaOf(p.config);
      const sub = p.user.store?.subdomain ?? null;
      return {
        id: p.id,
        title: media.title || p.internalName,
        price: p.price,
        status: p.adminDisabledAt ? 'disabled' : p.status === 'published' ? 'published' : 'draft',
        disabledReason: p.adminDisabledReason,
        image: media.images[0] ?? null,
        gallery: media.images.slice(0, 8),
        store: p.user.store?.name ?? sub ?? p.user.email,
        merchantEmail: p.user.email,
        url: sub ? storeProductUrl(sub, p.slug) : `/p/${p.slug}`,
        sales: salesOf.get(p.id) ?? 0,
        createdAt: p.createdAt.toISOString(),
      };
    }),
  };
}

export async function setProductDisabled(
  productId: string,
  disabled: boolean,
  reason: string,
  meta: AdminMeta,
): Promise<ModResult> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return fail(404, 'Produit introuvable.');
  if (disabled && !clean(reason)) return fail(400, 'Indiquez le motif (visible par le vendeur).');
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: disabled
        ? { status: 'inactive', adminDisabledAt: new Date(), adminDisabledReason: clean(reason) }
        : // Back online as it was published before the sanction.
          { status: 'published', adminDisabledAt: null, adminDisabledReason: null },
    });
    await audit(tx, meta, disabled ? 'product.disable' : 'product.enable', 'Product', productId, {
      reason: clean(reason),
      slug: product.slug,
      merchantId: product.userId,
      previousStatus: product.status,
    });
  });
  return { ok: true };
}

export async function deleteProduct(
  productId: string,
  reason: string,
  meta: AdminMeta,
): Promise<ModResult> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return fail(404, 'Produit introuvable.');
  await prisma.$transaction(async (tx) => {
    await audit(tx, meta, 'product.delete', 'Product', productId, {
      reason: clean(reason),
      slug: product.slug,
      name: product.internalName,
      merchantId: product.userId,
    });
    // Past orders keep their snapshot (productId is set to null).
    await tx.product.delete({ where: { id: productId } });
  });
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Boutiques & comptes
// ─────────────────────────────────────────────────────────────────────────
export async function setStoreSuspended(
  storeId: string,
  suspended: boolean,
  reason: string,
  meta: AdminMeta,
): Promise<ModResult> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return fail(404, 'Boutique introuvable.');
  await prisma.$transaction(async (tx) => {
    await tx.store.update({
      where: { id: storeId },
      data: suspended
        ? { suspendedAt: new Date(), suspendedReason: clean(reason) }
        : { suspendedAt: null, suspendedReason: null },
    });
    await audit(tx, meta, suspended ? 'store.suspend' : 'store.reopen', 'Store', storeId, {
      reason: clean(reason),
      subdomain: store.subdomain,
      merchantId: store.userId,
    });
  });
  return { ok: true };
}

/** Blocks sign-in at once: status SUSPENDED + tokenVersion bump (all sessions revoked). */
export async function setUserSuspended(
  userId: string,
  suspended: boolean,
  reason: string,
  meta: AdminMeta,
): Promise<ModResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail(404, 'Compte introuvable.');
  if (user.role !== 'USER') return fail(403, 'Les comptes administrateurs ne se gèrent pas ici.');
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: suspended
        ? { status: 'SUSPENDED', tokenVersion: { increment: 1 } }
        : { status: 'ACTIVE' },
    });
    await audit(tx, meta, suspended ? 'user.suspend' : 'user.restore', 'User', userId, {
      reason: clean(reason),
      email: user.email,
      from: user.status,
    });
  });
  return { ok: true };
}

/**
 * Full purge of a merchant (account, shop, products, orders…). Refused while
 * money is in motion: payout in progress or open dispute.
 */
export async function deleteMerchant(
  userId: string,
  confirmEmail: string,
  reason: string,
  meta: AdminMeta,
): Promise<ModResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { store: { select: { id: true, name: true, subdomain: true } } },
  });
  if (!user) return fail(404, 'Compte introuvable.');
  if (user.role !== 'USER')
    return fail(403, 'Les comptes administrateurs ne se suppriment pas ici.');
  if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return fail(400, 'Tapez exactement l’email du compte pour confirmer.');
  }
  const [inFlight, openDisputes, orgs] = await Promise.all([
    prisma.withdrawal.count({ where: { userId, status: { in: ['PENDING', 'PROCESSING'] } } }),
    prisma.storeOrder.count({ where: { merchantId: userId, isFrozen: true } }),
    prisma.organization.count({ where: { ownerId: userId } }),
  ]);
  if (inFlight > 0) return fail(409, 'Un retrait est en cours pour ce compte : attendez sa fin.');
  if (openDisputes > 0) {
    return fail(
      409,
      'Ce marchand a des litiges ouverts : clôturez-les avant de supprimer le compte.',
    );
  }
  if (orgs > 0) return fail(409, 'Ce compte possède une organisation : transférez-la d’abord.');

  await prisma.$transaction(async (tx) => {
    const [orders, withdrawals, products] = await Promise.all([
      tx.storeOrder.aggregate({
        where: { merchantId: userId },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      tx.withdrawal.aggregate({
        where: { userId },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      tx.product.count({ where: { userId } }),
    ]);
    // Archive of what is erased (kept in the audit log).
    await audit(tx, meta, 'user.delete', 'User', userId, {
      reason: clean(reason),
      email: user.email,
      name: user.name,
      store: user.store,
      products,
      orders: { count: orders._count._all, total: orders._sum.totalAmount ?? 0 },
      withdrawals: { count: withdrawals._count._all, total: withdrawals._sum.amount ?? 0 },
    });
    await tx.withdrawal.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });
  return { ok: true };
}

/** Withdrawable balance of many merchants at once (same formula as the wallet). */
export async function balancesOf(merchantIds: string[]): Promise<Map<string, number>> {
  if (merchantIds.length === 0) return new Map();
  const now = new Date();
  const [credits, debits] = await Promise.all([
    prisma.storeOrder.groupBy({
      by: ['merchantId'],
      where: {
        merchantId: { in: merchantIds },
        paymentStatus: 'paid',
        status: { not: 'cancelled' },
        isFrozen: false,
        availableAt: { lte: now },
      },
      _sum: { netAmount: true },
    }),
    prisma.withdrawal.groupBy({
      by: ['userId'],
      where: { userId: { in: merchantIds }, status: { in: RESERVING_WITHDRAWAL_STATUSES } },
      _sum: { amount: true },
    }),
  ]);
  const out = new Map<string, number>();
  const debit = new Map(debits.map((d) => [d.userId, d._sum.amount ?? 0]));
  for (const id of merchantIds) {
    const credit = credits.find((c) => c.merchantId === id)?._sum.netAmount ?? 0;
    out.set(id, Math.max(0, credit - (debit.get(id) ?? 0)));
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Litiges & séquestre
// ─────────────────────────────────────────────────────────────────────────
export type FinanceStatus =
  | 'maturing'
  | 'available'
  | 'withdrawn'
  | 'frozen'
  | 'refunding'
  | 'refunded';
export type DisputeFilter = 'all' | FinanceStatus | 'released';
const ONLINE = ['online_wave', 'online_orange'];

/**
 * Which matured credits have already been paid out: merchants' withdrawals
 * are allocated to their oldest available orders first (FIFO).
 */
async function withdrawnOrderIds(merchantIds: string[], now: Date): Promise<Set<string>> {
  if (merchantIds.length === 0) return new Set();
  const [orders, debits] = await Promise.all([
    prisma.storeOrder.findMany({
      where: {
        merchantId: { in: merchantIds },
        paymentStatus: 'paid',
        status: { not: 'cancelled' },
        isFrozen: false,
        availableAt: { lte: now },
      },
      orderBy: { availableAt: 'asc' },
      select: { id: true, merchantId: true, netAmount: true },
    }),
    prisma.withdrawal.groupBy({
      by: ['userId'],
      where: { userId: { in: merchantIds }, status: { in: RESERVING_WITHDRAWAL_STATUSES } },
      _sum: { amount: true },
    }),
  ]);
  const left = new Map(debits.map((d) => [d.userId, d._sum.amount ?? 0]));
  const ids = new Set<string>();
  for (const o of orders) {
    const net = o.netAmount ?? 0;
    const rest = left.get(o.merchantId) ?? 0;
    if (net > 0 && rest >= net) {
      ids.add(o.id);
      left.set(o.merchantId, rest - net);
    }
  }
  return ids;
}

export async function disputesView(period: AdminPeriod, filter: DisputeFilter, q: string) {
  const now = new Date();
  const t = q.trim();
  const rows = await prisma.storeOrder.findMany({
    where: {
      paymentType: { in: ONLINE },
      OR: [
        {
          paymentStatus: { in: ['paid', 'refunded'] },
          paidAt: { gte: new Date(now.getTime() - period * DAY) },
        },
        // Open cases always show, whatever their age.
        { isFrozen: true },
      ],
      ...(t
        ? {
            AND: [
              {
                OR: [
                  { reference: { contains: t, mode: 'insensitive' } },
                  { customerName: { contains: t, mode: 'insensitive' } },
                  { phone: { contains: t } },
                  { merchant: { store: { name: { contains: t, mode: 'insensitive' } } } },
                ],
              },
            ],
          }
        : {}),
    },
    orderBy: { paidAt: 'desc' },
    take: 300,
    select: {
      id: true,
      reference: true,
      productName: true,
      totalAmount: true,
      netAmount: true,
      customerName: true,
      phone: true,
      paymentType: true,
      paymentStatus: true,
      status: true,
      paidAt: true,
      createdAt: true,
      availableAt: true,
      isFrozen: true,
      frozenReason: true,
      frozenAt: true,
      disputeStatus: true,
      disputeClosedAt: true,
      disputeReport: true,
      refundMethod: true,
      refundPhone: true,
      refundReference: true,
      merchantId: true,
      merchant: {
        select: { email: true, store: { select: { name: true, subdomain: true, whatsapp: true } } },
      },
    },
  });
  const withdrawn = await withdrawnOrderIds([...new Set(rows.map((r) => r.merchantId))], now);
  const list = rows.map((o) => {
    const finance: FinanceStatus =
      o.disputeStatus === 'refunded' || o.paymentStatus === 'refunded'
        ? 'refunded'
        : o.disputeStatus === 'refunding'
          ? 'refunding'
          : o.isFrozen
            ? 'frozen'
            : o.availableAt && o.availableAt > now
              ? 'maturing'
              : withdrawn.has(o.id)
                ? 'withdrawn'
                : 'available';
    return {
      id: o.id,
      reference: o.reference,
      product: o.productName,
      amount: o.totalAmount,
      net: o.netAmount ?? o.totalAmount,
      customer: o.customerName,
      phone: o.phone,
      method: o.paymentType === 'online_orange' ? 'Orange Money' : 'Wave',
      orderStatus: o.status,
      paidAt: (o.paidAt ?? o.createdAt).toISOString(),
      availableAt: o.availableAt?.toISOString() ?? null,
      finance,
      released: o.disputeStatus === 'released',
      frozenReason: o.frozenReason,
      frozenAt: o.frozenAt?.toISOString() ?? null,
      closedAt: o.disputeClosedAt?.toISOString() ?? null,
      report: o.disputeReport,
      refund: o.refundMethod
        ? { method: o.refundMethod, phone: o.refundPhone, reference: o.refundReference }
        : null,
      store: o.merchant.store?.name ?? o.merchant.store?.subdomain ?? o.merchant.email,
      storeWhatsapp: o.merchant.store?.whatsapp ?? null,
    };
  });
  const filtered =
    filter === 'all'
      ? list
      : filter === 'released'
        ? list.filter((o) => o.released)
        : list.filter((o) => o.finance === filter);
  const sum = (f: FinanceStatus) =>
    list.filter((o) => o.finance === f).reduce((a, o) => a + o.amount, 0);
  return {
    totals: {
      volume: list.filter((o) => o.finance !== 'refunded').reduce((a, o) => a + o.amount, 0),
      count: list.length,
      maturing: sum('maturing'),
      available: sum('available'),
      frozen: sum('frozen') + sum('refunding'),
      frozenCount: list.filter((o) => o.finance === 'frozen' || o.finance === 'refunding').length,
      refunded: sum('refunded'),
    },
    orders: filtered,
  };
}

export async function freezeOrder(
  orderId: string,
  reason: string,
  meta: AdminMeta,
): Promise<ModResult> {
  if (!clean(reason)) return fail(400, 'Indiquez le motif du gel.');
  const order = await prisma.storeOrder.findUnique({ where: { id: orderId } });
  if (!order) return fail(404, 'Commande introuvable.');
  if (order.paymentStatus !== 'paid' || !ONLINE.includes(order.paymentType)) {
    return fail(409, 'Seules les commandes payées en ligne peuvent être gelées.');
  }
  if (order.isFrozen) return fail(409, 'Cette commande est déjà gelée.');
  await prisma.$transaction(
    async (tx) => {
      // Same lock as withdrawals: no payout can slip between the check and the freeze.
      await lockUserTx(tx, order.merchantId);
      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          isFrozen: true,
          frozenReason: clean(reason),
          frozenAt: new Date(),
          disputeStatus: 'frozen',
          disputeClosedAt: null,
          disputeReport: null,
        },
      });
      await audit(tx, meta, 'order.freeze', 'StoreOrder', orderId, {
        reason: clean(reason),
        reference: order.reference,
        merchantId: order.merchantId,
        amount: order.totalAmount,
        net: order.netAmount,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  return { ok: true };
}

export async function releaseOrder(
  orderId: string,
  report: string,
  meta: AdminMeta,
): Promise<ModResult> {
  const order = await prisma.storeOrder.findUnique({ where: { id: orderId } });
  if (!order) return fail(404, 'Commande introuvable.');
  if (!order.isFrozen || order.disputeStatus !== 'frozen') {
    return fail(409, 'Cette commande n’est pas gelée (ou un remboursement est en cours).');
  }
  await prisma.$transaction(async (tx) => {
    await tx.storeOrder.update({
      where: { id: orderId },
      data: {
        isFrozen: false,
        disputeStatus: 'released',
        disputeClosedAt: new Date(),
        disputeReport: clean(report),
      },
    });
    await audit(tx, meta, 'order.release', 'StoreOrder', orderId, {
      report: clean(report),
      reference: order.reference,
      merchantId: order.merchantId,
      net: order.netAmount,
    });
  });
  return { ok: true };
}

export interface RefundInput {
  mode: 'moneriz' | 'manual';
  provider: 'wave' | 'orange';
  phone: string;
  name: string;
  reference?: string;
  report: string;
}

/** Normalises a Senegalese number to E.164 (+221…). */
export function toE164(phone: string): string | null {
  const d = phone.replace(/\D/g, '');
  if (/^7\d{8}$/.test(d)) return `+221${d}`;
  if (/^221\d{9}$/.test(d)) return `+${d}`;
  if (/^\d{10,15}$/.test(d)) return `+${d}`;
  return null;
}

/**
 * Refund the customer and close the case. The amount leaves the merchant's
 * wallet for good (paymentStatus = refunded).
 *   - mode « moneriz »: payout to the customer's Mobile Money number through
 *     Moneriz (idempotent key per order: a retry can never pay twice);
 *   - mode « manual »: the admin already sent the money, we archive it.
 */
export async function refundOrder(
  orderId: string,
  input: RefundInput,
  meta: AdminMeta,
): Promise<ModResult<{ pending?: boolean }>> {
  const order = await prisma.storeOrder.findUnique({ where: { id: orderId } });
  if (!order) return fail(404, 'Commande introuvable.');
  if (!order.isFrozen) return fail(409, 'Gelez d’abord la commande avant de rembourser.');
  const phone = toE164(input.phone);
  if (!phone) return fail(400, 'Numéro du client invalide.');
  const allowedFrom = input.mode === 'manual' ? ['frozen', 'refunding'] : ['frozen'];

  // Claim the case (only one refund can run).
  const claimed = await prisma.storeOrder.updateMany({
    where: { id: orderId, isFrozen: true, disputeStatus: { in: allowedFrom } },
    data: { disputeStatus: 'refunding' },
  });
  if (claimed.count === 0)
    return fail(409, 'Un remboursement est déjà en cours pour cette commande.');

  let reference = clean(input.reference);
  if (input.mode === 'moneriz') {
    try {
      const payout = (await createMonerizWithdrawal({
        amount: order.totalAmount,
        currency: 'XOF',
        country: 'SN',
        paymentType: input.provider === 'orange' ? 'orange_money' : 'wave_money',
        destination: { phone, name: input.name.trim() || order.customerName },
        reason: `Remboursement commande ${order.reference}`,
        idempotencyKey: `refund-${order.id}`,
      })) as { id?: unknown };
      reference = typeof payout?.id === 'string' ? payout.id : reference;
    } catch (err) {
      const definitive =
        err instanceof MonerizApiError && err.statusCode >= 400 && err.statusCode < 500;
      log.error('adminom.refund.provider_error', {
        orderId,
        definitive,
        error: err instanceof Error ? err.message : String(err),
      });
      if (definitive) {
        await prisma.storeOrder.update({
          where: { id: orderId },
          data: { disputeStatus: 'frozen' },
        });
        return fail(
          400,
          `Moneriz a refusé le remboursement (${(err as MonerizApiError).message}). Vérifiez le numéro et le solde Moneriz.`,
        );
      }
      // Outcome unknown: the order stays frozen and « refunding »; once the
      // transfer is confirmed, close it with « Remboursé manuellement ».
      await prisma.$transaction(async (tx) => {
        await audit(tx, meta, 'order.refund_pending', 'StoreOrder', orderId, {
          reference: order.reference,
          amount: order.totalAmount,
          phone,
        });
      });
      return { ok: true, pending: true };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.storeOrder.update({
      where: { id: orderId },
      data: {
        isFrozen: false,
        paymentStatus: 'refunded',
        disputeStatus: 'refunded',
        disputeClosedAt: new Date(),
        disputeReport: clean(input.report),
        refundMethod:
          input.mode === 'manual'
            ? 'manual'
            : input.provider === 'orange'
              ? 'moneriz_orange'
              : 'moneriz_wave',
        refundPhone: phone,
        refundReference: reference,
      },
    });
    await audit(tx, meta, 'order.refund', 'StoreOrder', orderId, {
      mode: input.mode,
      provider: input.provider,
      phone,
      amount: order.totalAmount,
      net: order.netAmount,
      reference,
      report: clean(input.report),
      orderReference: order.reference,
      merchantId: order.merchantId,
      frozenReason: order.frozenReason,
    });
  });
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Journal des sanctions
// ─────────────────────────────────────────────────────────────────────────
export async function auditView(take = 50) {
  const rows = await prisma.adminAction.findMany({
    where: {
      action: {
        in: [
          'product.disable',
          'product.enable',
          'product.delete',
          'store.suspend',
          'store.reopen',
          'user.suspend',
          'user.restore',
          'user.delete',
          'order.freeze',
          'order.release',
          'order.refund',
          'order.refund_pending',
          'store.grant_pro',
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });
  return rows.map((r) => {
    const m = (r.metadata ?? {}) as Record<string, unknown>;
    const label =
      (m.reference as string) ||
      (m.orderReference as string) ||
      (m.email as string) ||
      (m.subdomain as string) ||
      (m.slug as string) ||
      r.targetId ||
      '';
    return {
      id: r.id,
      action: r.action,
      target: label,
      reason: (m.reason as string) || (m.report as string) || (m.note as string) || null,
      at: r.createdAt.toISOString(),
    };
  });
}
