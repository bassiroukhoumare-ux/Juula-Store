// GET /api/adminom/audit — latest sanctions and escrow decisions (AdminAction).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { auditView } from '@/lib/server/adminom/moderation';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    return NextResponse.json(
      { actions: await auditView() },
      { headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' } },
    );
  });
}
