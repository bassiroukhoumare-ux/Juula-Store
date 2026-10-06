// POST /api/public/partners/track — a visitor arrived through ?ref=<slug>.
// The visit counts (once per visitor) only while the partner's campaign is
// active; otherwise nothing is counted and the browser must not attribute.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { redis } from '@/lib/server/redis';
import {
  MemoryRateLimitStore,
  RedisRateLimitStore,
  type RateLimitStore,
} from '@/lib/server/rate-limit-store';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { loadStoreBySubdomain } from '@/lib/server/store/public';
import { activePartner } from '@/lib/server/store/partners';
import { ATTRIBUTION_DAYS } from '@/lib/store/partners';

const Body = z.object({
  shop: z.string().min(1).max(63),
  ref: z.string().min(1).max(60),
  visitorId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
});

// 30 tracked arrivals / 10 min per IP: visits cannot be inflated by a script.
let limiter: RateLimitStore | null = null;
async function limited(req: NextRequest): Promise<boolean> {
  limiter ??= redis
    ? new RedisRateLimitStore({ redis, prefix: 'rl:partner-track:', windowMs: 10 * 60_000 })
    : new MemoryRateLimitStore({ windowMs: 10 * 60_000 });
  const xff = req.headers.get('x-forwarded-for');
  const ip = xff ? xff.split(',')[0]!.trim() : (req.headers.get('x-real-ip') ?? 'unknown');
  return (await limiter.increment(ip)).totalHits > 30;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400, headers });
    if (await limited(req)) return NextResponse.json({ ok: false }, { status: 429, headers });
    const found = await loadStoreBySubdomain(parsed.data.shop.toLowerCase());
    if (found.kind !== 'store') return NextResponse.json({ ok: false }, { headers });
    const partner = await activePartner(prisma, found.store.userId, parsed.data.ref);
    if (!partner) return NextResponse.json({ ok: false, reason: 'INACTIVE' }, { headers });
    await prisma.partnerVisit.upsert({
      where: { partnerId_visitorId: { partnerId: partner.id, visitorId: parsed.data.visitorId } },
      create: { partnerId: partner.id, visitorId: parsed.data.visitorId },
      update: {},
    });
    return NextResponse.json({ ok: true, ref: partner.slug, days: ATTRIBUTION_DAYS }, { headers });
  });
}
