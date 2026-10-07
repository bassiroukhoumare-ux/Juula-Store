// POST   /api/adminom/products/[id] { action: disable|enable, reason } — hide /
//        restore a product (reason shown to the merchant).
// DELETE /api/adminom/products/[id] { reason } — permanent deletion.
export const runtime = 'nodejs';

import 'server-only';
import { type NextRequest, type NextResponse } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { deleteProduct, setProductDisabled } from '@/lib/server/adminom/moderation';
import { adminMeta, invalid, respond } from '@/lib/server/adminom/respond';

type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({
  action: z.enum(['disable', 'enable']),
  reason: z.string().max(500).default(''),
});
const DelBody = z.object({ reason: z.string().max(500).default('') });

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid(ctx.requestId);
    const { id } = await params;
    const result = await setProductDisabled(
      id,
      parsed.data.action === 'disable',
      parsed.data.reason,
      await adminMeta(req),
    );
    return respond(result, ctx.requestId);
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const parsed = DelBody.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return invalid(ctx.requestId);
    const { id } = await params;
    return respond(
      await deleteProduct(id, parsed.data.reason, await adminMeta(req)),
      ctx.requestId,
    );
  });
}
