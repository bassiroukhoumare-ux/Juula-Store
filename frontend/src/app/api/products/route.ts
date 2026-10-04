// GET  /api/products — the signed-in merchant's products (newest edit first).
// POST /api/products — create a draft product with a unique public slug.
//
// The slug is generated once from the internal name and never changes, so a
// link shared on social networks keeps working after edits.
export const runtime = 'nodejs';

import 'server-only';
import { after, NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { ensureUniqueSlug, slugify } from '@/lib/server/slug';
import {
  configToJson,
  pickStoreWide,
  productConfig,
  toFunnelPageItem,
} from '@/lib/server/store/products';
import { defaultFunnelConfig } from '@/data/mockData';
import { sendWelcomeEmailOnce } from '@/lib/server/store/notify';
import type { FunnelPageConfig } from '@/types/juula';

const MAX_PRODUCTS_PER_MERCHANT = 200;

const CreateBody = z.object({
  internalName: z.string().trim().min(1).max(120),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    // First dashboard load after sign-up: welcome email (sent once, atomic claim).
    const userId = auth.user.sub;
    after(() => sendWelcomeEmailOnce(userId));

    const products = await prisma.product.findMany({
      where: { userId: auth.user.sub },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(
      { products: products.map(toFunnelPageItem) },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = CreateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_FAILED',
          message: 'Nom du produit requis',
          issues: parsed.error.issues,
        },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    const userId = auth.user.sub;
    const { internalName } = parsed.data;

    const count = await prisma.product.count({ where: { userId } });
    if (count >= MAX_PRODUCTS_PER_MERCHANT) {
      return NextResponse.json(
        { error: 'PRODUCT_LIMIT_REACHED', message: 'Nombre maximum de produits atteint' },
        { status: 409, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // Inherit store-wide settings (store name, delivery, WhatsApp…) from
    // the merchant's latest product so they don't re-type them per product.
    const latest = await prisma.product.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    const inherited = latest ? pickStoreWide(productConfig(latest)) : {};

    const config: FunnelPageConfig = {
      ...defaultFunnelConfig,
      ...inherited,
      internalName,
      status: 'draft',
      productTitle: internalName,
      mediaItems: [],
      benefits: [],
      proofItems: [],
      reviews: [],
      availableColors: [],
    };

    // Random suffix keeps slugs unguessable-ish and avoids collisions
    // between merchants selling the same product name.
    const base = `${slugify(internalName, { maxLength: 48 }) || 'produit'}-${Math.random().toString(36).slice(2, 7)}`;
    let createdId = '';
    await ensureUniqueSlug(base, async (slug) => {
      const row = await prisma.product.create({
        data: {
          userId,
          slug,
          internalName,
          status: 'draft',
          price: config.price,
          config: configToJson({ ...config, slug }),
        },
        select: { id: true },
      });
      createdId = row.id;
    });

    const product = await prisma.product.findUniqueOrThrow({ where: { id: createdId } });
    return NextResponse.json(
      { product: toFunnelPageItem(product) },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
