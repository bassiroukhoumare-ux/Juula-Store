import 'server-only';
// Affiliate partners on the server: secret tokens, results, attribution.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Partner, Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { productConfig } from '@/lib/server/store/products';
import {
  commissionState,
  normalizePartnerSlug,
  partnerStatus,
  type CommissionType,
  type PartnerDTO,
  type PartnerStats,
} from '@/lib/store/partners';

type Client = Prisma.TransactionClient;

/** 32 random bytes, URL-safe: not guessable. */
export function newPartnerToken(): string {
  return randomBytes(32).toString('base64url');
}

export function tokenMatches(expected: string, given: string | null | undefined): boolean {
  if (!given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

const EMPTY_STATS: PartnerStats = {
  clicks: 0,
  pendingOrders: 0,
  validatedOrders: 0,
  cancelledOrders: 0,
  revenue: 0,
  pendingCommission: 0,
  validatedCommission: 0,
  dueCommission: 0,
};

/** Results of several partners (clicks, orders, commissions). */
export async function partnerStats(partners: Partner[]): Promise<Map<string, PartnerStats>> {
  const ids = partners.map((p) => p.id);
  const out = new Map<string, PartnerStats>(ids.map((id) => [id, { ...EMPTY_STATS }]));
  if (ids.length === 0) return out;
  const [visits, orders] = await Promise.all([
    prisma.partnerVisit.groupBy({
      by: ['partnerId'],
      where: { partnerId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.storeOrder.findMany({
      where: { partnerId: { in: ids } },
      select: { partnerId: true, status: true, amount: true, partnerCommission: true },
    }),
  ]);
  for (const v of visits) out.get(v.partnerId)!.clicks = v._count._all;
  for (const o of orders) {
    const s = out.get(o.partnerId!)!;
    const state = commissionState(o.status);
    if (state === 'cancelled') {
      s.cancelledOrders += 1;
      continue;
    }
    s.revenue += o.amount;
    if (state === 'validated') {
      s.validatedOrders += 1;
      s.validatedCommission += o.partnerCommission;
    } else {
      s.pendingOrders += 1;
      s.pendingCommission += o.partnerCommission;
    }
  }
  for (const p of partners) {
    const s = out.get(p.id)!;
    s.dueCommission = Math.max(0, s.validatedCommission - p.paidAmount);
  }
  return out;
}

export async function productTitles(
  merchantId: string,
  slugs: (string | null)[],
): Promise<Map<string, string>> {
  const wanted = [...new Set(slugs.filter((s): s is string => Boolean(s)))];
  if (wanted.length === 0) return new Map();
  const rows = await prisma.product.findMany({
    where: { userId: merchantId, slug: { in: wanted } },
  });
  return new Map(rows.map((r) => [r.slug, productConfig(r).productTitle || r.internalName]));
}

export function toPartnerDTO(
  p: Partner,
  stats: PartnerStats | undefined,
  productTitle: string | null,
): PartnerDTO {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    startsAt: p.startsAt?.toISOString() ?? null,
    expiresAt: p.expiresAt.toISOString(),
    suspended: p.suspended,
    commissionType: p.commissionType as CommissionType,
    commissionValue: p.commissionValue,
    productSlug: p.productSlug,
    productTitle,
    token: p.token,
    paidAmount: p.paidAmount,
    paidAt: p.paidAt?.toISOString() ?? null,
    paidVia: p.paidVia,
    createdAt: p.createdAt.toISOString(),
    stats: stats ?? { ...EMPTY_STATS },
  };
}

/** The partner of a ?ref= value, only while its campaign is running. */
export async function activePartner(
  client: Client,
  merchantId: string,
  ref: string | null | undefined,
  now: Date = new Date(),
): Promise<Partner | null> {
  const slug = ref ? normalizePartnerSlug(ref) : '';
  if (!slug) return null;
  const partner = await client.partner.findUnique({
    where: { merchantId_slug: { merchantId, slug } },
  });
  if (!partner) return null;
  const status = partnerStatus(
    {
      startsAt: partner.startsAt?.toISOString() ?? null,
      expiresAt: partner.expiresAt.toISOString(),
      suspended: partner.suspended,
    },
    now,
  );
  return status === 'active' ? partner : null;
}
