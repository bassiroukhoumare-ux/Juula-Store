// GET  /api/adminom/reports/[id] — full case (marks it read).
// POST /api/adminom/reports/[id]
//   { action: 'status', status }          → new | investigating | resolved | dismissed
//   { action: 'reply', subject, body }    → official e-mail to the reporter (Resend)
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { adminMeta, invalid, respond } from '@/lib/server/adminom/respond';
import { replyToReport, reportDetail, setReportStatus } from '@/lib/server/reports';
import { REPORT_STATUS_IDS } from '@/lib/store/reports';

type Ctx = { params: Promise<{ id: string }> };
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status'), status: z.enum(REPORT_STATUS_IDS) }),
  z.object({
    action: z.literal('reply'),
    subject: z.string().trim().min(3).max(200),
    body: z.string().trim().min(10).max(5000),
  }),
]);

export async function GET(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const { id } = await params;
    const report = await reportDetail(id);
    if (!report) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Signalement introuvable.' },
        { status: 404, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    return NextResponse.json(
      { report },
      { headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' } },
    );
  });
}

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid(ctx.requestId, 'Objet et message requis.');
    const { id } = await params;
    const meta = await adminMeta(req);
    const b = parsed.data;
    const result =
      b.action === 'status'
        ? await setReportStatus(id, b.status, meta)
        : await replyToReport(id, { subject: b.subject, body: b.body }, meta);
    return respond(result, ctx.requestId);
  });
}
