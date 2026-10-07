// GET /api/adminom/products?q=&status=all|published|draft|disabled — every
// product of the platform, for moderation.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { productsView, type ProductFilter } from '@/lib/server/adminom/moderation';

const FILTERS: ProductFilter[] = ['all', 'published', 'draft', 'disabled'];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const sp = req.nextUrl.searchParams;
    const status = sp.get('status') as ProductFilter;
    const data = await productsView(sp.get('q') ?? '', FILTERS.includes(status) ? status : 'all');
    return NextResponse.json(data, {
      headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' },
    });
  });
}
