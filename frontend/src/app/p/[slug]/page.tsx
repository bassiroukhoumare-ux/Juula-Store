// /p/[slug] — public product page, the link merchants share on Facebook,
// TikTok, WhatsApp… Published products are visible to everyone; a draft or
// deactivated product is only visible to its owner, as a preview.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { optionalAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { productConfig } from '@/lib/server/store/products';
import { PublicProductView } from '@/components/showcase/PublicProductView';
import type { StorePixels } from '@/lib/store/pixels';

// Edits must show up on the shared link immediately.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const loadProduct = cache(async (slug: string) => {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      user: { select: { store: { select: { facebookPixelId: true, tiktokPixelId: true } } } },
    },
  });
  if (!product) return null;
  if (product.status === 'published') return { product, isPreview: false };
  const viewer = await optionalAuth();
  if (viewer?.user.sub === product.userId) return { product, isPreview: true };
  return null;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const found = await loadProduct(slug);
  if (!found) return { title: 'Produit introuvable — Juula Store' };

  const config = productConfig(found.product);
  const image = config.mediaItems.find((m) => m.type === 'image')?.url;
  const title = config.storeName
    ? `${config.productTitle} — ${config.storeName}`
    : config.productTitle;
  const description =
    config.benefits?.filter(Boolean).slice(0, 2).join(' · ') ||
    config.deliveryNotice ||
    'Commandez en ligne, paiement à la livraison.';
  const appUrl = process.env.APP_URL;

  return {
    title,
    description,
    ...(appUrl ? { metadataBase: new URL(appUrl) } : {}),
    alternates: { canonical: `/p/${found.product.slug}` },
    ...(found.isPreview ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/p/${found.product.slug}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function PublicProductPage({ params }: PageProps) {
  const { slug } = await params;
  const found = await loadProduct(slug);
  if (!found) notFound();

  const store = found.product.user.store;
  const pixels: StorePixels = {
    facebookPixelId: store?.facebookPixelId ?? null,
    tiktokPixelId: store?.tiktokPixelId ?? null,
  };

  return (
    <PublicProductView
      config={productConfig(found.product)}
      pixels={pixels}
      isPreview={found.isPreview}
    />
  );
}
