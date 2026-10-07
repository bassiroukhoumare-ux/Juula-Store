// POST   /api/adminom/merchants/[id] { action: suspend|restore, reason } — blocks
//        sign-in and revokes every session (or restores the account).
// DELETE /api/adminom/merchants/[id] { confirmEmail, reason } — full purge of
//        the account and its shop (strict confirmation: the account email).
export const runtime = 'nodejs';

import 'server-only';
import { type NextRequest, type NextResponse } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { deleteMerchant, setUserSuspended } from '@/lib/server/adminom/moderation';
import { adminMeta, invalid, respond } from '@/lib/server/adminom/respond';

type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({
  action: z.enum(['suspend', 'restore']),
  reason: z.string().max(500).default(''),
});
const DelBody = z.object({
  confirmEmail: z.string().min(3).max(320),
  reason: z.string().max(500).default(''),
});

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid(ctx.requestId);
    const { id } = await params;
    const result = await setUserSuspended(
      id,
      parsed.data.action === 'suspend',
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
    const parsed = DelBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid(ctx.requestId, 'Tapez l’email du compte pour confirmer.');
    const { id } = await params;
    const result = await deleteMerchant(
      id,
      parsed.data.confirmEmail,
      parsed.data.reason,
      await adminMeta(req),
    );
    return respond(result, ctx.requestId);
  });
}
