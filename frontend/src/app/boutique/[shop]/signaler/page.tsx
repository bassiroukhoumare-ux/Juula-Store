// <shop>.juula.store/signaler[?produit=<slug>] — report the shop or a product.
import { headers } from 'next/headers';
import { renderReportPage, reportMetadata } from '@/lib/server/report-page';

export const dynamic = 'force-dynamic';
export const metadata = reportMetadata;

interface PageProps {
  params: Promise<{ shop: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ShopReportPage({ params, searchParams }: PageProps) {
  const { shop } = await params;
  const sp = await searchParams;
  const produit = typeof sp.produit === 'string' ? sp.produit : null;
  // On its own sub-domain the shop lives at « / »; on www under /boutique/<shop>.
  const host = (await headers()).get('host') ?? '';
  const onSubdomain = host.toLowerCase().startsWith(`${shop.toLowerCase()}.`);
  return renderReportPage({
    shop,
    productSlug: produit,
    base: onSubdomain ? '' : `/boutique/${shop}`,
  });
}
