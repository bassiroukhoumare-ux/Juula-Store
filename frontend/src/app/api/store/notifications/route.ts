// GET   /api/store/notifications — the merchant's notification feed.
// PATCH /api/store/notifications — { keys | all, action: read | unread | delete }.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import {
  buildNotificationFeed,
  updateNotificationState,
} from '@/lib/server/store/notifications-feed';

const Body = z
  .object({
    keys: z.array(z.string().min(1).max(120)).max(100).optional(),
    all: z.literal(true).optional(),
    action: z.enum(['read', 'unread', 'delete']),
  })
  .refine((b) => (b.keys && b.keys.length > 0) || b.all);

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const feed = await buildNotificationFeed(auth.user.sub);
    return NextResponse.json(feed, {
      headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' },
    });
  });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400, headers });
    }
    const userId = auth.user.sub;
    // Only keys that exist in this merchant's own feed can be stored.
    const feed = await buildNotificationFeed(userId);
    const own = new Set(feed.items.map((n) => n.key));
    const keys = parsed.data.all ? [...own] : (parsed.data.keys ?? []).filter((k) => own.has(k));
    if (keys.length > 0) await updateNotificationState(userId, keys, parsed.data.action);
    return NextResponse.json(await buildNotificationFeed(userId), { headers });
  });
}
