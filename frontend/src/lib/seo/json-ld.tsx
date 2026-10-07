// schema.org structured data (JSON-LD) for rich results: platform identity on
// www, OnlineStore on each shop, Product + Offer + BreadcrumbList on product
// pages. Values come from merchant input, so the JSON is serialised with `<`
// escaped — a product title containing "</script>" cannot break out.
import { createElement } from 'react';
import type { FunnelPageConfig } from '@/types/juula';

type Json = Record<string, unknown>;

export function JsonLd({ data }: { data: Json | Json[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: json },
  });
}

export const PLATFORM_URL = process.env.APP_URL || 'https://www.juula.store';

/** Prices are stored in FCFA: schema.org wants the ISO 4217 code. */
export function isoCurrency(currency: string | undefined): string {
  const c = (currency ?? '').trim().toUpperCase();
  if (!c || c === 'FCFA' || c === 'CFA' || c === 'F') return 'XOF';
  return /^[A-Z]{3}$/.test(c) ? c : 'XOF';
}

export function platformLd(): Json[] {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${PLATFORM_URL}/#organization`,
    name: 'Juula',
    url: PLATFORM_URL,
    logo: `${PLATFORM_URL}/icons/icon-512.png`,
  };
  const site = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${PLATFORM_URL}/#website`,
    name: 'Juula Store',
    url: PLATFORM_URL,
    inLanguage: 'fr',
    publisher: { '@id': `${PLATFORM_URL}/#organization` },
  };
  const app = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Juula Store',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android, iOS',
    url: PLATFORM_URL,
    description:
      'Créez votre boutique en ligne et vos pages produits, encaissez par Wave, Orange Money, carte bancaire ou à la livraison.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'XOF' },
    publisher: { '@id': `${PLATFORM_URL}/#organization` },
  };
  return [org, site, app];
}

export function storeLd(input: {
  name: string;
  url: string;
  logo?: string | null | undefined;
  image?: string | null | undefined;
  description: string;
  products: { title: string; url: string | null }[];
}): Json {
  const items = input.products.filter((p) => p.url).slice(0, 50);
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': `${input.url}/#store`,
    name: input.name,
    url: input.url,
    description: input.description,
    ...(input.logo ? { logo: input.logo } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(items.length
      ? {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: `Produits ${input.name}`,
            itemListElement: items.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: p.title,
              url: p.url,
            })),
          },
        }
      : {}),
  };
}

export function productLd(input: {
  config: FunnelPageConfig;
  slug: string;
  url: string;
  storeName: string | null;
  storeUrl: string | null;
  description: string;
}): Json[] {
  const { config } = input;
  const images = config.mediaItems
    .filter((m) => m.type === 'image')
    .map((m) => m.url)
    .slice(0, 6);
  const reviews = (config.reviews ?? []).filter((r) => r.rating >= 1 && r.rating <= 5);
  const outOfStock = typeof config.stockQuantity === 'number' && config.stockQuantity <= 0;
  const product: Json = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: config.productTitle,
    sku: input.slug,
    url: input.url,
    description: input.description,
    ...(images.length ? { image: images } : {}),
    ...(input.storeName ? { brand: { '@type': 'Brand', name: input.storeName } } : {}),
    offers: {
      '@type': 'Offer',
      url: input.url,
      price: String(Math.max(0, Math.round(config.price))),
      priceCurrency: isoCurrency(config.currency),
      availability: outOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      ...(input.storeName ? { seller: { '@type': 'Organization', name: input.storeName } } : {}),
    },
    ...(reviews.length
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1),
            reviewCount: reviews.length,
          },
          review: reviews.slice(0, 5).map((r) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: r.authorName || 'Client' },
            reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
            reviewBody: r.comment,
          })),
        }
      : {}),
  };
  if (!input.storeName || !input.storeUrl) return [product];
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: input.storeName, item: input.storeUrl },
      { '@type': 'ListItem', position: 2, name: config.productTitle, item: input.url },
    ],
  };
  return [product, breadcrumb];
}
