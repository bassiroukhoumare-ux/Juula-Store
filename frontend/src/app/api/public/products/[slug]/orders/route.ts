// POST /api/public/products/[slug]/orders — a customer places an order from
// a public product page (/p/[slug]).
//
// Unauthenticated by design (customers have no account), so:
//   - no CSRF: the route reads no cookies and acts on no session;
//   - per-IP rate limit (10 / 10 min);
//   - the price is recomputed server-side from the stored product config —
//     the browser only sends the quantity, never an amount;
//   - payment status is never trusted from the client: online orders start
//     as `pending_online` until a payment webhook confirms them.
export const runtime = 'nodejs';

import 'server-only';
import { after, NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { productConfig } from '@/lib/server/store/products';
import { nextOrderNumber, publicOrderRateLimit } from '@/lib/server/store/orders';
import { computeOrderPricing } from '@/lib/store/pricing';
import { sendNewOrderEmail } from '@/lib/server/store/notify';
import { formatOrderId, getStoreCode } from '@/lib/orderUtils';

const Body = z.object({
  customerName: z.string().trim().min(2).max(120),
  whatsappNumber: z
    .string()
    .transform((v) => v.replace(/[^\d]/g, ''))
    .refine((v) => v.length >= 7 && v.length <= 15, { message: 'PHONE_INVALID' }),
  neighborhood: z.string().trim().max(120).optional(),
  deliveryAddress: z.string().trim().max(500).optional(),
  hasVoiceNote: z.boolean().optional(),
  quantity: z.number().int().min(1).max(100),
  selectedColor: z.string().trim().max(60).optional(),
  paymentType: z.enum(['cod', 'online_wave', 'online_orange']),
});

export async function POST(
  req: NextRequest,
  routeCtx: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };

    const retryAfter = await publicOrderRateLimit(req);
    if (retryAfter !== null) {
      return NextResponse.json(
        { error: 'TOO_MANY_ORDERS', message: 'Trop de commandes, réessayez dans quelques minutes' },
        { status: 429, headers: { ...headers, 'Retry-After': String(retryAfter) } },
      );
    }

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_FAILED',
          message: 'Informations de commande invalides',
          issues: parsed.error.issues,
        },
        { status: 400, headers },
      );
    }
    const input = parsed.data;
    if (!input.deliveryAddress && !input.hasVoiceNote) {
      return NextResponse.json(
        { error: 'ADDRESS_REQUIRED', message: 'Adresse de livraison requise' },
        { status: 400, headers },
      );
    }

    const { slug } = await routeCtx.params;
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product || product.status !== 'published') {
      return NextResponse.json(
        { error: 'PRODUCT_NOT_AVAILABLE', message: "Ce produit n'est plus disponible" },
        { status: 404, headers },
      );
    }

    const config = productConfig(product);
    const isOnline = input.paymentType !== 'cod';
    if (
      (isOnline && config.mobileMoneyEnabled === false) ||
      (!isOnline && config.codEnabled === false)
    ) {
      return NextResponse.json(
        { error: 'PAYMENT_METHOD_DISABLED', message: 'Moyen de paiement indisponible' },
        { status: 400, headers },
      );
    }

    const pricing = computeOrderPricing(config, input.quantity);
    const storeCode = config.storeCode || getStoreCode(config.storeName || 'Juula Store');
    const productName =
      input.quantity > 1 ? `${config.productTitle} (×${input.quantity})` : config.productTitle;
    const colorValid = (config.availableColors ?? []).some((c) => c.name === input.selectedColor);
    // Senegal numbers: accept "77 123 45 67" or "221771234567".
    const digits = input.whatsappNumber;
    const localNumber = digits.startsWith('221') && digits.length > 9 ? digits.slice(3) : digits;
    const address =
      input.deliveryAddress ||
      `[Note vocale envoyée par le client] ${input.neighborhood ?? ''}`.trim();

    const order = await prisma.$transaction(async (tx) => {
      const number = await nextOrderNumber(tx, product.userId);
      return tx.storeOrder.create({
        data: {
          merchantId: product.userId,
          productId: product.id,
          number,
          reference: formatOrderId(storeCode, number),
          productName,
          productImage: config.mediaItems.find((m) => m.type === 'image')?.url ?? null,
          quantity: input.quantity,
          selectedColor: colorValid ? (input.selectedColor ?? null) : null,
          amount: pricing.amount,
          deliveryFee: pricing.deliveryFee,
          totalAmount: pricing.total,
          currency: config.currency || 'FCFA',
          customerName: input.customerName,
          phone: `+221 ${localNumber}`,
          whatsappNumber: `221${localNumber}`,
          neighborhood: input.neighborhood ?? null,
          city: 'Dakar',
          deliveryAddress: address,
          deliveryNotes: isOnline
            ? `Paiement en ligne (${input.paymentType === 'online_wave' ? 'Wave' : 'Orange Money'}) — à vérifier`
            : 'Paiement en espèces à la livraison',
          paymentType: input.paymentType,
          paymentStatus: isOnline ? 'pending_online' : 'pending_cod',
        },
      });
    });

    // Email the merchant once the response is sent (never blocks the customer).
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
