// POST /api/public/products/[slug]/events — first-party analytics of a public
// product page: a view, an order-form open, or the order form being filled
// in (abandoned-checkout capture).
//
// Unauthenticated by design (same as the public order route): no cookies are
// read and no session is acted on, so no CSRF; per-IP rate limit; only
// published products are tracked. The visitor's country comes from the
// hosting edge, never from the browser.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import {
  isEventRateLimited,
  publishedProductId,
  recordProductEvent,
  requestCountry,
  saveCheckoutDraft,
} from '@/lib/server/store/analytics';
import { sanitizeSource } from '@/lib/store/traffic-source';

const VisitorId = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);
const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const Body = z.discriminatedUnion('type', [
  z.object({
    type: z.enum(['view', 'checkout_open']),
    visitorId: VisitorId,
    source: z.string().max(80),
    referrer: z.string().max(120).nullable().optional(),
  }),
  z.object({
    type: z.literal('draft'),
    visitorId: VisitorId,
    customerName: opt(120),
    phone: opt(30),
    address: opt(300),
    quantity: z.number().int().min(1).max(100).default(1),
  }),
]);

export async function POST(
  req: NextRequest,
  routeCtx: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    if (await isEventRateLimited(req)) {
      return NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429, headers });
    }
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400, headers });
    }
    const { slug } = await routeCtx.params;
    const productId = await publishedProductId(slug);
    if (!productId) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404, headers });

    const input = parsed.data;
    const country = requestCountry(req);
    if (input.type === 'draft') {
      // Nothing worth keeping until the customer typed a name or a phone.
      if (input.customerName || input.phone) {
        await saveCheckoutDraft({
          productId,
          visitorId: input.visitorId,
          customerName: input.customerName,
          phone: input.phone,
          address: input.address,
          quantity: input.quantity,
          country,
        });
      }
    } else {
      const referrer = input.referrer?.toLowerCase() ?? null;
      await recordProductEvent({
        productId,
        type: input.type,
        visitorId: input.visitorId,
        source: sanitizeSource(input.source),
        referrer: referrer && /^[a-z0-9.-]{3,120}$/.test(referrer) ? referrer : null,
        country,
      });
    }
    return new NextResponse(null, { status: 204, headers });
  });
}
