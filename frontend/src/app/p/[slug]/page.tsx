// /p/[slug] — original product link. A published product of a store that has
// a subdomain redirects to its canonical address (<shop>.juula.store/<slug>),
// keeping the query string (payment return). Drafts / deactivated products
// stay viewable here by their owner only, as a preview.
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { productConfig, withStoreBranding } from '@/lib/server/store/products';
import { loadProductBySlug, pixelsOf, productMetadata } from '@/lib/server/store/public';
import { PublicProductView } from '@/components/showcase/PublicProductView';
import { storeProductUrl } from '@/lib/store/subdomain';
import { isStoreLive, withCheckoutOptions } from '@/lib/server/store/storefront';
import { withMarketing } from '@/lib/server/store/marketing';
import { ComingSoon } from '@/components/storefront/ComingSoon';

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
  if (!found) return <ComingSoon />;
  // Pages are online only while the store has an active subscription
  // (the owner keeps a private preview).
  if (!found.isPreview && !isStoreLive(found.store)) {
    return <ComingSoon storeName={found.store?.name} />;
  }

  // Every store has its own address: <shop>.juula.store/<slug>.
  if (!found.isPreview && found.store?.subdomain) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(await searchParams)) if (typeof v === 'string') q.set(k, v);
    const search = q.toString();
    redirect(
      `${storeProductUrl(found.store.subdomain, found.product.slug)}${search ? `?${search}` : ''}`,
    );
  }

  const config = await withMarketing(
    withCheckoutOptions(withStoreBranding(productConfig(found.product), found.store), found.store),
    found.store,
    found.product.userId,
  );

  return (
    <PublicProductView
      config={config}
      pixels={pixelsOf(found.store)}
      isPreview={found.isPreview}
      displayCurrency={found.store?.displayCurrency}
    />
  );
}
