import { describe, expect, it } from 'vitest';
import {
  generateProductNameSuggestionsWithGemini,
  generateFullProductPageWithGemini,
} from './product-page-wizard';
import { generateStorefrontWithGemini } from './storefront-generator';

describe('Product Page & Storefront AI Generators', () => {
  it('generates product name suggestions via fallback when no apiKey', async () => {
    const res = await generateProductNameSuggestionsWithGemini({
      baseIdea: 'Montre connectée',
      category: 'Mode',
    });
    expect(res.suggestions).toBeDefined();
    expect(res.suggestions.length).toBeGreaterThanOrEqual(4);
    expect(
      res.suggestions.some(
        (s) => s.toLowerCase().includes('montre') || s.toLowerCase().includes('pro'),
      ),
    ).toBe(true);
  });

  it('generates full product conversion copy via fallback when no apiKey', async () => {
    const res = await generateFullProductPageWithGemini({
      productName: 'Savon Éclat Bio',
      category: 'Beauté & Santé',
      price: 15000,
      originalPrice: 25000,
      deliveryFree: true,
      deliveryFee: 0,
      hasVideo: true,
    });

    expect(res.benefits.length).toBeGreaterThanOrEqual(4);
    expect(res.description).toContain('Savon Éclat Bio');
    expect(res.faqItems.length).toBeGreaterThanOrEqual(3);
    expect(res.comparison.rows.length).toBeGreaterThanOrEqual(3);
    expect(res.reviews.length).toBeGreaterThanOrEqual(3);
    expect(res.urgencyText).toBeDefined();
    expect(res.ctaButtonText).toBeDefined();
  });

  it('generates storefront copy via fallback when no apiKey', async () => {
    const res = await generateStorefrontWithGemini({
      storeName: 'Teranga Market',
      storeCategory: 'Alimentation',
    });

    expect(res.storeTagline).toBeDefined();
    expect(res.announcementBar.enabled).toBe(true);
    expect(res.storeFaq.length).toBeGreaterThanOrEqual(3);
    expect(res.storeSections.length).toBeGreaterThanOrEqual(1);
    expect(res.storeSections[0]?.placement).toBe('before_products');
  });
});
