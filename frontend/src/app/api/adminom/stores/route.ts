// GET /api/adminom/stores?q= — every shop with its status and sales.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { storesView } from '@/lib/server/adminom/data';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const sp = req.nextUrl.searchParams;
    const data = await storesView(sp.get('q') ?? '').then((stores) => ({ stores }));
    return NextResponse.json(data, {
      headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' },
    });
  });
}
