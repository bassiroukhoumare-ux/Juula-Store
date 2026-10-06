// Product page on a store subdomain: https://<shop>.juula.store/<slug>
// (rewritten here by middleware). Only published products of that store.
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { productConfig, withStoreBranding } from '@/lib/server/store/products';
import {
  loadProductBySlug,
  loadStoreBySubdomain,
  pixelsOf,
  productMetadata,
} from '@/lib/server/store/public';
import { PublicProductView } from '@/components/showcase/PublicProductView';
import { storeProductUrl } from '@/lib/store/subdomain';
import { isStoreLive, withCheckoutOptions } from '@/lib/server/store/storefront';
import { withMarketing } from '@/lib/server/store/marketing';
import { ComingSoon } from '@/components/storefront/ComingSoon';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ shop: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function load(shop: string, slug: string, search = '') {
  const found = await loadStoreBySubdomain(shop.toLowerCase());
  if (found.kind === 'moved') redirect(`${storeProductUrl(found.subdomain, slug)}${search}`);
  if (found.kind === 'none') return null;
  const product = await loadProductBySlug(slug);
  if (!product || product.isPreview || product.product.userId !== found.store.userId) {
    return { store: found.store, product: null };
  }
  return { store: found.store, product: product.product };
}

function toSearch(sp: Record<string, string | string[] | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string') q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shop, slug } = await params;
  const found = await load(shop, slug);
  if (!found?.product) return { title: 'Boutique en cours de préparation — Juula Store' };
  return productMetadata(found.product, found.store, false);
}

export default async function StoreProductPage({ params, searchParams }: PageProps) {
  const { shop, slug } = await params;
  const found = await load(shop, slug, toSearch(await searchParams));
  if (!found?.product || !isStoreLive(found.store)) {
    return <ComingSoon storeName={found?.store.name ?? null} />;
  }
  const { store, product } = found;
  return (
    <PublicProductView
      config={await withMarketing(
        withCheckoutOptions(withStoreBranding(productConfig(product), store), store),
        store,
        product.userId,
      )}
      pixels={pixelsOf(store)}
      isPreview={false}
      displayCurrency={store.displayCurrency}
    />
  );
}
