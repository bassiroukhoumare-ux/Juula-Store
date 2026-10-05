// /p/[slug] — original product link. A published product of a store that has
// a subdomain redirects to its canonical address (<shop>.juula.store/<slug>),
// keeping the query string (payment return). Drafts / deactivated products
// stay viewable here by their owner only, as a preview.
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { productConfig, withStoreBranding } from '@/lib/server/store/products';
import { loadProductBySlug, pixelsOf, productMetadata } from '@/lib/server/store/public';
import { PublicProductView } from '@/components/showcase/PublicProductView';
import { storeProductUrl } from '@/lib/store/subdomain';
import { isStorePro } from '@/lib/store/plans';

// Edits must show up on the shared link immediately.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const found = await loadProductBySlug(slug);
  if (!found) return { title: 'Produit introuvable — Juula Store' };
  return productMetadata(found.product, found.store, found.isPreview);
}

export default async function PublicProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const found = await loadProductBySlug(slug);
  if (!found) notFound();

  const isPro = isStorePro(found.store);

  if (!found.isPreview && isPro && found.store?.subdomain) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(await searchParams)) if (typeof v === 'string') q.set(k, v);
    const search = q.toString();
    redirect(
      `${storeProductUrl(found.store.subdomain, found.product.slug)}${search ? `?${search}` : ''}`,
    );
  }

  const config = withStoreBranding(productConfig(found.product), found.store);
  if (!isPro) {
    config.codEnabled = false;
  }

  return (
    <PublicProductView
      config={config}
      pixels={pixelsOf(found.store)}
      isPreview={found.isPreview}
      displayCurrency={found.store?.displayCurrency}
    />
  );
}
