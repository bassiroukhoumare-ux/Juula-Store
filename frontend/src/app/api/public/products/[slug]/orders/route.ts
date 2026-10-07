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

import { pushNewOrder } from '@/lib/server/push';
import 'server-only';
import { after, NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { productConfig } from '@/lib/server/store/products';
import { nextOrderNumber, publicOrderRateLimit } from '@/lib/server/store/orders';
import { sendNewOrderEmail } from '@/lib/server/store/notify';
import { formatOrderId, getStoreCode } from '@/lib/orderUtils';
import { decidePayment } from '@/lib/server/store/checkout';
import { priceProductOrder } from '@/lib/server/store/order-pricing';
import { activePartner } from '@/lib/server/store/partners';
import { computeCommission } from '@/lib/store/partners';
import { checkPromo, consumePromo, PromoExhaustedError } from '@/lib/server/store/promo';
import type { Prisma } from '@prisma/client';
import { isStoreLive } from '@/lib/server/store/storefront';
import { clearCheckoutDraft } from '@/lib/server/store/analytics';

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
  paymentType: z.enum(['cod', 'online_momo', 'online_wave', 'online_orange', 'direct', 'whatsapp']),
  /** paymentType 'direct': id of the merchant's payment link. */
  directMethodId: z.string().max(40).optional(),
  /** Anonymous analytics visitor id: clears this visitor's abandoned checkout. */
  visitorId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,64}$/)
    .optional(),
  /** « Souvent acheté avec » items the customer ticked (1 of each). */
  extras: z
    .array(
      z.object({ slug: z.string().min(1).max(120), color: z.string().trim().max(60).optional() }),
    )
    .max(3)
    .optional(),
  promoCode: z.string().trim().max(40).optional(),
  partnerRef: z.string().trim().max(60).optional(),
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
    const product = await prisma.product.findUnique({
      where: { slug },
      include: { user: { select: { store: true } } },
    });
    if (!product || product.status !== 'published') {
      return NextResponse.json(
        { error: 'PRODUCT_NOT_AVAILABLE', message: "Ce produit n'est plus disponible" },
        { status: 404, headers },
      );
    }

    const store = product.user?.store ?? null;
    if (!isStoreLive(store)) {
      return NextResponse.json(
        { error: 'STORE_OFFLINE', message: 'Cette boutique n’est pas en ligne pour le moment.' },
        { status: 404, headers },
      );
    }
    const payment = decidePayment(store, input.paymentType, input.directMethodId);
    if (!payment.ok) {
      return NextResponse.json(
        { error: payment.error, message: payment.message },
        { status: payment.status, headers },
      );
    }

    const config = productConfig(product);
    const isOnline = input.paymentType.startsWith('online_');
    if (
      (isOnline && config.mobileMoneyEnabled === false) ||
      (input.paymentType === 'cod' && config.codEnabled === false)
    ) {
      return NextResponse.json(
        { error: 'PAYMENT_METHOD_DISABLED', message: 'Moyen de paiement indisponible' },
        { status: 400, headers },
      );
    }

    const priced = await priceProductOrder(
      product,
      input.quantity,
      input.selectedColor,
      input.extras ?? [],
    );
    if (!priced.ok) {
      return NextResponse.json(
        { error: priced.error, message: priced.message },
        { status: priced.status, headers },
      );
    }
    const hasExtras = priced.items.length > 1;

    // Promo code: checked here (clear error), counted inside the order transaction.
    let promo: { id: string; code: string; discount: number } | null = null;
    if (input.promoCode) {
      const checked = await checkPromo(
        prisma,
        product.userId,
        input.promoCode,
        priced.amount,
        priced.deliveryFee,
      );
      if (!checked.ok) {
        return NextResponse.json(
          { error: checked.error, message: checked.message },
          { status: 400, headers },
        );
      }
      promo = { id: checked.id, code: checked.code, discount: checked.discount };
    }
    const storeCode = config.storeCode || getStoreCode(config.storeName || 'Juula Store');
    const mainName =
      input.quantity > 1 ? `${config.productTitle} (×${input.quantity})` : config.productTitle;
    const productName = hasExtras
      ? `${mainName} + ${priced.items.length - 1} article${priced.items.length > 2 ? 's' : ''} suggéré${priced.items.length > 2 ? 's' : ''}`
      : mainName;
    const colorValid = (config.availableColors ?? []).some((c) => c.name === input.selectedColor);
    // Senegal numbers: accept "77 123 45 67" or "221771234567".
    const digits = input.whatsappNumber;
    const localNumber = digits.startsWith('221') && digits.length > 9 ? digits.slice(3) : digits;
    const address =
      input.deliveryAddress ||
      `[Note vocale envoyée par le client] ${input.neighborhood ?? ''}`.trim();

    // Affiliate: only while the campaign is active; commission on products only.
    const partner = await activePartner(prisma, product.userId, input.partnerRef);
    const partnerCommission = partner ? computeCommission(priced.items, partner) : 0;

    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        if (promo && !(await consumePromo(tx, promo.id))) throw new PromoExhaustedError();
        const number = await nextOrderNumber(tx, product.userId);
        return tx.storeOrder.create({
          data: {
            merchantId: product.userId,
            productId: product.id,
            number,
            reference: formatOrderId(storeCode, number),
            productName,
            productImage: config.mediaItems.find((m) => m.type === 'image')?.url ?? null,
            quantity: priced.quantity,
            selectedColor: colorValid ? (input.selectedColor ?? null) : null,
            amount: priced.amount,
            deliveryFee: priced.deliveryFee,
            totalAmount: priced.amount + priced.deliveryFee - (promo?.discount ?? 0),
            promoCode: promo?.code ?? null,
            discountAmount: promo?.discount ?? 0,
            partnerId: partner?.id ?? null,
            partnerCommission,
            ...(hasExtras ? { items: priced.items as unknown as Prisma.InputJsonValue } : {}),
            currency: config.currency || 'FCFA',
            customerName: input.customerName,
            phone: `+221 ${localNumber}`,
            whatsappNumber: `221${localNumber}`,
            neighborhood: input.neighborhood ?? null,
            city: 'Dakar',
            deliveryAddress: address,
            deliveryNotes: payment.deliveryNotes,
            paymentType: input.paymentType,
            paymentStatus: payment.paymentStatus,
            paymentMethodName: payment.paymentMethodName,
          },
        });
      });
    } catch (err) {
      if (err instanceof PromoExhaustedError) {
        return NextResponse.json(
          {
            error: 'PROMO_EXHAUSTED',
            message: 'Ce code promo a déjà été utilisé le nombre de fois prévu.',
          },
          { status: 409, headers },
        );
      }
      throw err;
    }

    // Email the merchant once the response is sent (never blocks the customer).
    after(() => sendNewOrderEmail(order.id));
    // Instant push to the merchant's phone / browser (if subscribed).
    after(() => pushNewOrder(order.id));
    if (input.visitorId) {
      const visitorId = input.visitorId;
      after(() => clearCheckoutDraft(product.id, visitorId));
    }

    return NextResponse.json(
      {
        order: {
          id: order.id,
          reference: order.reference,
          amount: order.amount,
          deliveryFee: order.deliveryFee,
          totalAmount: order.totalAmount,
          discountAmount: order.discountAmount,
          promoCode: order.promoCode,
          currency: order.currency,
        },
      },
      { status: 201, headers },
    );
  });
}
