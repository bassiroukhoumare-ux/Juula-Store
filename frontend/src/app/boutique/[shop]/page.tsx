// Storefront home: https://<shop>.juula.store (rewritten here by middleware),
// also reachable at /boutique/<shop> on www (owner preview, payment return).
// Draft shops: the owner gets a private preview, everyone else a « coming
// soon » page.
import { displayFont } from '@/app/fonts';
import type { Metadata } from 'next';
import { productConfig } from '@/lib/server/store/products';
import { pixelsOf, storeMetadata } from '@/lib/server/store/public';
import { checkoutOptionsFor } from '@/lib/server/store/storefront';
import { loadShop, shopBase, toShopProducts } from '@/lib/server/store/shop-page';
import { PixelsInit } from '@/components/storefront/PixelsInit';
import { ComingSoon } from '@/components/storefront/ComingSoon';
import { StorefrontView } from '@/components/storefront/StorefrontView';
import { JsonLd, storeLd } from '@/lib/seo/json-ld';
import { storeOrigin, storeProductUrl } from '@/lib/store/subdomain';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ shop: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shop } = await params;
  const { store, products, settings } = await loadShop(shop);
  if (!products) {
    return {
      title: store.suspendedAt ? 'Boutique indisponible' : 'Boutique en cours de préparation',
      robots: { index: false },
    };
  }
  const image =
    settings.coverUrl ??
    products
      .map((p) => productConfig(p).mediaItems.find((m) => m.type === 'image')?.url)
      .find(Boolean);
  return storeMetadata(store, products.length, image ?? undefined);
}

export default async function StorefrontPage({ params }: PageProps) {
  const { shop } = await params;
  const { store, settings, products, isPreview } = await loadShop(shop);
  if (!products)
    return <ComingSoon storeName={store.name} unavailable={Boolean(store.suspendedAt)} />;

  // On the shop's own subdomain pages live at /<slug>, /panier…; on www
  // (preview) under /boutique/<shop>/.
  const base = await shopBase(store.subdomain!);
  const shopProducts = toShopProducts(products, base);

  const name = store.name || store.subdomain!;
  return (
    <div className={displayFont.className}>
      {!isPreview && <PixelsInit pixels={pixelsOf(store)} />}
      {!isPreview && (
        <JsonLd
          data={storeLd({
            name,
            url: storeOrigin(store.subdomain!),
            logo: store.logoUrl,
            image: settings.coverUrl,
            description: settings.tagline || `${name} — boutique en ligne sur Juula.`,
            products: shopProducts.map((p) => ({
              title: p.title,
              url: p.pageHref ? storeProductUrl(store.subdomain!, p.slug) : null,
            })),
          })}
        />
      )}
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
        base={base}
        faq={settings.faq}
        announcement={settings.announcement}
      />
    </div>
  );
}
