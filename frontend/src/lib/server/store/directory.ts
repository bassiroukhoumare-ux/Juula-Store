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

const PRODUCTS_PER_STORE = 40;

/**
 * Title + first photo of the published products of the given merchants.
 * Read in SQL (jsonb) so the full product configs — long descriptions, FAQ,
 * reviews… — never leave the database: the directory stays light whatever the
 * size of the catalogues.
 */
async function productSummaries(
  merchantIds: string[],
): Promise<Map<string, { title: string; photo: string | null }[]>> {
  const out = new Map<string, { title: string; photo: string | null }[]>();
  if (merchantIds.length === 0) return out;
  const rows = await prisma.$queryRaw<
    { userId: string; title: string | null; internalName: string; photo: string | null }[]
  >`
    SELECT p."userId",
           p."internalName",
           NULLIF(p.config->>'productTitle', '') AS title,
           (SELECT m->>'url'
              FROM jsonb_array_elements(
                     CASE WHEN jsonb_typeof(p.config->'mediaItems') = 'array'
                          THEN p.config->'mediaItems' ELSE '[]'::jsonb END) AS m
             WHERE COALESCE(m->>'type', 'image') <> 'video' AND m->>'url' IS NOT NULL
             ORDER BY (m->>'isPrimary') = 'true' DESC
             LIMIT 1) AS photo
      FROM "Product" p
     WHERE p."userId" = ANY(${merchantIds})
       AND p.status = 'published'
       AND p."adminDisabledAt" IS NULL
     ORDER BY p."updatedAt" DESC`;
  for (const r of rows) {
    const list = out.get(r.userId) ?? [];
    if (list.length < PRODUCTS_PER_STORE) {
      list.push({ title: r.title ?? r.internalName, photo: r.photo });
      out.set(r.userId, list);
    }
  }
  return out;
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
    },
  });
  if (stores.length === 0) return [];
  const merchantIds = stores.map((s) => s.userId);
  const [summaries, sales] = await Promise.all([
    productSummaries(merchantIds),
    prisma.storeOrder.groupBy({
      by: ['merchantId'],
      where: {
        merchantId: { in: merchantIds },
        createdAt: { gte: new Date(now.getTime() - 30 * 86_400_000) },
        status: { not: 'cancelled' },
      },
      _count: { _all: true },
    }),
  ]);
  const salesOf = new Map(sales.map((s) => [s.merchantId, s._count._all]));

  return stores
    .map((s) => {
      const items = summaries.get(s.userId) ?? [];
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
