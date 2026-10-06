// POST /api/public/stores/[shop]/orders — a customer checks out the cart of
// a shop (<shop>.juula.store): one order, several products.
//
// Same guarantees as the product-page order route: unauthenticated (no CSRF,
// no cookies read), per-IP rate limit, prices recomputed server-side from the
// stored product configs (the browser only sends slugs and quantities), and
// payment options enforced from the merchant's plan.
export const runtime = 'nodejs';

import 'server-only';
import { after, NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { productConfig } from '@/lib/server/store/products';
import { nextOrderNumber, publicOrderRateLimit } from '@/lib/server/store/orders';
import { loadStoreBySubdomain } from '@/lib/server/store/public';
import { customerPhone, decidePayment } from '@/lib/server/store/checkout';
import { isStoreLive, shopSellableSlugs } from '@/lib/server/store/storefront';
import { sendNewOrderEmail } from '@/lib/server/store/notify';
import { computeDeliveryFee } from '@/lib/store/pricing';
import { formatOrderId, getStoreCode } from '@/lib/orderUtils';
import type { OrderItem } from '@/types/juula';
import type { Prisma } from '@prisma/client';

const Body = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().min(1).max(120),
        quantity: z.number().int().min(1).max(100),
        color: z.string().trim().max(60).optional(),
      }),
    )
    .min(1)
    .max(20),
  customerName: z.string().trim().min(2).max(120),
  whatsappNumber: z
    .string()
    .transform((v) => v.replace(/[^\d]/g, ''))
    .refine((v) => v.length >= 7 && v.length <= 15, { message: 'PHONE_INVALID' }),
  address: z.string().trim().min(3).max(300),
  addressDetails: z.string().trim().max(500).optional(),
  paymentType: z.enum(['cod', 'online_momo', 'online_wave', 'online_orange', 'direct', 'whatsapp']),
  directMethodId: z.string().max(40).optional(),
});

export async function POST(
  req: NextRequest,
  routeCtx: { params: Promise<{ shop: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const fail = (status: number, error: string, message: string) =>
      NextResponse.json({ error, message }, { status, headers });

    const retryAfter = await publicOrderRateLimit(req);
    if (retryAfter !== null) {
      return NextResponse.json(
        { error: 'TOO_MANY_ORDERS', message: 'Trop de commandes, réessayez dans quelques minutes' },
        { status: 429, headers: { ...headers, 'Retry-After': String(retryAfter) } },
      );
    }

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail(400, 'VALIDATION_FAILED', 'Informations de commande invalides');
    }
    const input = parsed.data;

    const { shop } = await routeCtx.params;
    const found = await loadStoreBySubdomain(shop.toLowerCase());
    if (found.kind !== 'store' || !found.store.storefrontPublished || !isStoreLive(found.store)) {
      return fail(404, 'STORE_NOT_AVAILABLE', 'Cette boutique n’est pas disponible.');
    }
    const store = found.store;

    const payment = decidePayment(store, input.paymentType, input.directMethodId);
    if (!payment.ok) return fail(payment.status, payment.error, payment.message);

    const slugs = [...new Set(input.items.map((i) => i.slug))];
    // Shop products: made visible in the shop or placed in a banner / section
    // (independent of the product's own sales page), never deactivated ones.
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

    let deliveryFee = 0;
    const items: OrderItem[] = [];
    for (const line of input.items) {
      const product = products.find((p) => p.slug === line.slug)!;
      const config = productConfig(product);
      if (input.paymentType === 'cod' && config.codEnabled === false) {
        return fail(
          400,
          'PAYMENT_METHOD_DISABLED',
          `« ${config.productTitle} » n’est pas payable à la livraison.`,
        );
      }
      deliveryFee = Math.max(deliveryFee, computeDeliveryFee(config));
      const color = (config.availableColors ?? []).some((c) => c.name === line.color)
        ? (line.color ?? null)
        : null;
      items.push({
        productId: product.id,
        slug: product.slug,
        name: config.productTitle || product.internalName,
        image: config.mediaItems.find((m) => m.type === 'image')?.url ?? null,
        quantity: line.quantity,
        unitPrice: config.price,
        lineTotal: config.price * line.quantity,
        color,
      });
    }

    const amount = items.reduce((s, i) => s + i.lineTotal, 0);
    const quantity = items.reduce((s, i) => s + i.quantity, 0);
    const first = items[0]!;
    const productName =
      items.length === 1
        ? first.quantity > 1
          ? `${first.name} (×${first.quantity})`
          : first.name
        : `${first.name} + ${items.length - 1} autre${items.length > 2 ? 's' : ''} article${items.length > 2 ? 's' : ''}`;
    const storeCode = getStoreCode(store.name || store.subdomain || 'Juula Store');
    const { phone, whatsappNumber } = customerPhone(input.whatsappNumber);

    const order = await prisma.$transaction(async (tx) => {
      const number = await nextOrderNumber(tx, store.userId);
      return tx.storeOrder.create({
        data: {
          merchantId: store.userId,
          productId: items.length === 1 ? first.productId : null,
          number,
          reference: formatOrderId(storeCode, number),
          productName,
          productImage: first.image,
          quantity,
          selectedColor: items.length === 1 ? first.color : null,
          amount,
          deliveryFee,
          totalAmount: amount + deliveryFee,
          currency: 'FCFA',
          customerName: input.customerName,
          phone,
          whatsappNumber,
          neighborhood: input.address,
          city: null,
          deliveryAddress: [input.address, input.addressDetails].filter(Boolean).join(' — '),
          deliveryNotes: payment.deliveryNotes,
          paymentType: input.paymentType,
          paymentStatus: payment.paymentStatus,
          paymentMethodName: payment.paymentMethodName,
          items: items as unknown as Prisma.InputJsonValue,
        },
      });
    });

    after(() => sendNewOrderEmail(order.id));

    return NextResponse.json(
      {
        order: {
          id: order.id,
          reference: order.reference,
          amount: order.amount,
          deliveryFee: order.deliveryFee,
          totalAmount: order.totalAmount,
          currency: order.currency,
        },
      },
      { status: 201, headers },
    );
  });
}
