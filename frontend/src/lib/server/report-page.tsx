import 'server-only';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveReportTarget } from '@/lib/server/reports';
import { ReportPage } from '@/components/storefront/ReportPage';
import { storeOrigin, storeProductUrl } from '@/lib/store/subdomain';
import { displayFont } from '@/app/fonts';

export const reportMetadata: Metadata = {
  title: 'Signaler un problème · Juula Store',
  robots: { index: false, follow: false },
};

/** Full page « Signaler » for a shop or one of its products. */
export async function renderReportPage(input: {
  shop: string | null;
  productSlug: string | null;
  /** Prefix of the shop links ('' on its sub-domain, /boutique/<shop> on www). */
  base: string;
  /** Served on the main domain (www): links go to the shop's own address. */
  www?: boolean;
}) {
  const target = await resolveReportTarget({ shop: input.shop, productSlug: input.productSlug });
  if (!target) notFound();
  const sub = target.storeSubdomain;
  const backHref = input.www
    ? target.productSlug
      ? sub
        ? storeProductUrl(sub, target.productSlug)
        : `/p/${target.productSlug}`
      : sub
        ? storeOrigin(sub)
        : '/'
    : target.productSlug
      ? `${input.base}/${target.productSlug}`
      : input.base || '/';
  return (
    <div className={displayFont.className}>
      <ReportPage
        backHref={backHref}
        target={{
          shop: target.storeSubdomain,
          productSlug: target.productSlug,
          storeName: target.storeName,
          logoUrl: target.logoUrl,
          accent: target.accent,
          productTitle: target.productTitle,
          productImage: target.productImage,
        }}
      />
    </div>
  );
}
