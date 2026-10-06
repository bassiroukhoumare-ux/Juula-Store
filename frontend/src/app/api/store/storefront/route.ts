// GET   /api/store/storefront — the shop's settings (cover, banners, colour,
//       publication) and payment options.
// PATCH /api/store/storefront — update any of them.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { saveStorefrontSettings, toStorefrontSettings } from '@/lib/server/store/storefront';
import { isStorePro } from '@/lib/store/plans';

const Banner = z.object({
  id: z.string().max(40),
  imageUrl: z.string().max(500),
  title: z.string().max(80),
  badge: z.string().max(40),
  buttonLabel: z.string().max(40),
  category: z.string().max(40),
  placement: z.enum(['before_products', 'after_products', 'after_new', 'bottom']).optional(),
  productSlugs: z.array(z.string().max(120)).max(40).optional(),
});
const Section = z.object({
  id: z.string().max(40),
  type: z.enum(['products', 'testimonials']),
  title: z.string().max(80),
  subtitle: z.string().max(160),
  placement: z.enum(['before_products', 'after_products', 'after_new', 'bottom']),
  productSlugs: z.array(z.string().max(120)).max(40),
  images: z.array(z.string().max(500)).max(30),
});
const Faq = z.object({
  id: z.string().max(40),
  question: z.string().max(200),
  answer: z.string().max(2000),
});
const Method = z.object({
  id: z.string().max(40),
  name: z.string().max(40),
  url: z.string().max(500),
  qrUrl: z.string().max(500).nullable(),
});

const Body = z
  .object({
    published: z.boolean(),
    tagline: z.string().max(140),
    coverUrl: z.string().max(500).nullable(),
    accent: z.string().max(7),
    banners: z.array(Banner).max(5),
    sections: z.array(Section).max(20),
    faq: z.array(Faq).max(30),
    codEnabled: z.boolean(),
    onlinePaymentsEnabled: z.boolean(),
    setupDone: z.boolean(),
    whatsappOrderEnabled: z.boolean(),
    directPaymentMethods: z.array(Method).max(5),
  })
  .partial();

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const store = await prisma.store.findUnique({ where: { userId: auth.user.sub } });
    return NextResponse.json(
      {
        settings: toStorefrontSettings(store),
        isPro: isStorePro(store),
        subdomain: store?.subdomain ?? null,
      },
      { headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' } },
    );
  });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Informations invalides.' },
        { status: 400, headers },
      );
    }
    const result = await saveStorefrontSettings(auth.user.sub, parsed.data);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 400, headers },
      );
    }
    return NextResponse.json({ settings: result.settings }, { headers });
  });
}
