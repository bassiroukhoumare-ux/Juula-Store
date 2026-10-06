// Storefront home: https://<shop>.juula.store (rewritten here by middleware),
// also reachable at /boutique/<shop> on www (owner preview, payment return).
// Draft shops: the owner gets a private preview, everyone else a « coming
// soon » page.
import { displayFont } from '@/app/fonts';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/server/prisma';
import { optionalAuth } from '@/lib/server/middleware';
import { productConfig } from '@/lib/server/store/products';
import { loadStoreBySubdomain, pixelsOf, storeMetadata } from '@/lib/server/store/public';
import {
  checkoutOptionsFor,
  isStoreLive,
  shopSellableSlugs,
  toStorefrontSettings,
} from '@/lib/server/store/storefront';
import { computeDeliveryFee } from '@/lib/store/pricing';
import { storeOrigin, subdomainFromHost } from '@/lib/store/subdomain';
import { PixelsInit } from '@/components/storefront/PixelsInit';
import { ComingSoon } from '@/components/storefront/ComingSoon';
import { StorefrontView } from '@/components/storefront/StorefrontView';
import type { ShopProduct } from '@/components/storefront/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ shop: string }>;
}

async function load(shop: string) {
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shop } = await params;
  const { store, products, settings } = await load(shop);
  if (!products) return { title: 'Boutique en cours de préparation', robots: { index: false } };
  const image =
    settings.coverUrl ??
    products
      .map((p) => productConfig(p).mediaItems.find((m) => m.type === 'image')?.url)
      .find(Boolean);
  return storeMetadata(store, products.length, image ?? undefined);
}

export default async function StorefrontPage({ params }: PageProps) {
  const { shop } = await params;
  const { store, settings, products, isPreview } = await load(shop);
  if (!products) return <ComingSoon storeName={store.name} />;

  // On the shop's own subdomain product pages live at /<slug>; on www
  // (preview) at /boutique/<shop>/<slug>.
  const onSubdomain = Boolean(subdomainFromHost((await headers()).get('host')));
  const base = onSubdomain ? '' : `/boutique/${store.subdomain}`;

  const shopProducts: ShopProduct[] = products
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

  return (
    <div className={displayFont.className}>
      {!isPreview && <PixelsInit pixels={pixelsOf(store)} />}
      <StorefrontView
        shop={store.subdomain!}
        storeName={store.name || store.subdomain!}
        tagline={settings.tagline}
        logoUrl={store.logoUrl}
        coverUrl={settings.coverUrl}
        accent={settings.accent}
        banners={settings.banners}
        sections={settings.sections}
        products={shopProducts}
        options={checkoutOptionsFor(store)}
        displayCurrency={store.displayCurrency}
        isPreview={isPreview}
      />
    </div>
  );
}
