// GET  /api/store/promo-codes — the merchant's promo codes (newest first).
// POST /api/store/promo-codes — create a code.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { toPromoDTO } from '@/lib/server/store/promo';
import { PromoBody, promoValidationMessage } from './schema';

const MAX_CODES = 200;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const codes = await prisma.promoCode.findMany({
      where: { merchantId: auth.user.sub },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(
      { codes: codes.map(toPromoDTO) },
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
    const parsed = PromoBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: promoValidationMessage(parsed.error.issues) },
        { status: 400, headers },
      );
    }
    const count = await prisma.promoCode.count({ where: { merchantId: auth.user.sub } });
    if (count >= MAX_CODES) {
      return NextResponse.json(
        { error: 'TOO_MANY_CODES', message: 'Vous avez atteint le nombre maximal de codes.' },
        { status: 400, headers },
      );
    }
    const d = parsed.data;
    try {
      const created = await prisma.promoCode.create({
        data: {
          merchantId: auth.user.sub,
          code: d.code,
          type: d.type,
          value: d.type === 'free_shipping' ? 0 : d.value,
          minAmount: d.minAmount || null,
          maxUses: d.maxUses,
          expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
          active: d.active,
        },
      });
      return NextResponse.json({ code: toPromoDTO(created) }, { status: 201, headers });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return NextResponse.json(
          { error: 'CODE_TAKEN', message: `Le code « ${d.code} » existe déjà.` },
          { status: 409, headers },
        );
      }
      throw err;
    }
  });
}
