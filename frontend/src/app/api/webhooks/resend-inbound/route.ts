// POST /api/webhooks/resend-inbound — Resend « email.received » webhook.
// The reporter's answer to a support e-mail (Reply-To: signalement-<id>-<sig>@…)
// is attached to the report conversation. The raw body is verified (Svix
// signature, RESEND_INBOUND_WEBHOOK_SECRET) BEFORE any JSON parsing.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';
import { ingestInboundEmail, verifyInboundWebhook } from '@/lib/server/report-inbound';

interface ReceivedEvent {
  type: string;
  data?: { email_id?: string; from?: string; to?: string[]; cc?: string[]; subject?: string };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const payload = await req.text();
    const event = verifyInboundWebhook(payload, {
      id: req.headers.get('svix-id'),
      timestamp: req.headers.get('svix-timestamp'),
      signature: req.headers.get('svix-signature'),
    }) as ReceivedEvent | null;
    if (!event) {
      return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 401, headers });
    }
    if (event.type !== 'email.received' || !event.data?.email_id) {
      return NextResponse.json({ ignored: event.type }, { headers });
    }
    const d = event.data;
    try {
      const result = await ingestInboundEmail({
        email_id: d.email_id!,
        from: d.from ?? '',
        to: d.to ?? [],
        ...(d.cc ? { cc: d.cc } : {}),
        subject: d.subject ?? '',
      });
      if (!result.ok) {
        // Retried by Resend (5xx): fetching the e-mail failed.
        return NextResponse.json({ error: result.error }, { status: 502, headers });
      }
      return NextResponse.json(result, { headers });
    } catch (err) {
      log.error('report.inbound.failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json({ error: 'INBOUND_FAILED' }, { status: 500, headers });
    }
  });
}
