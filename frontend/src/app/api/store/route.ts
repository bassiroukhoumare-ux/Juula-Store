// GET /api/store — the merchant's store settings (ad-tracking pixels).
// PUT /api/store — save them. An empty string clears a pixel.
export const runtime = 'nodejs';

import 'server-only';
import { after, NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { sendWelcomeEmailOnce } from '@/lib/server/store/notify';
import { toStoreProfile } from '@/lib/server/store/profile';
import {
  FACEBOOK_PIXEL_ID_REGEX,
  normalizeFacebookPixelId,
  normalizeTiktokPixelId,
  TIKTOK_PIXEL_ID_REGEX,
  type StorePixels,
} from '@/lib/store/pixels';

const PutBody = z.object({
  facebookPixelId: z
    .string()
    .transform(normalizeFacebookPixelId)
    .refine((v) => v === '' || FACEBOOK_PIXEL_ID_REGEX.test(v), {
      message: 'FACEBOOK_PIXEL_INVALID',
    }),
  tiktokPixelId: z
    .string()
    .transform(normalizeTiktokPixelId)
    .refine((v) => v === '' || TIKTOK_PIXEL_ID_REGEX.test(v), {
      message: 'TIKTOK_PIXEL_INVALID',
    }),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const store = await prisma.store.findUnique({ where: { userId: auth.user.sub } });
    // Welcome email not delivered yet (e.g. email was misconfigured at
    // onboarding time): retry on each dashboard load until it goes out.
    if (!store?.welcomeEmailSentAt) {
      const userId = auth.user.sub;
      after(() => sendWelcomeEmailOnce(userId));
    }
    const pixels: StorePixels = {
      facebookPixelId: store?.facebookPixelId ?? null,
      tiktokPixelId: store?.tiktokPixelId ?? null,
    };
    return NextResponse.json(
      { store: { ...pixels, ...toStoreProfile(store) } },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = PutBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const code = parsed.error.issues[0]?.message;
      const known = code === 'FACEBOOK_PIXEL_INVALID' || code === 'TIKTOK_PIXEL_INVALID';
      return NextResponse.json(
        {
          error: known ? code : 'VALIDATION_FAILED',
          message:
            code === 'FACEBOOK_PIXEL_INVALID'
              ? "L'ID du Pixel Facebook doit contenir uniquement des chiffres (15–16 en général)"
              : code === 'TIKTOK_PIXEL_INVALID'
                ? "L'ID du Pixel TikTok doit contenir uniquement des lettres majuscules et des chiffres"
                : 'Requête invalide',
        },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const store = await prisma.store.findUnique({ where: { userId: auth.user.sub } });
    const isPro =
      store?.plan === 'PRO' && (!store.planExpiresAt || store.planExpiresAt > new Date());

    if (!isPro && (parsed.data.facebookPixelId || parsed.data.tiktokPixelId)) {
      return NextResponse.json(
        {
          error: 'PRO_REQUIRED',
          message: 'Les pixels Facebook et TikTok nécessitent un abonnement actif.',
        },
        { status: 403, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const data = {
      facebookPixelId: parsed.data.facebookPixelId || null,
      tiktokPixelId: parsed.data.tiktokPixelId || null,
    };
    const saved = await prisma.store.upsert({
      where: { userId: auth.user.sub },
      create: { userId: auth.user.sub, ...data },
      update: data,
    });
    const pixels: StorePixels = {
      facebookPixelId: saved.facebookPixelId,
      tiktokPixelId: saved.tiktokPixelId,
    };
    return NextResponse.json({ store: pixels }, { headers: { 'x-request-id': ctx.requestId } });
  });
}
