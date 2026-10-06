// Influencer dashboard: https://<shop>.juula.store/partner/<id>?token=<secret>
// Read-only, no account: the secret token in the link is the access key.
import { displayFont } from '@/app/fonts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/server/prisma';
import { loadStoreBySubdomain } from '@/lib/server/store/public';
import { toStorefrontSettings } from '@/lib/server/store/storefront';
import { partnerStats, productTitles, tokenMatches } from '@/lib/server/store/partners';
import { storeOrigin } from '@/lib/store/subdomain';
import { commissionState, type CommissionType } from '@/lib/store/partners';
import type { OrderItem } from '@/types/juula';
import { PartnerDashboard, type PartnerOrderRow } from '@/components/partner/PartnerDashboard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Espace partenaire',
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

interface PageProps {
  params: Promise<{ shop: string; id: string }>;
  searchParams: Promise<{ token?: string; page?: string }>;
}

export default async function PartnerPage({ params, searchParams }: PageProps) {
  const { shop, id } = await params;
  const { token, page: pageParam } = await searchParams;
  const found = await loadStoreBySubdomain(shop.toLowerCase());
  if (found.kind !== 'store') notFound();
  const store = found.store;
  const partner = await prisma.partner.findFirst({ where: { id, merchantId: store.userId } });
  // Same 404 for an unknown partner and a wrong token: nothing leaks.
  if (!partner || !tokenMatches(partner.token, token)) notFound();

  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1);
  const [stats, titles, total, rows] = await Promise.all([
    partnerStats([partner]),
    productTitles(store.userId, [partner.productSlug]),
    prisma.storeOrder.count({ where: { partnerId: partner.id } }),
    prisma.storeOrder.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        reference: true,
        createdAt: true,
        productName: true,
        items: true,
        quantity: true,
        amount: true,
        partnerCommission: true,
        status: true,
      },
    }),
  ]);

  const orders: PartnerOrderRow[] = rows.map((o) => {
    const items = Array.isArray(o.items) ? (o.items as unknown as OrderItem[]) : null;
    return {
      id: o.id,
      reference: o.reference,
      createdAt: o.createdAt.toISOString(),
      products: items
        ? items.map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`)
        : [o.productName],
      amount: o.amount,
      commission: o.partnerCommission,
      state: commissionState(o.status),
    };
  });
  const settings = toStorefrontSettings(store);
  const origin = storeOrigin(store.subdomain!);

  return (
    <div className={displayFont.className}>
      <PartnerDashboard
        storeName={store.name || store.subdomain!}
        logoUrl={store.logoUrl}
        accent={settings.accent}
        partner={{
          name: partner.name,
          slug: partner.slug,
          startsAt: partner.startsAt?.toISOString() ?? null,
          expiresAt: partner.expiresAt.toISOString(),
          suspended: partner.suspended,
          commissionType: partner.commissionType as CommissionType,
          commissionValue: partner.commissionValue,
          productSlug: partner.productSlug,
          productTitle: partner.productSlug ? (titles.get(partner.productSlug) ?? null) : null,
          paidAmount: partner.paidAmount,
          paidAt: partner.paidAt?.toISOString() ?? null,
        }}
        stats={stats.get(partner.id)!}
        affiliateUrl={`${origin}/?ref=${encodeURIComponent(partner.slug)}`}
        orders={orders}
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        token={token!}
      />
    </div>
  );
}
