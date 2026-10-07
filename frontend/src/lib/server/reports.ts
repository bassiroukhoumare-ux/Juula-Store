import 'server-only';
// Public reports: submission (form « Signaler »), acknowledgement e-mail,
// /adminom views and official replies sent through Resend.
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import {
  MemoryRateLimitStore,
  RedisRateLimitStore,
  type RateLimitStore,
} from '@/lib/server/rate-limit-store';
import { createMailer, type Mailer } from '@/lib/server/email';
import { escapeHtml, renderEmail } from '@/lib/server/store/notify';
import { uploadBuffer } from '@/lib/server/upload/cloudinary-client';
import { verifyMagicBytes } from '@/lib/server/upload/sniff';
import { logAdminAction } from '@/lib/server/admin/audit';
import { log } from '@/lib/server/observability/log';
import { storeOrigin, storeProductUrl } from '@/lib/store/subdomain';
import {
  REPORT_IMAGE_MIME,
  REPORT_MAX_IMAGE_BYTES,
  REPORT_MAX_IMAGES,
  reportReasonLabel,
  type ReportStatus,
} from '@/lib/store/reports';

// ─────────────────────────────────────────────────────────────────────────
// Target (shop / product)
// ─────────────────────────────────────────────────────────────────────────
export interface ReportTarget {
  storeId: string | null;
  storeName: string;
  storeSubdomain: string | null;
  logoUrl: string | null;
  accent: string | null;
  productId: string | null;
  productSlug: string | null;
  productTitle: string | null;
  productImage: string | null;
}

/** Resolves what is reported: a shop (by sub-domain) and/or a product (by slug). */
export async function resolveReportTarget(input: {
  shop?: string | null;
  productSlug?: string | null;
}): Promise<ReportTarget | null> {
  const slug = input.productSlug?.trim().toLowerCase() || null;
  if (slug) {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        internalName: true,
        config: true,
        user: { select: { store: true } },
      },
    });
    if (product) {
      const store = product.user.store;
      if (input.shop && store?.subdomain && store.subdomain !== input.shop.toLowerCase()) {
        return null;
      }
      const cfg = (product.config ?? {}) as {
        productTitle?: unknown;
        mediaItems?: { type?: string; url?: string }[];
      };
      const image = Array.isArray(cfg.mediaItems)
        ? (cfg.mediaItems.find((m) => m?.type !== 'video' && typeof m?.url === 'string')?.url ??
          null)
        : null;
      return {
        storeId: store?.id ?? null,
        storeName: store?.name ?? store?.subdomain ?? 'Boutique',
        storeSubdomain: store?.subdomain ?? null,
        logoUrl: store?.logoUrl ?? null,
        accent: store?.storeAccent ?? null,
        productId: product.id,
        productSlug: product.slug,
        productTitle:
          typeof cfg.productTitle === 'string' && cfg.productTitle
            ? cfg.productTitle
            : product.internalName,
        productImage: image,
      };
    }
    if (!input.shop) return null;
  }
  if (!input.shop) return null;
  const store = await prisma.store.findUnique({ where: { subdomain: input.shop.toLowerCase() } });
  if (!store) return null;
  return {
    storeId: store.id,
    storeName: store.name ?? store.subdomain ?? 'Boutique',
    storeSubdomain: store.subdomain,
    logoUrl: store.logoUrl,
    accent: store.storeAccent,
    productId: null,
    productSlug: null,
    productTitle: null,
    productImage: null,
  };
}

const targetLabel = (r: { productTitle: string | null; storeName: string | null }) =>
  r.productTitle ? `le produit « ${r.productTitle} »` : `la boutique « ${r.storeName ?? ''} »`;

// ─────────────────────────────────────────────────────────────────────────
// E-mails (official support address)
// ─────────────────────────────────────────────────────────────────────────
let supportMailer: Mailer | null | undefined;
function getSupportMailer(): Mailer | null {
  if (supportMailer !== undefined) return supportMailer;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = (
    process.env.SUPPORT_EMAIL_FROM ?? 'Juula Store Support <support@juula.store>'
  ).trim();
  supportMailer =
    apiKey && from ? createMailer({ RESEND_API_KEY: apiKey, EMAIL_FROM: from }) : null;
  if (!supportMailer) log.error('reports: support e-mails disabled (RESEND_API_KEY missing)');
  return supportMailer;
}

function supportEmail(input: {
  subject: string;
  title: string;
  label: string;
  body: string;
  caseRef: string;
  badge?: { text: string; tone: 'blue' | 'green' | 'amber' | 'red' };
}): { html: string; text: string } {
  const paragraphs = escapeHtml(input.body.trim())
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, '<br>'))
    .join('<br><br>');
  return {
    html: renderEmail({
      preheader: input.body.trim().slice(0, 110),
      label: input.label,
      ...(input.badge ? { badge: input.badge } : {}),
      title: input.title,
      intro: paragraphs,
      note: `Dossier n° <strong>${escapeHtml(input.caseRef)}</strong> · Répondez simplement à cet e-mail pour compléter votre signalement.`,
    }),
    text: `${input.body.trim()}\n\nDossier n° ${input.caseRef}`,
  };
}

const caseRef = (id: string) => `SIG-${id.slice(-8).toUpperCase()}`;

// ─────────────────────────────────────────────────────────────────────────
// Routed reply address: signalement-<id>-<sig>@<REPORT_INBOUND_DOMAIN>
// The signature stops anyone from posting into a case by guessing its id.
// ─────────────────────────────────────────────────────────────────────────
function inboundSecret(): string {
  return (
    process.env.REPORT_INBOUND_SECRET?.trim() || `report-inbound:${process.env.JWT_SECRET ?? ''}`
  );
}
function inboundSig(reportId: string): string {
  return createHmac('sha256', inboundSecret()).update(reportId).digest('hex').slice(0, 12);
}
/** Reply-To of the e-mails of a case, or null when inbound e-mail is not configured. */
export function reportReplyAddress(reportId: string): string | null {
  const domain = process.env.REPORT_INBOUND_DOMAIN?.trim().toLowerCase();
  if (!domain) return null;
  return `signalement-${reportId}-${inboundSig(reportId)}@${domain}`;
}
/** Report id carried by a routed address (signature checked), else null. */
export function reportIdFromAddress(address: string): string | null {
  const m = address.toLowerCase().match(/signalement-([a-z0-9]{10,40})-([a-f0-9]{12})@/);
  if (!m) return null;
  const [, id, sig] = m;
  const expected = inboundSig(id!);
  const a = Buffer.from(sig!);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? id! : null;
}

async function sendSupport(
  to: string,
  subject: string,
  mail: { html: string; text: string },
  reportId?: string,
): Promise<{ ok: boolean; id: string | null; error?: string }> {
  const m = getSupportMailer();
  if (!m) return { ok: false, id: null, error: 'E-mails non configurés (RESEND_API_KEY).' };
  try {
    // Replies land in the case (inbound webhook) when it is configured.
    const replyTo =
      (reportId ? reportReplyAddress(reportId) : null) ?? process.env.SUPPORT_REPLY_TO?.trim();
    const { id } = await m.send({
      to,
      subject,
      html: mail.html,
      text: mail.text,
      ...(replyTo ? { replyTo } : {}),
    });
    return { ok: true, id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.error('reports.email_failed', { error });
    return { ok: false, id: null, error };
  }
}

/** Automatic acknowledgement to the reporter (kept in the case history). */
export async function sendReportAck(reportId: string): Promise<void> {
  const r = await prisma.report.findUnique({ where: { id: reportId } });
  if (!r) return;
  const first = r.reporterName.trim().split(/\s+/)[0] ?? '';
  const subject = `[Juula Store Support] Signalement reçu — ${caseRef(r.id)}`;
  const body = `Bonjour ${first},\n\nVotre signalement concernant ${targetLabel(r)} a bien été transmis à l’équipe de sécurité Juula Store.\n\nMotif : ${reportReasonLabel(r.reason)}\n\nNotre équipe l’examine et reviendra vers vous par e-mail. Si vous avez d’autres preuves, répondez simplement à ce message.\n\nL’équipe sécurité Juula Store`;
  const res = await sendSupport(
    r.reporterEmail,
    subject,
    supportEmail({
      subject,
      title: 'Votre signalement a bien été reçu',
      label: 'Signalement',
      badge: { text: 'Reçu', tone: 'blue' },
      body,
      caseRef: caseRef(r.id),
    }),
    r.id,
  );
  await prisma.reportMessage.create({
    data: {
      reportId: r.id,
      kind: 'ack',
      subject,
      body,
      status: res.ok ? 'sent' : 'failed',
      providerId: res.id,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Submission
// ─────────────────────────────────────────────────────────────────────────
let limiter: RateLimitStore | null = null;
/** 5 reports / hour per IP. Returns the wait in seconds when blocked. */
export async function reportRateLimit(ip: string): Promise<number | null> {
  limiter ??= redis
    ? new RedisRateLimitStore({ redis, prefix: 'rl:report:', windowMs: 3600_000 })
    : new MemoryRateLimitStore({ windowMs: 3600_000 });
  const { totalHits, resetTime } = await limiter.increment(ip);
  if (totalHits <= 5) return null;
  return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
}

export type ImageCheck = { ok: true; buf: Buffer; mime: string } | { ok: false; message: string };

/** Size, MIME and magic bytes of one proof photo (never trust File.type alone). */
export async function checkReportImage(file: File): Promise<ImageCheck> {
  if (!(REPORT_IMAGE_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, message: 'Seules les photos JPG, PNG ou WebP sont acceptées.' };
  }
  if (file.size > REPORT_MAX_IMAGE_BYTES) {
    return { ok: false, message: 'Une photo est trop lourde (3 Mo maximum).' };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const { match, sniffed } = verifyMagicBytes(buf, file.type);
  if (!sniffed || !match) return { ok: false, message: 'Une photo est illisible ou invalide.' };
  return { ok: true, buf, mime: file.type };
}

export async function createReport(input: {
  target: ReportTarget;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  reason: string;
  description: string;
  images: { buf: Buffer; mime: string }[];
  pageUrl: string | null;
  ip: string | null;
  userAgent: string | null;
}): Promise<{ id: string; caseRef: string }> {
  const urls: string[] = [];
  for (const img of input.images.slice(0, REPORT_MAX_IMAGES)) {
    const up = await uploadBuffer(`reports/${randomUUID()}`, img.buf, img.mime);
    urls.push(up.secureUrl);
  }
  const t = input.target;
  const row = await prisma.report.create({
    data: {
      reporterName: input.reporterName,
      reporterEmail: input.reporterEmail.toLowerCase(),
      reporterPhone: input.reporterPhone,
      reason: input.reason,
      description: input.description,
      images: urls,
      storeId: t.storeId,
      productId: t.productId,
      storeName: t.storeName,
      storeSubdomain: t.storeSubdomain,
      productTitle: t.productTitle,
      productSlug: t.productSlug,
      pageUrl: input.pageUrl,
      ip: input.ip,
      userAgent: input.userAgent,
    },
    select: { id: true },
  });
  return { id: row.id, caseRef: caseRef(row.id) };
}

// ─────────────────────────────────────────────────────────────────────────
// /adminom
// ─────────────────────────────────────────────────────────────────────────
export type ReportTypeFilter = 'all' | 'store' | 'product';

export async function unreadReports(): Promise<number> {
  return prisma.report.count({ where: { status: 'new' } });
}

export async function reportsView(status: 'all' | ReportStatus, type: ReportTypeFilter, q: string) {
  const t = q.trim();
  const where: Prisma.ReportWhereInput = {
    ...(status !== 'all' ? { status } : {}),
    ...(type === 'product' ? { productSlug: { not: null } } : {}),
    ...(type === 'store' ? { productSlug: null } : {}),
    ...(t
      ? {
          OR: [
            { reporterName: { contains: t, mode: 'insensitive' } },
            { reporterEmail: { contains: t, mode: 'insensitive' } },
            { reporterPhone: { contains: t } },
            { storeName: { contains: t, mode: 'insensitive' } },
            { storeSubdomain: { contains: t.toLowerCase() } },
            { productTitle: { contains: t, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [rows, counts] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        messages: { where: { kind: 'inbound' }, select: { readAt: true } },
        _count: { select: { messages: { where: { kind: { in: ['reply', 'inbound'] } } } } },
      },
    }),
    prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  return {
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<
      string,
      number
    >,
    reports: rows.map((r) => ({
      id: r.id,
      caseRef: caseRef(r.id),
      createdAt: r.createdAt.toISOString(),
      reporterName: r.reporterName,
      reporterEmail: r.reporterEmail,
      reporterPhone: r.reporterPhone,
      type: r.productSlug ? ('product' as const) : ('store' as const),
      target: r.productTitle ?? r.storeName ?? '—',
      storeName: r.storeName,
      reason: reportReasonLabel(r.reason),
      photos: r.images.length,
      replies: r._count.messages,
      unreadReplies: r.messages.filter((m) => !m.readAt).length,
      status: r.status as ReportStatus,
      unread: !r.readAt,
    })),
  };
}

export async function reportDetail(id: string) {
  const r = await prisma.report.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      store: {
        select: {
          id: true,
          userId: true,
          name: true,
          subdomain: true,
          logoUrl: true,
          whatsapp: true,
          suspendedAt: true,
          user: { select: { email: true, status: true } },
        },
      },
      product: { select: { id: true, slug: true, status: true, adminDisabledAt: true } },
    },
  });
  if (!r) return null;
  if (!r.readAt) await prisma.report.update({ where: { id }, data: { readAt: new Date() } });
  if (r.messages.some((m) => m.kind === 'inbound' && !m.readAt)) {
    await prisma.reportMessage.updateMany({
      where: { reportId: id, kind: 'inbound', readAt: null },
      data: { readAt: new Date() },
    });
  }

  // Orders of this shop that may be the one in dispute: same customer phone
  // first, then the latest online payments.
  const digits = r.reporterPhone.replace(/\D/g, '').slice(-9);
  const orders = r.store
    ? await prisma.storeOrder.findMany({
        where: {
          merchantId: r.store.userId,
          paymentType: { in: ['online_wave', 'online_orange'] },
          paymentStatus: { in: ['paid', 'refunded'] },
        },
        orderBy: { paidAt: 'desc' },
        take: 40,
        select: {
          id: true,
          reference: true,
          productName: true,
          totalAmount: true,
          customerName: true,
          phone: true,
          paidAt: true,
          isFrozen: true,
          disputeStatus: true,
          paymentStatus: true,
        },
      })
    : [];
  const matches = (p: string) => digits.length >= 8 && p.replace(/\D/g, '').endsWith(digits);
  const ranked = [...orders]
    .sort((a, b) => Number(matches(b.phone)) - Number(matches(a.phone)))
    .slice(0, 8);

  const sub = r.store?.subdomain ?? r.storeSubdomain;
  return {
    id: r.id,
    caseRef: caseRef(r.id),
    createdAt: r.createdAt.toISOString(),
    status: r.status as ReportStatus,
    reporter: { name: r.reporterName, email: r.reporterEmail, phone: r.reporterPhone },
    reason: reportReasonLabel(r.reason),
    description: r.description,
    images: r.images,
    pageUrl: r.pageUrl,
    ip: r.ip,
    target: {
      type: r.productSlug ? ('product' as const) : ('store' as const),
      label: targetLabel(r),
      storeName: r.store?.name ?? r.storeName,
      storeId: r.store?.id ?? null,
      storeUrl: sub ? storeOrigin(sub) : null,
      storeSuspended: Boolean(r.store?.suspendedAt),
      storeWhatsapp: r.store?.whatsapp ?? null,
      merchantEmail: r.store?.user.email ?? null,
      productTitle: r.productTitle,
      productId: r.product?.id ?? null,
      productUrl: r.productSlug && sub ? storeProductUrl(sub, r.productSlug) : null,
      productDisabled: Boolean(r.product?.adminDisabledAt),
      deleted: !r.store && Boolean(r.storeName),
    },
    orders: ranked.map((o) => ({
      id: o.id,
      reference: o.reference,
      product: o.productName,
      amount: o.totalAmount,
      customer: o.customerName,
      phone: o.phone,
      paidAt: o.paidAt?.toISOString() ?? null,
      matchesReporter: matches(o.phone),
      frozen: o.isFrozen,
      refunded: o.paymentStatus === 'refunded',
    })),
    messages: r.messages.map((m) => ({
      id: m.id,
      kind: m.kind,
      subject: m.subject,
      body: m.body,
      status: m.status,
      at: m.createdAt.toISOString(),
      fromEmail: m.fromEmail,
      attachments: m.attachments,
      agent: m.agent,
      unread: m.kind === 'inbound' && !m.readAt,
    })),
    inboundEnabled: Boolean(reportReplyAddress(r.id)),
  };
}

interface Meta {
  actorId: string;
  ip?: string;
  userAgent?: string;
}

export async function setReportStatus(id: string, status: ReportStatus, meta: Meta) {
  const r = await prisma.report.findUnique({ where: { id } });
  if (!r) return { ok: false as const, status: 404, message: 'Signalement introuvable.' };
  await prisma.$transaction(async (tx) => {
    await tx.report.update({ where: { id }, data: { status, readAt: r.readAt ?? new Date() } });
    await logAdminAction(tx, {
      actorId: meta.actorId,
      action: 'report.status',
      targetType: 'Report',
      targetId: id,
      metadata: { from: r.status, to: status },
      ...(meta.ip ? { ip: meta.ip } : {}),
      ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    });
  });
  return { ok: true as const };
}

/** Name shown on the admin's messages in the conversation. */
export function agentName(): string {
  return process.env.ADMINOM_AGENT_NAME?.trim() || 'Équipe sécurité Juula';
}

/** Official reply to the reporter, sent from the support address via Resend. */
export async function replyToReport(
  id: string,
  input: { subject: string; body: string },
  meta: Meta,
) {
  const r = await prisma.report.findUnique({ where: { id } });
  if (!r) return { ok: false as const, status: 404, message: 'Signalement introuvable.' };
  const subject = input.subject.trim();
  const body = input.body.trim();
  const res = await sendSupport(
    r.reporterEmail,
    subject,
    supportEmail({
      subject,
      title: 'Réponse de l’équipe sécurité',
      label: 'Signalement',
      body,
      caseRef: caseRef(r.id),
    }),
    r.id,
  );
  await prisma.$transaction(async (tx) => {
    await tx.reportMessage.create({
      data: {
        reportId: id,
        kind: 'reply',
        subject,
        body,
        status: res.ok ? 'sent' : 'failed',
        providerId: res.id,
        agent: agentName(),
      },
    });
    if (res.ok && r.status === 'new') {
      await tx.report.update({ where: { id }, data: { status: 'investigating' } });
    }
    await logAdminAction(tx, {
      actorId: meta.actorId,
      action: 'report.reply',
      targetType: 'Report',
      targetId: id,
      metadata: { subject, sent: res.ok, providerId: res.id, to: r.reporterEmail },
      ...(meta.ip ? { ip: meta.ip } : {}),
      ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    });
  });
  if (!res.ok) {
    return {
      ok: false as const,
      status: 502,
      message: `L’e-mail n’est pas parti : ${res.error ?? 'erreur Resend'}.`,
    };
  }
  return { ok: true as const };
}
