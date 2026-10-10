// GET /api/store/subscription — get current merchant plan status
// POST /api/store/subscription — start a checkout for 1, 3, 6 or 12 months
//   body: { months?: 1|3|6|12 (default 1), displayCurrency?: 'XOF'|'EUR'|'USD' }
//   The amount is taken from the server price list; payment is charged in FCFA.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import {
  createProSubscriptionSession,
  getStoreSubscriptionStatus,
} from '@/lib/server/store/subscription';

const Body = z
  .object({
    months: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]).default(1),
    displayCurrency: z.enum(['XOF', 'EUR', 'USD']).default('XOF'),
  })
  .strict();

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
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const raw = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(raw ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Durée ou devise invalide.' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const base = resolveBaseUrl(req);
    const result = await createProSubscriptionSession(auth.user.sub, base, parsed.data);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    return NextResponse.json(
      {
        checkoutUrl: result.checkoutUrl,
        embedUrl: result.embedUrl,
        integrationMode: result.integrationMode,
        sessionId: result.sessionId,
        subscriptionId: result.subscriptionId,
        amount: result.amount,
      },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
