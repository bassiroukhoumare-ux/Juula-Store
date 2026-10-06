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
}

export function discountPercent(p: Pick<ShopProduct, 'price' | 'originalPrice'>): number {
  return p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
}
