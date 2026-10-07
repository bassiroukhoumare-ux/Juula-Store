import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/server/prisma';
import { createLogger } from '@/lib/server/logger';
import { platformOrigin, storeOrigin, storeProductUrl } from '@/lib/store/subdomain';

// One sitemap for the platform pages + every live shop and product page (on
// their canonical <shop>.juula.store URL). Live = PRO plan not expired and not
// suspended, the same rule the pages apply before showing anything.
export const revalidate = 3600;

const log = createLogger();

const MAX_URLS = 45_000; // sitemap protocol cap is 50 000

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const www = platformOrigin();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${www}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${www}/boutiques`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${www}/signup`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${www}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${www}/conditions`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${www}/confidentialite`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const live = {
    subdomain: { not: null },
    suspendedAt: null,
    plan: 'PRO',
    OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }],
  };

  try {
    const [stores, products] = await Promise.all([
      prisma.store.findMany({
        where: { ...live, storefrontPublished: true },
        select: { subdomain: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5_000,
      }),
      prisma.product.findMany({
        where: {
          status: 'published',
          adminDisabledAt: null,
          user: { store: { is: live } },
        },
        select: {
          slug: true,
          updatedAt: true,
          user: { select: { store: { select: { subdomain: true } } } },
        },
        orderBy: { updatedAt: 'desc' },
        take: MAX_URLS,
      }),
    ]);

    for (const s of stores) {
      entries.push({
        url: storeOrigin(s.subdomain!),
        lastModified: s.updatedAt,
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
    for (const p of products) {
      const sub = p.user.store?.subdomain;
      if (!sub) continue;
      entries.push({
        url: storeProductUrl(sub, p.slug),
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch (err) {
    // Never fail the whole sitemap: the static platform pages still go out.
    log.error('sitemap: shop/product listing failed', { err: String(err) });
  }

  return entries.slice(0, MAX_URLS);
}
