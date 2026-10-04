import { describe, it, expect } from 'vitest';
import { computeOrderPricing } from './pricing';
import { defaultFunnelConfig } from '@/data/mockData';
import type { FunnelPageConfig } from '@/types/juula';

const base: FunnelPageConfig = {
  ...defaultFunnelConfig,
  price: 10_000,
  deliveryPricingType: 'fixed',
  fixedDeliveryFee: 1_500,
};

describe('computeOrderPricing', () => {
  it('prices a single item with the fixed delivery fee', () => {
    expect(computeOrderPricing({ ...base, quantityDiscountsEnabled: false }, 1)).toEqual({
      subtotal: 10_000,
      discount: 0,
      amount: 10_000,
      deliveryFee: 1_500,
      total: 11_500,
    });
  });

  it('ignores quantity tiers when discounts are disabled', () => {
    expect(computeOrderPricing({ ...base, quantityDiscountsEnabled: false }, 3).total).toBe(31_500);
  });

  it('applies the default percent tiers when enabled without custom tiers', () => {
    const pricing = computeOrderPricing(
      { ...base, quantityDiscountsEnabled: true, quantityDiscounts: [] },
      2,
    );
    expect(pricing.discount).toBe(2_000); // -10% on 20 000
    expect(pricing.total).toBe(19_500);
  });

  it('applies a fixed unit price tier', () => {
    const pricing = computeOrderPricing(
      {
        ...base,
        quantityDiscountsEnabled: true,
        quantityDiscounts: [
          { id: 'a', minQty: 3, discountType: 'fixed_price', discountValue: 8_000 },
        ],
      },
      3,
    );
    expect(pricing.amount).toBe(24_000);
  });

  it('charges no delivery when delivery is free', () => {
    const pricing = computeOrderPricing(
      { ...base, deliveryPricingType: 'free', deliveryFree: true, quantityDiscountsEnabled: false },
      1,
    );
    expect(pricing.deliveryFee).toBe(0);
  });
});
