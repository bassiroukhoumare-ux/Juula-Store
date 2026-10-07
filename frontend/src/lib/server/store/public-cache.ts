import 'server-only';
// Data cache of the public storefront pages (shop home, product pages, cart,
// checkout). Pages stay dynamic (owner preview, ?ref=, cart), but their
// database reads are served from the Next.js data cache:
//   - tagged per shop / address / product and purged as soon as a merchant
//     or the administration changes something (invalidateStorefront);
//   - self-healing: every entry expires after REVALIDATE_SECONDS anyway.
// API routes (orders, promo, payments) keep reading the database directly.
import { revalidateTag, unstable_cache } from 'next/cache';
import type { Product, Store } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { log } from '@/lib/server/observability/log';

const REVALIDATE_SECONDS = 120;

const tags = {
  subdomain: (sub: string) => `sf:sub:${sub.toLowerCase()}`,
  store: (userId: string) => `sf:store:${userId}`,
  product: (slug: string) => `sf:product:${slug.toLowerCase()}`,
};

// unstable_cache stores JSON: Date columns come back as strings.
const STORE_DATES = [
  'planExpiresAt',
  'suspendedAt',
  'welcomeEmailSentAt',
  'createdAt',
  'updatedAt',
] as const;
const PRODUCT_DATES = ['createdAt', 'updatedAt', 'adminDisabledAt'] as const;
function revive<T extends object>(row: T, keys: readonly string[]): T {
  const out = { ...row } as Record<string, unknown>;
  for (const k of keys) {
    const v = out[k];
    if (typeof v === 'string') out[k] = new Date(v);
  }
  return out as T;
}
const reviveStore = (s: Store | null) => (s ? revive(s, STORE_DATES) : null);
const reviveProduct = (p: Product) => revive(p, PRODUCT_DATES);

export type CachedStoreLookup =
  | { kind: 'store'; store: Store }
  | { kind: 'moved'; subdomain: string }
  | { kind: 'none' };

/** Store row of a merchant. */
export async function cachedStoreByUserId(userId: string): Promise<Store | null> {
  const load = unstable_cache(
    () => prisma.store.findUnique({ where: { userId } }),
    ['sf-store', userId],
    { revalidate: REVALIDATE_SECONDS, tags: [tags.store(userId)] },
  );
  return reviveStore(await load());
}

/** Address (sub-domain) → shop, or its current address when this one is an old alias. */
export async function cachedStoreBySubdomain(subdomain: string): Promise<CachedStoreLookup> {
  const sub = subdomain.toLowerCase();
  const resolve = unstable_cache(
    async (): Promise<{ userId: string } | { moved: string } | null> => {
      const store = await prisma.store.findUnique({
        where: { subdomain: sub },
        select: { userId: true },
      });
      if (store) return { userId: store.userId };
      const alias = await prisma.storeAlias.findUnique({
        where: { subdomain: sub },
        include: { store: { select: { subdomain: true } } },
      });
      return alias?.store.subdomain ? { moved: alias.store.subdomain } : null;
    },
    ['sf-sub', sub],
    { revalidate: REVALIDATE_SECONDS, tags: [tags.subdomain(sub)] },
  );
  const hit = await resolve();
  if (!hit) return { kind: 'none' };
  if ('moved' in hit) return { kind: 'moved', subdomain: hit.moved };
  const store = await cachedStoreByUserId(hit.userId);
  return store ? { kind: 'store', store } : { kind: 'none' };
}

/** Product row by slug (any status; callers decide what is visible). */
export async function cachedProductBySlug(slug: string): Promise<Product | null> {
  const load = unstable_cache(
    () => prisma.product.findUnique({ where: { slug } }),
    ['sf-product', slug.toLowerCase()],
    { revalidate: REVALIDATE_SECONDS, tags: [tags.product(slug)] },
  );
  const p = await load();
  return p ? reviveProduct(p) : null;
}

/** Products shown by a shop (never the deactivated ones), newest first. */
export async function cachedShopProducts(userId: string): Promise<Product[]> {
  const load = unstable_cache(
    () =>
      prisma.product.findMany({
        where: { userId, status: { not: 'inactive' } },
        orderBy: { updatedAt: 'desc' },
      }),
    ['sf-shop-products', userId],
    { revalidate: REVALIDATE_SECONDS, tags: [tags.store(userId)] },
  );
  return (await load()).map(reviveProduct);
}

/** Cross-sell products of a page (by slug, same merchant, not deactivated). */
export async function cachedProductsBySlugs(userId: string, slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return [];
  const key = [...new Set(slugs)].sort();
  const load = unstable_cache(
    () =>
      prisma.product.findMany({
        where: { slug: { in: key }, userId, status: { not: 'inactive' } },
      }),
    ['sf-cross-sell', userId, ...key],
    { revalidate: REVALIDATE_SECONDS, tags: [tags.store(userId)] },
  );
  return (await load()).map(reviveProduct);
}

/**
 * Purges the cached storefront data after a change. Call it after any write
 * that changes what buyers see (store settings, plan, suspension, products,
 * address). Never throws (outside a request — scripts, tests — it is a no-op).
 */
export function invalidateStorefront(input: {
  userId?: string | null | undefined;
  slugs?: (string | null | undefined)[] | undefined;
  subdomains?: (string | null | undefined)[] | undefined;
}): void {
  const list = [
    ...(input.userId ? [tags.store(input.userId)] : []),
    ...(input.slugs ?? []).filter((s): s is string => Boolean(s)).map(tags.product),
    ...(input.subdomains ?? []).filter((s): s is string => Boolean(s)).map(tags.subdomain),
  ];
  for (const tag of list) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (err) {
      log.warn('storefront.cache.invalidate_skipped', {
        tag,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
