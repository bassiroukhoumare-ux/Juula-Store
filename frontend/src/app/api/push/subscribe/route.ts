// POST   /api/push/subscribe { subscription: PushSubscriptionJSON, device? }
//        Saves this browser's push subscription for the signed-in merchant
//        (upsert on the endpoint: re-subscribing or switching account updates it).
// DELETE /api/push/subscribe { endpoint } — notifications turned off on this device.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { isPushConfigured } from '@/lib/server/push';

const Subscribe = z.object({
  subscription: z.object({
    endpoint: z.string().url().startsWith('https://').max(1000),
    keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
  }),
  device: z.enum(['android', 'ios', 'desktop']).optional(),
});
const Unsubscribe = z.object({ endpoint: z.string().url().max(1000) });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: 'PUSH_NOT_CONFIGURED', message: 'Notifications indisponibles pour le moment.' },
        { status: 503, headers },
      );
    }
    const parsed = Subscribe.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Abonnement invalide.' },
        { status: 400, headers },
      );
    }
    const { subscription, device } = parsed.data;
    const data = {
      userId: auth.user.sub,
      keysP256dh: subscription.keys.p256dh,
      keysAuth: subscription.keys.auth,
      userAgent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
      device: device ?? null,
      failures: 0,
    };
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: { endpoint: subscription.endpoint, ...data },
      update: data,
    });
    return NextResponse.json({ ok: true }, { status: 201, headers });
  });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const parsed = Unsubscribe.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400, headers });
    }
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: parsed.data.endpoint, userId: auth.user.sub },
    });
    return NextResponse.json({ ok: true }, { headers });
  });
}
