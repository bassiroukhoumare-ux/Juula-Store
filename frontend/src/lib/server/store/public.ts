// Loaders + metadata shared by the public pages: legacy /p/[slug] links and
// the store subdomains (<shop>.juula.store and <shop>.juula.store/<slug>).
import 'server-only';
import type { Metadata } from 'next';
import type { Product, Store } from '@prisma/client';
import { cache } from 'react';
import { optionalAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { productConfig } from '@/lib/server/store/products';
import type { StorePixels } from '@/lib/store/pixels';
import { storeOrigin, storeProductUrl } from '@/lib/store/subdomain';

import { isStorePro } from '@/lib/store/plans';

export function pixelsOf(
  store:
    | (Pick<Store, 'facebookPixelId' | 'tiktokPixelId' | 'googleTagId'> &
        Partial<Pick<Store, 'plan' | 'planExpiresAt'>>)
    | null,
): StorePixels {
  if (!isStorePro(store)) {
    return { facebookPixelId: null, tiktokPixelId: null, googleTagId: null };
  }
  return {
    facebookPixelId: store?.facebookPixelId ?? null,
    tiktokPixelId: store?.tiktokPixelId ?? null,
    googleTagId: store?.googleTagId ?? null,
  };
}

/** Product by slug; drafts/deactivated only for their owner (preview). */
export const loadProductBySlug = cache(async (slug: string) => {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { user: { select: { store: true } } },
  });
  if (!product) return null;
  const store = product.user.store;
  if (product.status === 'published') return { product, store, isPreview: false };
  const viewer = await optionalAuth();
  if (viewer?.user.sub === product.userId) return { product, store, isPreview: true };
  return null;
});

export type StoreLookup =
  | { kind: 'store'; store: Store }
  | { kind: 'moved'; subdomain: string }
  | { kind: 'none' };

/** Subdomain → store, or the store's current subdomain when this is an old address. */
export const loadStoreBySubdomain = cache(async (subdomain: string): Promise<StoreLookup> => {
  const store = await prisma.store.findUnique({ where: { subdomain } });
  if (store) return { kind: 'store', store };
  const alias = await prisma.storeAlias.findUnique({
    where: { subdomain },
    include: { store: { select: { subdomain: true } } },
  });
  if (alias?.store.subdomain) return { kind: 'moved', subdomain: alias.store.subdomain };
  return { kind: 'none' };
});

/** Canonical public URL of a product: its store subdomain when there is one. */
export function canonicalProductUrl(
  product: Pick<Product, 'slug'>,
  store: Pick<Store, 'subdomain'> | null,
): string {
  if (store?.subdomain) return storeProductUrl(store.subdomain, product.slug);
  return `${process.env.APP_URL || 'https://www.juula.store'}/p/${product.slug}`;
}

export function productMetadata(
  product: Product,
  store: Pick<Store, 'subdomain'> | null,
  isPreview: boolean,
): Metadata {
  const config = productConfig(product);
  const image = config.mediaItems.find((m) => m.type === 'image')?.url;
  const title = config.storeName
    ? `${config.productTitle} — ${config.storeName}`
    : config.productTitle;
  const description =
    config.benefits?.filter(Boolean).slice(0, 2).join(' · ') ||
    config.deliveryNotice ||
    'Commandez en ligne, paiement à la livraison.';
  const url = canonicalProductUrl(product, store);

  return {
    title,
    description,
    metadataBase: new URL(url),
    alternates: { canonical: url },
    ...(isPreview ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export function storeMetadata(store: Store, productCount: number, image?: string): Metadata {
  const name = store.name || store.subdomain || 'Boutique';
  const url = storeOrigin(store.subdomain!);
  const description = `${name} — ${productCount} produit${productCount > 1 ? 's' : ''} disponible${productCount > 1 ? 's' : ''}. Commandez en ligne, paiement à la livraison ou par Wave / Orange Money.`;
  return {
    title: name,
    description,
    metadataBase: new URL(url),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: name,
      description,
      url,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}
