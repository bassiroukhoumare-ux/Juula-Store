// Product page on a store subdomain: https://<shop>.juula.store/<slug>
// (rewritten here by middleware). Only published products of that store.
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { productConfig, withStoreBranding } from '@/lib/server/store/products';
import {
  loadProductBySlugCached as loadProductBySlug,
  loadStoreBySubdomainCached as loadStoreBySubdomain,
  canonicalProductUrl,
  pixelsOf,
  productDescription,
  productMetadata,
} from '@/lib/server/store/public';
import { PublicProductView } from '@/components/showcase/PublicProductView';
import { storeOrigin, storeProductUrl } from '@/lib/store/subdomain';
import { JsonLd, productLd } from '@/lib/seo/json-ld';
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
  if (!found?.product) {
    return { title: 'Boutique en cours de préparation — Juula Store', robots: { index: false } };
  }
  const meta = productMetadata(found.product, found.store, false);
  // Shop not live (no active plan / suspended): the page only says so.
  return isStoreLive(found.store) ? meta : { ...meta, robots: { index: false } };
}

export default async function StoreProductPage({ params, searchParams }: PageProps) {
  const { shop, slug } = await params;
  const found = await load(shop, slug, toSearch(await searchParams));
  if (!found?.product || !isStoreLive(found.store)) {
    return (
      <ComingSoon
        storeName={found?.store.name ?? null}
        unavailable={Boolean(found?.store.suspendedAt)}
      />
    );
  }
  const { store, product } = found;
  const base = withStoreBranding(productConfig(product), store);
  return (
    <>
      <JsonLd
        data={productLd({
          config: base,
          slug: product.slug,
          url: canonicalProductUrl(product, store),
          storeName: store.name || store.subdomain,
          storeUrl: store.subdomain ? storeOrigin(store.subdomain) : null,
          description: productDescription(base),
        })}
      />
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
    </>
  );
}
