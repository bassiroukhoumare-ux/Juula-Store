// GET /api/store/subscription — get current merchant plan status
// POST /api/store/subscription — initialize Juula Pro subscription checkout (3 900 FCFA)
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import {
  createProSubscriptionSession,
  getStoreSubscriptionStatus,
} from '@/lib/server/store/subscription';

function resolveBaseUrl(req: NextRequest): string {
  const origin = req.headers.get('origin');
  const appUrl = process.env.APP_URL;
  return appUrl || origin || 'https://www.juula.store';
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const status = await getStoreSubscriptionStatus(auth.user.sub);
    return NextResponse.json(status, { headers: { 'x-request-id': ctx.requestId } });
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const base = resolveBaseUrl(req);
    const result = await createProSubscriptionSession(auth.user.sub, base);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    return NextResponse.json(
      {
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        subscriptionId: result.subscriptionId,
        amount: result.amount,
      },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
