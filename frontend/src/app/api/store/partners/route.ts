// GET  /api/store/partners — the merchant's affiliate partners with results.
// POST /api/store/partners — create a partner (secret dashboard token generated here).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import {
  newPartnerToken,
  partnerStats,
  productTitles,
  toPartnerDTO,
} from '@/lib/server/store/partners';
import { PartnerBody, partnerValidationMessage } from './schema';

const MAX_PARTNERS = 200;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const partners = await prisma.partner.findMany({
      where: { merchantId: auth.user.sub },
      orderBy: { createdAt: 'desc' },
    });
    const [stats, titles] = await Promise.all([
      partnerStats(partners),
      productTitles(
        auth.user.sub,
        partners.map((p) => p.productSlug),
      ),
    ]);
    return NextResponse.json(
      {
        partners: partners.map((p) =>
          toPartnerDTO(
            p,
            stats.get(p.id),
            p.productSlug ? (titles.get(p.productSlug) ?? null) : null,
          ),
        ),
      },
      { headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' } },
    );
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const parsed = PartnerBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: partnerValidationMessage(parsed.error.issues) },
        { status: 400, headers },
      );
    }
    const d = parsed.data;
    if ((await prisma.partner.count({ where: { merchantId: auth.user.sub } })) >= MAX_PARTNERS) {
      return NextResponse.json(
        { error: 'TOO_MANY_PARTNERS', message: 'Nombre maximal de partenaires atteint.' },
        { status: 400, headers },
      );
    }
    if (d.productSlug) {
      const own = await prisma.product.count({
        where: { slug: d.productSlug, userId: auth.user.sub },
      });
      if (!own) {
        return NextResponse.json(
          { error: 'PRODUCT_NOT_FOUND', message: 'Ce produit n’existe pas.' },
          { status: 400, headers },
        );
      }
    }
    try {
      const created = await prisma.partner.create({
        data: {
          merchantId: auth.user.sub,
          name: d.name,
          slug: d.slug,
          startsAt: d.startsAt ? new Date(d.startsAt) : null,
          expiresAt: new Date(d.expiresAt),
          commissionType: d.commissionType,
          commissionValue: d.commissionValue,
          productSlug: d.productSlug,
          token: newPartnerToken(),
        },
      });
      const titles = await productTitles(auth.user.sub, [created.productSlug]);
      return NextResponse.json(
        {
          partner: toPartnerDTO(
            created,
            undefined,
            created.productSlug ? (titles.get(created.productSlug) ?? null) : null,
          ),
        },
        { status: 201, headers },
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return NextResponse.json(
          { error: 'SLUG_TAKEN', message: `Le lien ?ref=${d.slug} est déjà utilisé.` },
          { status: 409, headers },
        );
      }
      throw err;
    }
  });
}
