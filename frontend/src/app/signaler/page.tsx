// www.juula.store/signaler?produit=<slug> | ?boutique=<sub-domain> — report page
// reached from a product page served on the main domain.
import { renderReportPage, reportMetadata } from '@/lib/server/report-page';

export const dynamic = 'force-dynamic';
export const metadata = reportMetadata;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReportRootPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const produit = typeof sp.produit === 'string' ? sp.produit : null;
  const boutique = typeof sp.boutique === 'string' ? sp.boutique : null;
  return renderReportPage({
    shop: boutique,
    productSlug: produit,
    base: '',
    www: true,
  });
}
