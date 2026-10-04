// GET /api/store/subdomain?value=awa-shop — live availability check used by
// onboarding and Paramètres while the merchant types.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { checkSubdomain } from '@/lib/server/store/profile';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const value = (req.nextUrl.searchParams.get('value') ?? '').slice(0, 80);
    const store = await prisma.store.findUnique({
      where: { userId: auth.user.sub },
      select: { id: true },
    });
    const result = await checkSubdomain(value, store?.id);
    return NextResponse.json(result, { headers: { 'x-request-id': ctx.requestId } });
  });
}
