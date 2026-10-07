// GET /api/adminom/notifications — bell of /adminom: reporters' new e-mail
// replies, new reports, shops whose subscription ends within 7 days.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { prisma } from '@/lib/server/prisma';

const caseRef = (id: string) => `SIG-${id.slice(-8).toUpperCase()}`;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const now = new Date();
    const [replies, reports, expiring] = await Promise.all([
      prisma.reportMessage.findMany({
        where: { kind: 'inbound', readAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          body: true,
          createdAt: true,
          report: { select: { id: true, reporterName: true } },
        },
      }),
      prisma.report.findMany({
        where: { status: 'new', readAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          reporterName: true,
          storeName: true,
          productTitle: true,
          createdAt: true,
        },
      }),
      prisma.store.count({
        where: {
          plan: 'PRO',
          planExpiresAt: { gt: now, lte: new Date(now.getTime() + 7 * 86_400_000) },
        },
      }),
    ]);
    const items = [
      ...replies.map((m) => ({
        id: `reply:${m.id}`,
        type: 'reply' as const,
        reportId: m.report.id,
        title: `Nouvelle réponse reçue de ${m.report.reporterName}`,
        preview: m.body.slice(0, 120),
        caseRef: caseRef(m.report.id),
        at: m.createdAt.toISOString(),
      })),
      ...reports.map((r) => ({
        id: `report:${r.id}`,
        type: 'report' as const,
        reportId: r.id,
        title: `Nouveau signalement de ${r.reporterName}`,
        preview: r.productTitle ?? r.storeName ?? '',
        caseRef: caseRef(r.id),
        at: r.createdAt.toISOString(),
      })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    return NextResponse.json(
      { items, unreadReplies: replies.length, newReports: reports.length, expiring },
      { headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' } },
    );
  });
}
