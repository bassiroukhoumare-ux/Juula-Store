// PATCH  /api/products/[id] — save editor config and/or change status.
// DELETE /api/products/[id] — delete a product (its orders keep a snapshot).
//
// Ownership: a product that belongs to another merchant answers 404, not
// 403, so product IDs can't be probed.
export const runtime = 'nodejs';

import { invalidateStorefront } from '@/lib/server/store/public-cache';
import { isStorePro } from '@/lib/store/plans';
import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import {
  configToJson,
  parseConfig,
  ProductStatusSchema,
  toFunnelPageItem,
} from '@/lib/server/store/products';

const PatchBody = z
  .object({
    config: z.unknown().optional(),
    status: ProductStatusSchema.optional(),
    internalName: z.string().trim().min(1).max(120).optional(),
  })
  .refine((b) => b.config !== undefined || b.status !== undefined || b.internalName !== undefined, {
    message: 'Nothing to update',
  });

function notFound(requestId: string): NextResponse {
  return NextResponse.json(
    { error: 'PRODUCT_NOT_FOUND', message: 'Produit introuvable' },
    { status: 404, headers: { 'x-request-id': requestId } },
  );
}

export async function PATCH(
  req: NextRequest,
  routeCtx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await routeCtx.params;

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Requête invalide', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const existing = await prisma.product.findFirst({ where: { id, userId: auth.user.sub } });
    if (!existing) return notFound(ctx.requestId);

    const data: Prisma.ProductUpdateInput = {};
    const status = parsed.data.status;
    const internalName = parsed.data.internalName;
    if (status) data.status = status;
    if (internalName) data.internalName = internalName;

    if (parsed.data.config !== undefined) {
      const result = parseConfig(parsed.data.config);
      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.error,
            message:
              result.error === 'CONFIG_TOO_LARGE'
                ? 'Page trop volumineuse — utilisez des images hébergées'
                : 'Configuration invalide',
            issues: result.issues,
          },
          {
            status: result.error === 'CONFIG_TOO_LARGE' ? 413 : 400,
            headers: { 'x-request-id': ctx.requestId },
          },
        );
      }
      // The slug is immutable (shared links must keep working); status and
      // name columns are authoritative over whatever the JSON carries.
      const config = {
        ...result.config,
        id: existing.id,
        slug: existing.slug,
        status:
          status ?? result.config.status ?? (existing.status as 'draft' | 'published' | 'inactive'),
        internalName: internalName ?? result.config.internalName ?? existing.internalName,
      };
      data.config = configToJson(config);
      data.price = config.price;
      if (!status && config.status) data.status = config.status;
      if (!internalName && config.internalName) data.internalName = config.internalName;
    }

    // A product disabled by the administration stays offline.
    // (Saving the page content alone keeps it inactive.)
    if (existing.adminDisabledAt && !status && data.status) data.status = 'inactive';
    if (existing.adminDisabledAt && data.status && data.status !== 'inactive') {
      return NextResponse.json(
        {
          error: 'PRODUCT_DISABLED_BY_ADMIN',
          message: `Ce produit a été désactivé par l’administration Juula${
            existing.adminDisabledReason ? ` : ${existing.adminDisabledReason}` : ''
          }. Contactez le support pour le réactiver.`,
        },
        { status: 423, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // Going online needs an active subscription (3 900 FCFA / mois).
    if (data.status === 'published' && existing.status !== 'published') {
      const store = await prisma.store.findUnique({ where: { userId: auth.user.sub } });
      if (!isStorePro(store)) {
        return NextResponse.json(
          {
            error: 'SUBSCRIPTION_REQUIRED',
            message: 'Un abonnement actif est nécessaire pour mettre cette page en ligne.',
          },
          { status: 402, headers: { 'x-request-id': ctx.requestId } },
        );
      }
    }

    const product = await prisma.product.update({ where: { id: existing.id }, data });
    invalidateStorefront({ userId: auth.user.sub, slugs: [existing.slug] });
    return NextResponse.json(
      { product: toFunnelPageItem(product) },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

export async function DELETE(
  req: NextRequest,
  routeCtx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await routeCtx.params;

    const target = await prisma.product.findFirst({
      where: { id, userId: auth.user.sub },
      select: { slug: true },
    });
    const deleted = await prisma.product.deleteMany({ where: { id, userId: auth.user.sub } });
    if (deleted.count === 0) return notFound(ctx.requestId);
    invalidateStorefront({ userId: auth.user.sub, slugs: [target?.slug] });
    return NextResponse.json({ ok: true }, { headers: { 'x-request-id': ctx.requestId } });
  });
}
