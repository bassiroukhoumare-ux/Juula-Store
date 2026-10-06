// PATCH  /api/store/promo-codes/:id — edit a code (or just { active }).
// DELETE /api/store/promo-codes/:id — delete a code.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { toPromoDTO } from '@/lib/server/store/promo';
import { PromoBody, promoValidationMessage } from '../schema';

const ToggleBody = z.object({ active: z.boolean() });

type Params = { params: Promise<{ id: string }> };

async function ownCode(id: string, merchantId: string) {
  return prisma.promoCode.findFirst({ where: { id, merchantId } });
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const existing = await ownCode(id, auth.user.sub);
    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404, headers });
    }
    const raw: unknown = await req.json().catch(() => null);
    const toggle = ToggleBody.strict().safeParse(raw);
    if (toggle.success) {
      const updated = await prisma.promoCode.update({
        where: { id },
        data: { active: toggle.data.active },
      });
      return NextResponse.json({ code: toPromoDTO(updated) }, { headers });
    }
    const parsed = PromoBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: promoValidationMessage(parsed.error.issues) },
        { status: 400, headers },
      );
    }
    const d = parsed.data;
    try {
      const updated = await prisma.promoCode.update({
        where: { id },
        data: {
          code: d.code,
          type: d.type,
          value: d.type === 'free_shipping' ? 0 : d.value,
          minAmount: d.minAmount || null,
          maxUses: d.maxUses,
          expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
          active: d.active,
        },
      });
      return NextResponse.json({ code: toPromoDTO(updated) }, { headers });
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

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const { count } = await prisma.promoCode.deleteMany({
      where: { id, merchantId: auth.user.sub },
    });
    if (count === 0) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404, headers });
    return NextResponse.json({ ok: true }, { headers });
  });
}
