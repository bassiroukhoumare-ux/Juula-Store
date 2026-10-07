// POST /api/adminom/disputes/[id] — escrow actions on an online order:
//   { action: 'freeze',  reason }                 → funds blocked (never withdrawable)
//   { action: 'release', report }                 → funds back to the merchant
//   { action: 'refund',  refund: {...}, report }  → customer refunded, case closed
export const runtime = 'nodejs';

import 'server-only';
import { type NextRequest, type NextResponse } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { freezeOrder, refundOrder, releaseOrder } from '@/lib/server/adminom/moderation';
import { adminMeta, invalid, respond } from '@/lib/server/adminom/respond';

type Ctx = { params: Promise<{ id: string }> };
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('freeze'), reason: z.string().max(500) }),
  z.object({ action: z.literal('release'), report: z.string().max(2000).default('') }),
  z.object({
    action: z.literal('refund'),
    report: z.string().max(2000).default(''),
    refund: z.object({
      mode: z.enum(['moneriz', 'manual']),
      provider: z.enum(['wave', 'orange']),
      phone: z.string().min(6).max(30),
      name: z.string().max(120).default(''),
      reference: z.string().max(120).optional(),
    }),
  }),
]);

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid(ctx.requestId);
    const { id } = await params;
    const meta = await adminMeta(req);
    const body = parsed.data;
    const result =
      body.action === 'freeze'
        ? await freezeOrder(id, body.reason, meta)
        : body.action === 'release'
          ? await releaseOrder(id, body.report, meta)
          : await refundOrder(
              id,
              {
                mode: body.refund.mode,
                provider: body.refund.provider,
                phone: body.refund.phone,
                name: body.refund.name,
                report: body.report,
                ...(body.refund.reference ? { reference: body.refund.reference } : {}),
              },
              meta,
            );
    return respond(result, ctx.requestId);
  });
}
