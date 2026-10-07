import 'server-only';
// E-mails received on a report (Resend inbound): the reporter answers the
// support e-mail and the answer lands in the case conversation in /adminom.
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Resend } from 'resend';
import { prisma } from '@/lib/server/prisma';
import { log } from '@/lib/server/observability/log';
import { uploadBuffer } from '@/lib/server/upload/cloudinary-client';
import { verifyMagicBytes } from '@/lib/server/upload/sniff';
import { reportIdFromAddress } from '@/lib/server/reports';
import { emailOf, htmlToText, stripQuotedReply } from '@/lib/server/report-inbound-text';

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export type InboundResult =
  | { ok: true; reportId: string; messageId: string }
  | { ok: true; ignored: string }
  | { ok: false; error: string };

let client: Resend | null = null;
/**
 * Reading received e-mails needs a Resend key with full access; the sending
 * key is often « send only ». RESEND_INBOUND_API_KEY takes precedence.
 */
function resend(): Resend | null {
  const key = (process.env.RESEND_INBOUND_API_KEY || process.env.RESEND_API_KEY)?.trim();
  if (!key) return null;
  client ??= new Resend(key);
  return client;
}

/** Verifies the Svix signature of a Resend webhook (raw body, untouched). */
export function verifyInboundWebhook(
  payload: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
): unknown {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET?.trim();
  const r = resend();
  if (!secret || !r || !headers.id || !headers.timestamp || !headers.signature) return null;
  try {
    return r.webhooks.verify({
      payload,
      headers: { id: headers.id, timestamp: headers.timestamp, signature: headers.signature },
      webhookSecret: secret,
    });
  } catch {
    return null;
  }
}

async function savePhotos(emailId: string): Promise<string[]> {
  const r = resend();
  if (!r) return [];
  const { data, error } = await r.emails.receiving.attachments.list({ emailId });
  if (error || !data) return [];
  const urls: string[] = [];
  for (const a of data.data) {
    if (urls.length >= MAX_PHOTOS) break;
    if (!IMAGE_MIME.includes(a.content_type) || a.size > MAX_PHOTO_BYTES) continue;
    try {
      const res = await fetch(a.download_url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const { match, sniffed } = verifyMagicBytes(buf, a.content_type);
      if (!sniffed || !match) continue;
      const up = await uploadBuffer(`reports/${randomUUID()}`, buf, a.content_type);
      urls.push(up.secureUrl);
    } catch (err) {
      log.warn('report.inbound.attachment_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return urls;
}

/** Attaches a received e-mail (Resend `email.received` event data) to its report. */
export async function ingestInboundEmail(data: {
  email_id: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
}): Promise<InboundResult> {
  const reportId =
    [...data.to, ...(data.cc ?? [])].map(reportIdFromAddress).find((x): x is string => !!x) ?? null;
  if (!reportId) return { ok: true, ignored: 'not_a_report_address' };
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) return { ok: true, ignored: 'report_not_found' };
  const already = await prisma.reportMessage.findUnique({
    where: { inboundEmailId: data.email_id },
  });
  if (already) return { ok: true, reportId, messageId: already.id };

  const r = resend();
  if (!r) return { ok: false, error: 'RESEND_NOT_CONFIGURED' };
  const { data: email, error } = await r.emails.receiving.get(data.email_id);
  if (error || !email) return { ok: false, error: error?.message ?? 'EMAIL_NOT_FOUND' };

  const raw = email.text?.trim() || (email.html ? htmlToText(email.html) : '');
  const body = stripQuotedReply(raw).slice(0, 8000) || '(message vide)';
  const photos = email.attachments.length > 0 ? await savePhotos(data.email_id) : [];
  const fromEmail = emailOf(email.from || data.from);

  try {
    const msg = await prisma.$transaction(async (tx) => {
      const m = await tx.reportMessage.create({
        data: {
          reportId,
          kind: 'inbound',
          subject: (email.subject || data.subject || '').slice(0, 300),
          body,
          status: 'received',
          inboundEmailId: data.email_id,
          fromEmail,
          attachments: photos,
        },
      });
      // A closed case comes back to « en cours » when the reporter writes again.
      await tx.report.update({
        where: { id: reportId },
        data: {
          ...(report.status === 'resolved' || report.status === 'dismissed'
            ? { status: 'investigating' }
            : {}),
        },
      });
      return m;
    });
    log.info('report.inbound.received', {
      reportId,
      messageId: msg.id,
      photos: photos.length,
      fromReporter: fromEmail === report.reporterEmail.toLowerCase(),
    });
    return { ok: true, reportId, messageId: msg.id };
  } catch (err) {
    // Same e-mail delivered twice at once: the unique key keeps one copy.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { ok: true, ignored: 'duplicate' };
    }
    throw err;
  }
}
