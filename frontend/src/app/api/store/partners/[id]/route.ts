// PATCH  /api/store/partners/:id — edit, or { action: suspend | resume | extend | markPaid }.
// DELETE /api/store/partners/:id — delete (its orders keep their history).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { partnerStats, productTitles, toPartnerDTO } from '@/lib/server/store/partners';
import { PartnerBody, partnerValidationMessage } from '../schema';

const Action = z.discriminatedUnion('action', [
  z.object({ action: z.literal('suspend') }),
  z.object({ action: z.literal('resume') }),
  z.object({ action: z.literal('extend'), days: z.number().int().min(1).max(365) }),
  z.object({ action: z.literal('markPaid'), via: z.enum(['wave', 'orange_money', 'other']) }),
]);

type Params = { params: Promise<{ id: string }> };

async function respond(id: string, merchantId: string, headers: Record<string, string>) {
  const p = await prisma.partner.findUniqueOrThrow({ where: { id } });
  const [stats, titles] = await Promise.all([
    partnerStats([p]),
    productTitles(merchantId, [p.productSlug]),
  ]);
  return NextResponse.json(
    {
      partner: toPartnerDTO(
        p,
        stats.get(p.id),
        p.productSlug ? (titles.get(p.productSlug) ?? null) : null,
      ),
    },
    { headers },
  );
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
    const partner = await prisma.partner.findFirst({ where: { id, merchantId: auth.user.sub } });
    if (!partner) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404, headers });
    const raw: unknown = await req.json().catch(() => null);

    const action = Action.safeParse(raw);
    if (action.success) {
      const a = action.data;
      if (a.action === 'suspend' || a.action === 'resume') {
        await prisma.partner.update({ where: { id }, data: { suspended: a.action === 'suspend' } });
      } else if (a.action === 'extend') {
        // From the current end date, or from now when already expired.
        const from = Math.max(partner.expiresAt.getTime(), Date.now());
        await prisma.partner.update({
          where: { id },
          data: { expiresAt: new Date(from + a.days * 86_400_000) },
        });
      } else {
        // Paid: everything validated so far is settled.
        const stats = (await partnerStats([partner])).get(id)!;
        await prisma.partner.update({
          where: { id },
          data: { paidAmount: stats.validatedCommission, paidAt: new Date(), paidVia: a.via },
        });
      }
      return respond(id, auth.user.sub, headers);
    }

    const parsed = PartnerBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: partnerValidationMessage(parsed.error.issues) },
        { status: 400, headers },
      );
    }
    const d = parsed.data;
    try {
      await prisma.partner.update({
        where: { id },
        data: {
          name: d.name,
          slug: d.slug,
          startsAt: d.startsAt ? new Date(d.startsAt) : null,
          expiresAt: new Date(d.expiresAt),
          commissionType: d.commissionType,
          commissionValue: d.commissionValue,
          productSlug: d.productSlug,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return NextResponse.json(
          { error: 'SLUG_TAKEN', message: `Le lien ?ref=${d.slug} est déjà utilisé.` },
          { status: 409, headers },
        );
      }
      throw err;
    }
    return respond(id, auth.user.sub, headers);
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
    const { count } = await prisma.partner.deleteMany({ where: { id, merchantId: auth.user.sub } });
    if (count === 0) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404, headers });
    return NextResponse.json({ ok: true }, { headers });
  });
}
