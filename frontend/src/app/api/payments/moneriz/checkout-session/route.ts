// POST /api/payments/moneriz/checkout-session — start the online payment of
// a store order placed on a public product page.
//
// Public (the customer has no account) but the browser only sends the order
// id: amount, title and reference all come from the StoreOrder row, so a
// customer can't pay 100 F for a 30 000 F order. The Moneriz session id is
// stored on the order; the payment is confirmed later by re-reading that
// session from the API (see lib/server/store/payments.ts).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';
import { prisma } from '@/lib/server/prisma';
import {
  createMonerizCheckoutSession,
  getMonerizCheckoutSession,
  getMonerizConfig,
  MonerizApiError,
} from '@/lib/server/payments/moneriz';
import { publicOrderRateLimit } from '@/lib/server/store/orders';

const Body = z.object({
  orderId: z.string().min(1).max(64),
  integrationMode: z.enum(['iframe', 'redirect']).default('iframe'),
});

const MIN_AMOUNT = 100;

function publicBaseUrl(req: NextRequest, isLive: boolean): string {
  const origin = req.headers.get('origin');
  const appUrl = process.env.APP_URL;
  const base = appUrl || origin || 'http://localhost:3000';
  // Moneriz live mode requires HTTPS return URLs.
  return isLive && !base.startsWith('https://')
    ? 'https://www.juula.store'
    : base.replace(/\/+$/, '');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };

    const retryAfter = await publicOrderRateLimit(req);
    if (retryAfter !== null) {
      return NextResponse.json(
        {
          error: 'TOO_MANY_REQUESTS',
          message: 'Trop de tentatives, réessayez dans quelques minutes',
        },
        { status: 429, headers: { ...headers, 'Retry-After': String(retryAfter) } },
      );
    }

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Commande manquante' },
        { status: 400, headers },
      );
    }

    const config = getMonerizConfig();
    if (!config.secretKey) {
      return NextResponse.json(
        {
          error: 'PAYMENT_PROVIDER_UNCONFIGURED',
          message: 'Le paiement en ligne est indisponible. Choisissez le paiement à la livraison.',
        },
        { status: 503, headers },
      );
    }

    const order = await prisma.storeOrder.findUnique({
      where: { id: parsed.data.orderId },
      include: { product: { select: { slug: true } } },
    });
    if (!order || order.paymentType === 'cod') {
      return NextResponse.json(
        { error: 'ORDER_NOT_FOUND', message: 'Commande introuvable' },
        { status: 404, headers },
      );
    }
    if (order.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'ORDER_ALREADY_PAID', message: 'Cette commande est déjà payée' },
        { status: 409, headers },
      );
    }
    if (order.totalAmount < MIN_AMOUNT) {
      return NextResponse.json(
        { error: 'AMOUNT_TOO_LOW', message: `Montant minimum : ${MIN_AMOUNT} FCFA` },
        { status: 400, headers },
      );
    }

    const toResponse = (session: Awaited<ReturnType<typeof createMonerizCheckoutSession>>) =>
      NextResponse.json(
        {
          id: session.id,
          checkoutUrl: session.checkoutUrl,
          embedUrl: session.embedUrl,
          integrationMode: session.integrationMode,
          status: session.status,
          amount: session.amount,
          currency: session.currency,
          reference: session.reference,
        },
        { headers },
      );

    try {
      // Customer retried (closed the modal, reopened): reuse the open session.
      if (order.providerSessionId) {
        const existing = await getMonerizCheckoutSession(order.providerSessionId).catch(() => null);
        if (existing && existing.status === 'open') return toResponse(existing);
      }

      const isLive = config.secretKey.startsWith('izp_live_');
      const base = publicBaseUrl(req, isLive);
      const returnPath = order.product ? `/p/${order.product.slug}` : '/';
      const session = await createMonerizCheckoutSession({
        amount: order.totalAmount,
        currency: 'XOF',
        title: order.productName.slice(0, 100),
        // StoreOrder.id (cuid) is globally unique; order references
        // (CMD-XXX-000001) are only unique per merchant.
        reference: order.id,
        country: 'SN',
        integrationMode: parsed.data.integrationMode,
        embedOrigin: req.headers.get('origin') || base,
        successUrl: `${base}${returnPath}?payment=success&order=${order.id}`,
        cancelUrl: `${base}${returnPath}?payment=cancelled&order=${order.id}`,
        metadata: { orderId: order.id, reference: order.reference, merchantId: order.merchantId },
        // A new key per session attempt; the reuse branch above prevents
        // duplicate open sessions for the same order.
        idempotencyKey: `cs-${order.id}-${Date.now()}`,
      });

      await prisma.storeOrder.update({
        where: { id: order.id },
        data: { providerSessionId: session.id },
      });
      return toResponse(session);
    } catch (err) {
      log.error('moneriz.checkout_session_failed', {
        orderId: order.id,
        error: err instanceof Error ? err.message : String(err),
      });
      const status = err instanceof MonerizApiError && err.statusCode < 500 ? 400 : 502;
      return NextResponse.json(
        {
          error: 'PAYMENT_SESSION_FAILED',
          message:
            'Le paiement en ligne n’a pas pu démarrer. Réessayez ou choisissez le paiement à la livraison.',
        },
        { status, headers },
      );
    }
  });
}
