import 'server-only';
// Public directory of shops (landing « Juula Creators » + /boutiques).
// Only published shops with an active PRO subscription are listed: when a
// subscription lapses, the shop drops out on its own (no cron needed).
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { storeOrigin } from '@/lib/store/subdomain';
import { isStoreCategory, storeCategoryLabel } from '@/lib/store/categories';

export interface DirectoryStore {
  id: string;
  name: string;
  subdomain: string;
  url: string;
  logoUrl: string | null;
  coverUrl: string | null;
  /** Up to 3 product photos (card visual when the shop has no cover). */
  photos: string[];
  tagline: string | null;
  accent: string | null;
  category: string | null;
  categoryLabel: string | null;
  products: number;
  /** Product titles, for the search box. */
  productTitles: string[];
}

function eligible(now: Date): Prisma.StoreWhereInput {
  return {
    storefrontPublished: true,
    plan: 'PRO',
    OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }],
    suspendedAt: null,
    subdomain: { not: null },
    user: { status: 'ACTIVE' },
  };
}

function productInfo(config: Prisma.JsonValue, fallback: string) {
  const c = (config ?? {}) as {
    productTitle?: unknown;
    mediaItems?: { type?: string; url?: string; isPrimary?: boolean }[];
  };
  const media = Array.isArray(c.mediaItems) ? c.mediaItems : [];
  const photo =
    media.find((m) => m?.isPrimary && m.type !== 'video' && typeof m.url === 'string')?.url ??
    media.find((m) => m?.type !== 'video' && typeof m?.url === 'string')?.url ??
    null;
  return {
    title: typeof c.productTitle === 'string' && c.productTitle ? c.productTitle : fallback,
    photo,
  };
}

/** Every listed shop, best first (sales of the last 30 days, then catalogue size). */
export async function directoryStores(limit = 500): Promise<DirectoryStore[]> {
  const now = new Date();
  const stores = await prisma.store.findMany({
    where: eligible(now),
    take: limit,
    select: {
      id: true,
      userId: true,
      name: true,
      subdomain: true,
      logoUrl: true,
      storeCoverUrl: true,
      storeTagline: true,
      storeAccent: true,
      storeCategory: true,
      user: {
        select: {
          products: {
            where: { status: 'published', adminDisabledAt: null },
            orderBy: { updatedAt: 'desc' },
            take: 40,
            select: { internalName: true, config: true },
          },
        },
      },
    },
  });
  if (stores.length === 0) return [];
  const sales = await prisma.storeOrder.groupBy({
    by: ['merchantId'],
    where: {
      merchantId: { in: stores.map((s) => s.userId) },
      createdAt: { gte: new Date(now.getTime() - 30 * 86_400_000) },
      status: { not: 'cancelled' },
    },
    _count: { _all: true },
  });
  const salesOf = new Map(sales.map((s) => [s.merchantId, s._count._all]));

  return stores
    .map((s) => {
      const items = s.user.products.map((p) => productInfo(p.config, p.internalName));
      const category = isStoreCategory(s.storeCategory) ? s.storeCategory : null;
      return {
        score: (salesOf.get(s.userId) ?? 0) * 10 + items.length + (s.storeCoverUrl ? 3 : 0),
        store: {
          id: s.id,
          name: s.name ?? s.subdomain!,
          subdomain: s.subdomain!,
          url: storeOrigin(s.subdomain!),
          logoUrl: s.logoUrl,
          coverUrl: s.storeCoverUrl,
          photos: items
            .map((i) => i.photo)
            .filter((x): x is string => Boolean(x))
            .slice(0, 3),
          tagline: s.storeTagline,
          accent: s.storeAccent,
          category,
          categoryLabel: storeCategoryLabel(category),
          products: items.length,
          productTitles: items.map((i) => i.title),
        } satisfies DirectoryStore,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.store);
}

/** The 4 shops of the landing page + how many are listed. */
export async function featuredStores(): Promise<{ stores: DirectoryStore[]; total: number }> {
  const all = await directoryStores();
  // Prefer shops that have something to show (products or a cover).
  const showable = all.filter((s) => s.products > 0 || s.coverUrl);
  return { stores: (showable.length >= 4 ? showable : all).slice(0, 4), total: all.length };
}
