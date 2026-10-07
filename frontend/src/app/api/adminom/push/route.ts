// GET  /api/adminom/push?q=  — subscriber stats + merchants matching q (with
//                              their number of subscribed devices).
// POST /api/adminom/push     — manual push:
//   { target: 'all' | 'user', userId?, title, body, url }
//   Broadcast goes out in batches; returns { sent, failed, removed }.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { requireAdminom } from '@/lib/server/adminom/session';
import { adminMeta, invalid } from '@/lib/server/adminom/respond';
import { logAdminAction } from '@/lib/server/admin/audit';
import { prisma } from '@/lib/server/prisma';
import { broadcastPush, isPushConfigured, sendPushToUser } from '@/lib/server/push';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { store: { name: { contains: q, mode: 'insensitive' } } },
            { store: { subdomain: { contains: q.toLowerCase() } } },
          ],
        }
      : { pushSubscriptions: { some: {} } };
    const [total, byDevice, usersWithPush, users] = await Promise.all([
      prisma.pushSubscription.count(),
      prisma.pushSubscription.groupBy({ by: ['device'], _count: { _all: true } }),
      prisma.user.count({ where: { pushSubscriptions: { some: {} } } }),
      prisma.user.findMany({
        where,
        take: 12,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          store: { select: { name: true, subdomain: true, logoUrl: true } },
          _count: { select: { pushSubscriptions: true } },
        },
      }),
    ]);
    return NextResponse.json(
      {
        configured: isPushConfigured(),
        stats: {
          devices: total,
          users: usersWithPush,
          byDevice: Object.fromEntries(byDevice.map((d) => [d.device ?? 'inconnu', d._count._all])),
        },
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          storeName: u.store?.name ?? u.store?.subdomain ?? null,
          logoUrl: u.store?.logoUrl ?? null,
          devices: u._count.pushSubscriptions,
        })),
      },
      { headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' } },
    );
  });
}

const Body = z
  .object({
    target: z.enum(['all', 'user']),
    userId: z.string().max(40).optional(),
    title: z.string().trim().min(2).max(120),
    body: z.string().trim().min(2).max(400),
    url: z
      .string()
      .trim()
      .max(300)
      .regex(/^\/(?!\/)/, 'URL relative attendue (ex. /dashboard)')
      .default('/dashboard'),
  })
  .refine((b) => b.target === 'all' || Boolean(b.userId), {
    message: 'Choisissez un utilisateur.',
  });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const denied = await requireAdminom(req);
    if (denied) return denied;
    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: 'PUSH_NOT_CONFIGURED', message: 'Clés VAPID absentes sur ce serveur.' },
        { status: 503, headers },
      );
    }
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return invalid(ctx.requestId, parsed.error.issues[0]?.message ?? 'Formulaire invalide.');
    }
    const b = parsed.data;
    const payload = { title: b.title, body: b.body, url: b.url };
    const report =
      b.target === 'all' ? await broadcastPush(payload) : await sendPushToUser(b.userId!, payload);
    const meta = await adminMeta(req);
    await logAdminAction(prisma, {
      actorId: meta.actorId,
      action: 'push.send',
      targetType: b.target === 'all' ? 'Broadcast' : 'User',
      targetId: b.target === 'all' ? 'all' : b.userId!,
      metadata: { ...payload, target: b.target, ...report },
      ...(meta.ip ? { ip: meta.ip } : {}),
      ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    });
    return NextResponse.json(report, { headers });
  });
}
