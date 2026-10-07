// POST /api/adminom/stores/[id] { action: suspend|reopen, reason } — closes the
// shop to buyers (« Boutique temporairement indisponible ») or reopens it.
export const runtime = 'nodejs';

import 'server-only';
import { type NextRequest, type NextResponse } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { setStoreSuspended } from '@/lib/server/adminom/moderation';
import { adminMeta, invalid, respond } from '@/lib/server/adminom/respond';

type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({
  action: z.enum(['suspend', 'reopen']),
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
    const result = await setStoreSuspended(
      id,
      parsed.data.action === 'suspend',
      parsed.data.reason,
      await adminMeta(req),
    );
    return respond(result, ctx.requestId);
  });
}
