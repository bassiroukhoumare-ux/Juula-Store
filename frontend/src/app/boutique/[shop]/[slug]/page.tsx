// Product page on a store subdomain: https://<shop>.juula.store/<slug>
// (rewritten here by middleware). Only published products of that store.
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { productConfig, withStoreBranding } from '@/lib/server/store/products';
import {
  loadProductBySlug,
  loadStoreBySubdomain,
  pixelsOf,
  productMetadata,
} from '@/lib/server/store/public';
import { PublicProductView } from '@/components/showcase/PublicProductView';
import { storeProductUrl } from '@/lib/store/subdomain';
import { isStorePro } from '@/lib/store/plans';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ shop: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function load(shop: string, slug: string, search = '') {
  const found = await loadStoreBySubdomain(shop.toLowerCase());
  if (found.kind === 'moved') redirect(`${storeProductUrl(found.subdomain, slug)}${search}`);
  if (found.kind === 'none') notFound();
  if (!isStorePro(found.store)) {
    redirect(`/p/${slug}${search}`);
  }
  const product = await loadProductBySlug(slug);
  if (!product || product.isPreview || product.product.userId !== found.store.userId) notFound();
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
  const { store, product } = await load(shop, slug);
  return productMetadata(product, store, false);
}

export default async function StoreProductPage({ params, searchParams }: PageProps) {
  const { shop, slug } = await params;
  const { store, product } = await load(shop, slug, toSearch(await searchParams));
  return (
    <PublicProductView
      config={withStoreBranding(productConfig(product), store)}
      pixels={pixelsOf(store)}
      isPreview={false}
      displayCurrency={store.displayCurrency}
    />
  );
}
