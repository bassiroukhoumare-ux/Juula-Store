import 'server-only';
// Shared loader of the storefront pages (home, /panier, /commande): the shop,
// its settings and the products it sells, plus the owner-preview rule.
import type { Product } from '@prisma/client';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/server/prisma';
import { optionalAuth } from '@/lib/server/middleware';
import { productConfig } from '@/lib/server/store/products';
import { loadStoreBySubdomain } from '@/lib/server/store/public';
import {
  isStoreLive,
  shopSellableSlugs,
  toStorefrontSettings,
} from '@/lib/server/store/storefront';
import { computeDeliveryFee } from '@/lib/store/pricing';
import { storeOrigin, subdomainFromHost } from '@/lib/store/subdomain';
import type { ShopProduct } from '@/components/storefront/types';

export async function loadShop(shop: string) {
  const found = await loadStoreBySubdomain(shop.toLowerCase());
  if (found.kind === 'moved') redirect(storeOrigin(found.subdomain));
  if (found.kind === 'none') notFound();
  const store = found.store;
  const settings = toStorefrontSettings(store);
  let isPreview = false;
  if (!settings.published || !isStoreLive(store)) {
    const viewer = await optionalAuth();
    if (viewer?.user.sub !== store.userId) return { store, settings, products: null, isPreview };
    isPreview = true;
  }
  // Shop products: visible in the catalogue, or placed in a banner / section
  // (their own sales page may be active or not); never deactivated ones.
  const inCollections = shopSellableSlugs(store);
  const rows = (
    await prisma.product.findMany({
      where: { userId: store.userId, status: { not: 'inactive' } },
      orderBy: { updatedAt: 'desc' },
    })
  ).filter((p) => productConfig(p).showInStore === true || inCollections.has(p.slug));
  return { store, settings, products: rows, isPreview };
}

/** URL prefix of the shop: '' on its own subdomain, /boutique/<shop> on www. */
export async function shopBase(subdomain: string): Promise<string> {
  const onSubdomain = Boolean(subdomainFromHost((await headers()).get('host')));
  return onSubdomain ? '' : `/boutique/${subdomain}`;
}

export function toShopProducts(rows: Product[], base: string): ShopProduct[] {
  return rows
    .map((p) => ({ product: p, config: productConfig(p) }))
    .map(({ product, config }) => ({
      slug: product.slug,
      pageHref: product.status === 'published' ? `${base}/${product.slug}` : null,
      title: config.productTitle || product.internalName,
      category: config.category?.trim() ?? '',
      price: config.price,
      originalPrice: config.originalPrice > config.price ? config.originalPrice : config.price,
      images: config.mediaItems
        .filter((m) => m.type === 'image')
        .map((m) => m.url)
        .slice(0, 5),
      featured: config.featured === true,
      inCatalogue: config.showInStore === true,
      deliveryFee: computeDeliveryFee(config),
      benefits: (config.benefits ?? []).filter(Boolean).slice(0, 8),
      colors: (config.availableColors ?? []).map((c) => ({ name: c.name, hex: c.hex })),
      deliveryNotice: config.deliveryNotice ?? '',
      createdAt: product.createdAt.toISOString(),
    }));
}
