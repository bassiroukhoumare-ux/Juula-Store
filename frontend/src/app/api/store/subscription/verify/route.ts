// POST /api/store/subscription/verify — verify completed Moneriz payment and activate Juula Pro
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { verifyStoreSubscription } from '@/lib/server/store/subscription';

const Body = z.object({
  subscriptionId: z.string().min(1).max(128).optional(),
  sessionId: z.string().min(1).max(128).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    const target = parsed.success ? parsed.data.subscriptionId || parsed.data.sessionId : undefined;

    if (!target) {
      return NextResponse.json(
        { error: 'IDENTIFIER_REQUIRED', message: 'Identifiant de souscription requis' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const result = await verifyStoreSubscription(target);
    if (result.status === 'active') {
      return NextResponse.json(
        { status: 'active', plan: result.plan, expiresAt: result.expiresAt.toISOString() },
        { headers: { 'x-request-id': ctx.requestId } },
      );
    }

    return NextResponse.json(
      { status: result.status, message: 'Souscription en attente de validation ou introuvable' },
      {
        status: result.status === 'unavailable' ? 503 : 400,
        headers: { 'x-request-id': ctx.requestId },
      },
    );
  });
}
