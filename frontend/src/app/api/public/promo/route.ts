// POST /api/public/promo — « Appliquer » a promo code on a product page or the
// shop checkout. Prices are recomputed here from the stored products (the
// browser only sends slugs and quantities); nothing is consumed — the code is
// counted when the order is placed. Rate limited per IP (no code guessing).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { loadStoreBySubdomain } from '@/lib/server/store/public';
import { isStoreLive } from '@/lib/server/store/storefront';
import { priceProductOrder, priceShopCart } from '@/lib/server/store/order-pricing';
import { checkPromo, promoCheckRateLimit } from '@/lib/server/store/promo';

const Line = z.object({
  slug: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(100),
  color: z.string().trim().max(60).optional(),
});

const Body = z.union([
  z.object({
    code: z.string().trim().min(1).max(40),
    shop: z.string().min(1).max(63),
    items: z.array(Line).min(1).max(20),
  }),
  z.object({
    code: z.string().trim().min(1).max(40),
    productSlug: z.string().min(1).max(120),
    quantity: z.number().int().min(1).max(100),
    color: z.string().trim().max(60).optional(),
    extras: z
      .array(z.object({ slug: z.string().min(1).max(120), color: z.string().max(60).optional() }))
      .max(3)
      .optional(),
  }),
]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const fail = (status: number, error: string, message: string) =>
      NextResponse.json({ ok: false, error, message }, { status, headers });

    const retryAfter = await promoCheckRateLimit(req);
    if (retryAfter !== null) {
      return fail(429, 'TOO_MANY_ATTEMPTS', 'Trop d’essais. Réessayez dans quelques minutes.');
    }
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, 'VALIDATION_FAILED', 'Code promo invalide.');
    const input = parsed.data;

    let merchantId: string;
    let priced;
    if ('shop' in input) {
      const found = await loadStoreBySubdomain(input.shop.toLowerCase());
      if (found.kind !== 'store' || !isStoreLive(found.store)) {
        return fail(404, 'STORE_NOT_AVAILABLE', 'Cette boutique n’est pas disponible.');
      }
      merchantId = found.store.userId;
      priced = await priceShopCart(found.store, input.items);
    } else {
      const product = await prisma.product.findUnique({
        where: { slug: input.productSlug },
        include: { user: { select: { store: true } } },
      });
      if (!product || product.status !== 'published' || !isStoreLive(product.user?.store ?? null)) {
        return fail(404, 'PRODUCT_NOT_AVAILABLE', 'Ce produit n’est plus disponible.');
      }
      merchantId = product.userId;
      priced = await priceProductOrder(product, input.quantity, input.color, input.extras ?? []);
    }
    if (!priced.ok) return fail(priced.status, priced.error, priced.message);

    const checked = await checkPromo(
      prisma,
      merchantId,
      input.code,
      priced.amount,
      priced.deliveryFee,
    );
    if (!checked.ok) return fail(400, checked.error, checked.message);
    return NextResponse.json(
      {
        ok: true,
        code: checked.code,
        label: checked.label,
        discount: checked.discount,
        subtotal: priced.amount,
        deliveryFee: priced.deliveryFee,
        total: priced.amount + priced.deliveryFee - checked.discount,
      },
      { headers },
    );
  });
}
