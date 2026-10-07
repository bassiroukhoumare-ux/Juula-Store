// Commande: full page of the shop (/commande, /commande?mode=whatsapp).
import { displayFont } from '@/app/fonts';
import type { Metadata } from 'next';
import { checkoutOptionsFor } from '@/lib/server/store/storefront';
import { pixelsOf } from '@/lib/server/store/public';
import { loadShop, shopBase, toShopProducts } from '@/lib/server/store/shop-page';
import { ComingSoon } from '@/components/storefront/ComingSoon';
import { PixelsInit } from '@/components/storefront/PixelsInit';
import { CheckoutPage } from '@/components/storefront/CheckoutPage';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ shop: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export const metadata: Metadata = { title: 'Finaliser la commande', robots: { index: false } };

export default async function Page({ params, searchParams }: PageProps) {
  const { shop } = await params;
  const { store, settings, products, isPreview } = await loadShop(shop);
  if (!products)
    return <ComingSoon storeName={store.name} unavailable={Boolean(store.suspendedAt)} />;
  const base = await shopBase(store.subdomain!);
  const mode = (await searchParams).mode === 'whatsapp' ? 'whatsapp' : 'order';

  return (
    <div className={displayFont.className}>
      {!isPreview && <PixelsInit pixels={pixelsOf(store)} />}
      <CheckoutPage
        shop={store.subdomain!}
        storeName={store.name || store.subdomain!}
        logoUrl={store.logoUrl}
        accent={settings.accent}
        base={base}
        products={toShopProducts(products, base)}
        options={checkoutOptionsFor(store)}
        isPreview={isPreview}
        displayCurrency={store.displayCurrency}
        announcement={settings.announcement}
        mode={mode}
      />
    </div>
  );
}
