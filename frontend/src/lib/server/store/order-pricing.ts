import 'server-only';
// Server-side prices of public orders: the shop cart, a product-page order
// (with its optional « souvent acheté avec » extras) and the promo code.
// Used by the order routes and by the promo-code check, so the customer
// always sees the amounts the server will charge.
import type { Product, Store } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { productConfig } from '@/lib/server/store/products';
import { shopSellableSlugs } from '@/lib/server/store/storefront';
import { computeDeliveryFee, computeOrderPricing } from '@/lib/store/pricing';
import { bundleDiscountFor, bundlePrice, parseCrossSell } from '@/lib/store/marketing';
import type { OrderItem } from '@/types/juula';

export interface PricingFail {
  ok: false;
  status: number;
  error: string;
  message: string;
}

export interface PricedOrder {
  ok: true;
  items: OrderItem[];
  /** Items total (after quantity and bundle discounts). */
  amount: number;
  deliveryFee: number;
  quantity: number;
}

interface Line {
  slug: string;
  quantity: number;
  color?: string | undefined;
}

const fail = (status: number, error: string, message: string): PricingFail => ({
  ok: false,
  status,
  error,
  message,
});

function lineOf(
  product: Product,
  quantity: number,
  color: string | undefined,
  unitPrice: number,
): OrderItem {
  const config = productConfig(product);
  const validColor = (config.availableColors ?? []).some((c) => c.name === color);
  return {
    productId: product.id,
    slug: product.slug,
    name: config.productTitle || product.internalName,
    image: config.mediaItems.find((m) => m.type === 'image')?.url ?? null,
    quantity,
    unitPrice,
    lineTotal: unitPrice * quantity,
    color: validColor ? (color ?? null) : null,
    ...(unitPrice < config.price ? { originalUnitPrice: config.price } : {}),
  };
}

/** Shop cart: sellable products only; « acheté ensemble » prices applied. */
export async function priceShopCart(
  store: Store,
  lines: Line[],
  paymentType?: string,
): Promise<PricedOrder | PricingFail> {
  const slugs = [...new Set(lines.map((l) => l.slug))];
  const inCollections = shopSellableSlugs(store);
  const products = (
    await prisma.product.findMany({
      where: { slug: { in: slugs }, userId: store.userId, status: { not: 'inactive' } },
    })
  ).filter((p) => productConfig(p).showInStore === true || inCollections.has(p.slug));
  if (products.length !== slugs.length) {
    return fail(
      409,
      'PRODUCT_NOT_AVAILABLE',
      'Un article de votre panier n’est plus disponible. Retirez-le et réessayez.',
    );
  }
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const crossSellOf = (slug: string) => {
    const p = bySlug.get(slug);
    return parseCrossSell(p ? productConfig(p).crossSell : null);
  };

  let deliveryFee = 0;
  const items: OrderItem[] = [];
  for (const line of lines) {
    const product = bySlug.get(line.slug)!;
    const config = productConfig(product);
    if (paymentType === 'cod' && config.codEnabled === false) {
      return fail(
        400,
        'PAYMENT_METHOD_DISABLED',
        `« ${config.productTitle} » n’est pas payable à la livraison.`,
      );
    }
    deliveryFee = Math.max(deliveryFee, computeDeliveryFee(config));
    const pct = bundleDiscountFor(line.slug, slugs, crossSellOf);
    items.push(lineOf(product, line.quantity, line.color, bundlePrice(config.price, pct)));
  }
  return {
    ok: true,
    items,
    amount: items.reduce((s, i) => s + i.lineTotal, 0),
    deliveryFee,
    quantity: items.reduce((s, i) => s + i.quantity, 0),
  };
}

/**
 * Product page: the main product (quantity tiers) plus, optionally, its
 * suggested products at the « acheté ensemble » price (1 of each).
 */
export async function priceProductOrder(
  product: Product,
  quantity: number,
  color: string | undefined,
  extras: { slug: string; color?: string | undefined }[],
): Promise<PricedOrder | PricingFail> {
  const config = productConfig(product);
  const pricing = computeOrderPricing(config, quantity);
  const main: OrderItem = {
    ...lineOf(product, quantity, color, config.price),
    lineTotal: pricing.amount,
  };
  const items: OrderItem[] = [main];
  let deliveryFee = pricing.deliveryFee;

  if (extras.length > 0) {
    const crossSell = parseCrossSell(config.crossSell);
    const wanted = [...new Set(extras.map((e) => e.slug))].filter(
      (s) => crossSell.slugs.includes(s) && s !== product.slug,
    );
    if (wanted.length !== extras.length) {
      return fail(409, 'EXTRA_NOT_AVAILABLE', 'Un article suggéré n’est plus disponible.');
    }
    const found = await prisma.product.findMany({
      where: { slug: { in: wanted }, userId: product.userId, status: { not: 'inactive' } },
    });
    if (found.length !== wanted.length) {
      return fail(409, 'EXTRA_NOT_AVAILABLE', 'Un article suggéré n’est plus disponible.');
    }
    for (const extra of extras) {
      const p = found.find((f) => f.slug === extra.slug)!;
      const c = productConfig(p);
      deliveryFee = Math.max(deliveryFee, computeDeliveryFee(c));
      items.push(lineOf(p, 1, extra.color, bundlePrice(c.price, crossSell.discountPercent)));
    }
  }
  return {
    ok: true,
    items,
    amount: items.reduce((s, i) => s + i.lineTotal, 0),
    deliveryFee,
    quantity: items.reduce((s, i) => s + i.quantity, 0),
  };
}
