import { bundleDiscountFor, bundlePrice, type CrossSell } from '@/lib/store/marketing';
// Data the server passes to the public shop (<shop>.juula.store).
export interface ShopProduct {
  slug: string;
  /** Sales page link (relative to the current host) when that page is active. */
  pageHref: string | null;
  title: string;
  category: string;
  price: number;
  originalPrice: number;
  images: string[];
  featured: boolean;
  /** Listed in « Nos articles » (otherwise only in its banner / section). */
  inCatalogue: boolean;
  /** Delivery fee of this product (the cart charges the highest one). */
  deliveryFee: number;
  /** Selling points shown in the product sheet. */
  benefits: string[];
  colors: { name: string; hex: string }[];
  deliveryNotice: string;
  /** ISO date: « Nouveautés » are the most recent. */
  createdAt: string;
  /** « Souvent acheté avec » settings of this product. */
  crossSell: CrossSell;
}

export function discountPercent(p: Pick<ShopProduct, 'price' | 'originalPrice'>): number {
  return p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
}

/**
 * Cart prices as the server computes them: « acheté ensemble » unit prices,
 * subtotal and the highest delivery fee of the cart's products.
 */
export function priceCart(
  lines: { key: string; slug: string; price: number; quantity: number }[],
  products: ShopProduct[],
): { unitPrice: Map<string, number>; subtotal: number; deliveryFee: number } {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const slugs = [...new Set(lines.map((l) => l.slug))];
  const crossSellOf = (slug: string) =>
    bySlug.get(slug)?.crossSell ?? { slugs: [], discountPercent: 0 };
  const unitPrice = new Map<string, number>();
  let subtotal = 0;
  let deliveryFee = 0;
  for (const l of lines) {
    const pct = bundleDiscountFor(l.slug, slugs, crossSellOf);
    const price = bundlePrice(l.price, pct);
    unitPrice.set(l.key, price);
    subtotal += price * l.quantity;
    deliveryFee = Math.max(deliveryFee, bySlug.get(l.slug)?.deliveryFee ?? 0);
  }
  return { unitPrice, subtotal, deliveryFee };
}
