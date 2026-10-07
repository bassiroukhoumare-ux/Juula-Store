// POST /api/public/reports — « Signaler cette boutique / ce produit ».
// Multipart form: reporter identity, reason, description, up to 5 photos
// (JPG / PNG / WebP, checked by magic bytes) + the target (shop / product).
// 5 reports per hour per IP; an acknowledgement e-mail goes to the reporter.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';
import { safeAfter } from '@/lib/server/store/notify';
import { StorageNotConfiguredError } from '@/lib/server/upload/cloudinary-client';
import {
  checkReportImage,
  createReport,
  reportRateLimit,
  resolveReportTarget,
  sendReportAck,
} from '@/lib/server/reports';
import { REPORT_MAX_DESCRIPTION, REPORT_MAX_IMAGES, REPORT_REASON_IDS } from '@/lib/store/reports';

const Body = z.object({
  shop: z.string().max(80).optional(),
  produit: z.string().max(200).optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ().-]{8,22}$/),
  reason: z.enum(REPORT_REASON_IDS),
  description: z.string().trim().min(10).max(REPORT_MAX_DESCRIPTION),
  pageUrl: z.string().max(500).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const fail = (status: number, error: string, message: string) =>
      NextResponse.json({ error, message }, { status, headers });

    const xff = req.headers.get('x-forwarded-for');
    const ip = xff ? xff.split(',')[0]!.trim() : (req.headers.get('x-real-ip') ?? 'unknown');
    const wait = await reportRateLimit(ip);
    if (wait !== null) {
      return fail(429, 'TOO_MANY_REPORTS', 'Trop de signalements envoyés. Réessayez plus tard.');
    }

    const form = await req.formData().catch(() => null);
    if (!form) return fail(400, 'VALIDATION_FAILED', 'Formulaire invalide.');
    // Honeypot: bots fill every field.
    if (String(form.get('website') ?? '')) return NextResponse.json({ ok: true }, { headers });

    const field = (k: string) => {
      const v = form.get(k);
      return typeof v === 'string' && v.trim() ? v : undefined;
    };
    const parsed = Body.safeParse({
      shop: field('shop'),
      produit: field('produit'),
      firstName: field('firstName'),
      lastName: field('lastName'),
      email: field('email'),
      phone: field('phone'),
      reason: field('reason'),
      description: field('description'),
      pageUrl: field('pageUrl'),
    });
    if (!parsed.success) {
      const key = parsed.error.issues[0]?.path[0];
      const message =
        key === 'email'
          ? 'Adresse e-mail invalide.'
          : key === 'phone'
            ? 'Numéro de téléphone invalide (avec l’indicatif, ex. +221).'
            : key === 'description'
              ? 'Décrivez la situation (10 caractères minimum).'
              : key === 'reason'
                ? 'Choisissez le motif du signalement.'
                : 'Renseignez votre prénom, votre nom et vos coordonnées.';
      return fail(400, 'VALIDATION_FAILED', message);
    }
    const d = parsed.data;

    const target = await resolveReportTarget({
      shop: d.shop ?? null,
      productSlug: d.produit ?? null,
    });
    if (!target) return fail(404, 'TARGET_NOT_FOUND', 'Boutique ou produit introuvable.');

    const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > REPORT_MAX_IMAGES) {
      return fail(400, 'TOO_MANY_PHOTOS', `${REPORT_MAX_IMAGES} photos maximum.`);
    }
    const images: { buf: Buffer; mime: string }[] = [];
    for (const f of files) {
      const c = await checkReportImage(f);
      if (!c.ok) return fail(415, 'INVALID_PHOTO', c.message);
      images.push({ buf: c.buf, mime: c.mime });
    }

    let created;
    try {
      created = await createReport({
        target,
        reporterName: `${d.firstName} ${d.lastName}`,
        reporterEmail: d.email,
        reporterPhone: d.phone.replace(/[^\d+]/g, ''),
        reason: d.reason,
        description: d.description,
        images,
        pageUrl: d.pageUrl ?? null,
        ip: ip === 'unknown' ? null : ip,
        userAgent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
      });
    } catch (err) {
      if (err instanceof StorageNotConfiguredError) {
        return fail(
          503,
          'STORAGE_NOT_CONFIGURED',
          'L’envoi de photos est indisponible pour le moment.',
        );
      }
      log.error('report.create_failed', {
        error:
          err instanceof Error
            ? err.message
            : ((err as { message?: string } | null)?.message ?? JSON.stringify(err)),
      });
      return fail(502, 'REPORT_FAILED', 'L’envoi a échoué. Réessayez dans un instant.');
    }
    safeAfter(() => sendReportAck(created.id));
    log.info('report.created', { reportId: created.id, store: target.storeSubdomain });
    return NextResponse.json({ ok: true, caseRef: created.caseRef }, { status: 201, headers });
  });
}
