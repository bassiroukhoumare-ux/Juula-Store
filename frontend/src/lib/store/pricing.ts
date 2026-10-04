// Order pricing for a product page. Mirrors the computation the
// ImmersiveShowcase displays to the customer, so the server can re-price
// every public order from the stored product config instead of trusting
// the amount sent by the browser.
import type { FunnelPageConfig, QuantityDiscountTier } from '@/types/juula';

// Same fallback tiers the showcase renders when the merchant configured none.
export const DEFAULT_QUANTITY_TIERS: QuantityDiscountTier[] = [
  { id: 't1', minQty: 1, discountType: 'percent', discountValue: 0, label: '1 Pièce (Standard)' },
  {
    id: 't2',
    minQty: 2,
    discountType: 'percent',
    discountValue: 10,
    label: 'Pack Duo — 2 Pièces (-10%)',
    isPopular: true,
  },
  {
    id: 't3',
    minQty: 3,
    discountType: 'percent',
    discountValue: 20,
    label: 'Pack Famille — 3 Pièces (-20%)',
  },
];

export interface OrderPricing {
  subtotal: number; // price × quantity, before discount
  discount: number;
  amount: number; // subtotal after discount
  deliveryFee: number;
  total: number;
}

export function computeDeliveryFee(
  config: Pick<
    FunnelPageConfig,
    'deliveryPricingType' | 'fixedDeliveryFee' | 'deliveryFree' | 'deliveryFee'
  >,
): number {
  if (config.deliveryPricingType === 'fixed') return config.fixedDeliveryFee || 0;
  if (config.deliveryFree) return 0;
  return config.deliveryFee ?? 0;
}

export function computeOrderPricing(config: FunnelPageConfig, quantity: number): OrderPricing {
  const tiers =
    config.quantityDiscounts && config.quantityDiscounts.length > 0
      ? config.quantityDiscounts
      : DEFAULT_QUANTITY_TIERS;
  const activeTier = [...tiers]
    .sort((a, b) => b.minQty - a.minQty)
    .find((t) => quantity >= t.minQty);

  const subtotal = config.price * quantity;
  let discount = 0;
  if (config.quantityDiscountsEnabled !== false && activeTier && activeTier.discountValue > 0) {
    discount =
      activeTier.discountType === 'percent'
        ? Math.round((subtotal * activeTier.discountValue) / 100)
        : Math.max(0, subtotal - activeTier.discountValue * quantity);
  }

  const amount = subtotal - discount;
  const deliveryFee = computeDeliveryFee(config);
  return { subtotal, discount, amount, deliveryFee, total: amount + deliveryFee };
}
