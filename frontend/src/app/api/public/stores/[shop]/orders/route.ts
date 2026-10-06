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
import { nextOrderNumber, publicOrderRateLimit } from '@/lib/server/store/orders';
import { loadStoreBySubdomain } from '@/lib/server/store/public';
import { customerPhone, decidePayment } from '@/lib/server/store/checkout';
import { priceShopCart } from '@/lib/server/store/order-pricing';
import { activePartner } from '@/lib/server/store/partners';
import { computeCommission } from '@/lib/store/partners';
import { checkPromo, consumePromo, PromoExhaustedError } from '@/lib/server/store/promo';
import { isStoreLive } from '@/lib/server/store/storefront';
import { sendNewOrderEmail } from '@/lib/server/store/notify';
import { formatOrderId, getStoreCode } from '@/lib/orderUtils';
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
  promoCode: z.string().trim().max(40).optional(),
  /** Affiliate link the visitor came through (?ref=), kept 7 days in the browser. */
  partnerRef: z.string().trim().max(60).optional(),
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

    const priced = await priceShopCart(store, input.items, input.paymentType);
    if (!priced.ok) return fail(priced.status, priced.error, priced.message);
    const { items, deliveryFee } = priced;

    // Promo code: checked here (clear error), counted inside the order transaction.
    let promo: { id: string; code: string; discount: number } | null = null;
    if (input.promoCode) {
      const checked = await checkPromo(
        prisma,
        store.userId,
        input.promoCode,
        priced.amount,
        deliveryFee,
      );
      if (!checked.ok) return fail(400, checked.error, checked.message);
      promo = { id: checked.id, code: checked.code, discount: checked.discount };
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

    // Affiliate: only while the campaign is active; commission on products only.
    const partner = await activePartner(prisma, store.userId, input.partnerRef);
    const partnerCommission = partner ? computeCommission(items, partner) : 0;

    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        if (promo && !(await consumePromo(tx, promo.id))) throw new PromoExhaustedError();
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
            totalAmount: amount + deliveryFee - (promo?.discount ?? 0),
            promoCode: promo?.code ?? null,
            discountAmount: promo?.discount ?? 0,
            partnerId: partner?.id ?? null,
            partnerCommission,
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
    } catch (err) {
      if (err instanceof PromoExhaustedError) {
        return fail(
          409,
          'PROMO_EXHAUSTED',
          'Ce code promo a déjà été utilisé le nombre de fois prévu.',
        );
      }
      throw err;
    }

    after(() => sendNewOrderEmail(order.id));

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
