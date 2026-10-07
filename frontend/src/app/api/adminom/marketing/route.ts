// GET /api/adminom/marketing — promo codes and affiliate links of every shop.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { marketingView } from '@/lib/server/adminom/data';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const data = await marketingView();
    return NextResponse.json(data, {
      headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' },
    });
  });
}
