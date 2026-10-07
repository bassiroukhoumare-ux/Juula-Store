// GET /api/adminom/reports?status=all|new|investigating|resolved|dismissed&type=all|store|product&q=
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { reportsView, type ReportTypeFilter } from '@/lib/server/reports';
import { REPORT_STATUS_IDS, type ReportStatus } from '@/lib/store/reports';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const sp = req.nextUrl.searchParams;
    const s = sp.get('status') as ReportStatus;
    const t = sp.get('type') as ReportTypeFilter;
    const data = await reportsView(
      REPORT_STATUS_IDS.includes(s) ? s : 'all',
      t === 'store' || t === 'product' ? t : 'all',
      sp.get('q') ?? '',
    );
    return NextResponse.json(data, {
      headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' },
    });
  });
}
