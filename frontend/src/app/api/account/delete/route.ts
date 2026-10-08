// GET /api/account/delete — what stands between the merchant and deleting
// their account: { email, blockers[] } (money still owed, admin role…).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { deletionBlockers } from '@/lib/server/account/deletion';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const [user, blockers] = await Promise.all([
      prisma.user.findUnique({ where: { id: auth.user.sub }, select: { email: true } }),
      deletionBlockers(auth.user.sub),
    ]);
    return NextResponse.json(
      { email: user?.email ?? '', blockers },
      { headers: { 'x-request-id': ctx.requestId, 'Cache-Control': 'no-store' } },
    );
  });
}
