// Panier: full page of the shop (/panier).
import { displayFont } from '@/app/fonts';
import type { Metadata } from 'next';
import { checkoutOptionsFor } from '@/lib/server/store/storefront';
import { pixelsOf } from '@/lib/server/store/public';
import { loadShop, shopBase, toShopProducts } from '@/lib/server/store/shop-page';
import { ComingSoon } from '@/components/storefront/ComingSoon';
import { PixelsInit } from '@/components/storefront/PixelsInit';
import { CartPage } from '@/components/storefront/CartPage';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ shop: string }>;
}

export const metadata: Metadata = { title: 'Mon panier', robots: { index: false } };

export default async function Page({ params }: PageProps) {
  const { shop } = await params;
  const { store, settings, products, isPreview } = await loadShop(shop);
  if (!products) return <ComingSoon storeName={store.name} />;
  const base = await shopBase(store.subdomain!);

  return (
    <div className={displayFont.className}>
      {!isPreview && <PixelsInit pixels={pixelsOf(store)} />}
      <CartPage
        shop={store.subdomain!}
        storeName={store.name || store.subdomain!}
        logoUrl={store.logoUrl}
        accent={settings.accent}
        base={base}
        products={toShopProducts(products, base)}
        options={checkoutOptionsFor(store)}
        isPreview={isPreview}
        displayCurrency={store.displayCurrency}
      />
    </div>
  );
}
