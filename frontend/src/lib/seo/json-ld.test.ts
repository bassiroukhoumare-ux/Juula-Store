import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FunnelPageConfig } from '@/types/juula';
import { JsonLd, isoCurrency, productLd, storeLd } from './json-ld';

const config = (over: Partial<FunnelPageConfig> = {}) =>
  ({
    productTitle: 'Montre </script><script>alert(1)</script>',
    price: 25000,
    currency: 'FCFA',
    mediaItems: [{ id: '1', type: 'image', url: 'https://img.example/a.jpg' }],
    reviews: [
      { id: 'r1', authorName: 'Awa', rating: 5, comment: 'Top', date: '', verified: true },
      { id: 'r2', authorName: 'Fatou', rating: 4, comment: 'Bien', date: '', verified: true },
    ],
    ...over,
  }) as FunnelPageConfig;

describe('JsonLd', () => {
  it('cannot be broken out of with merchant-controlled text', () => {
    const html = renderToStaticMarkup(
      createElement(JsonLd, { data: { name: config().productTitle } }),
    );
    expect(html).not.toContain('</script><script>');
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    const json = html.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    expect(JSON.parse(json).name).toBe(config().productTitle);
  });
});

describe('isoCurrency', () => {
  it.each([
    ['FCFA', 'XOF'],
    ['xof', 'XOF'],
    ['EUR', 'EUR'],
    ['', 'XOF'],
    ['francs', 'XOF'],
  ])('%s → %s', (input, out) => expect(isoCurrency(input)).toBe(out));
});

describe('productLd', () => {
  it('builds Product + Offer + rating + breadcrumb', () => {
    const [product, crumbs] = productLd({
      config: config(),
      slug: 'montre',
      url: 'https://awa.juula.store/montre',
      storeName: 'Awa Shop',
      storeUrl: 'https://awa.juula.store',
      description: 'Belle montre',
    });
    expect(product).toMatchObject({
      '@type': 'Product',
      image: ['https://img.example/a.jpg'],
      offers: { price: '25000', priceCurrency: 'XOF', availability: 'https://schema.org/InStock' },
      aggregateRating: { ratingValue: '4.5', reviewCount: 2 },
    });
    expect(crumbs).toMatchObject({ '@type': 'BreadcrumbList' });
  });

  it('marks an empty stock as OutOfStock and skips ratings without reviews', () => {
    const [product] = productLd({
      config: config({ stockQuantity: 0, reviews: [] }),
      slug: 's',
      url: 'https://x.juula.store/s',
      storeName: null,
      storeUrl: null,
      description: 'd',
    });
    expect(product).toMatchObject({ offers: { availability: 'https://schema.org/OutOfStock' } });
    expect(product).not.toHaveProperty('aggregateRating');
  });
});

describe('storeLd', () => {
  it('lists only products that have a page', () => {
    const ld = storeLd({
      name: 'Awa Shop',
      url: 'https://awa.juula.store',
      description: 'd',
      products: [
        { title: 'A', url: 'https://awa.juula.store/a' },
        { title: 'B', url: null },
      ],
    });
    expect(ld).toMatchObject({
      '@type': 'OnlineStore',
      hasOfferCatalog: { itemListElement: [{ position: 1, name: 'A' }] },
    });
  });
});
