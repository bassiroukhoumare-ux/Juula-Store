// POST /api/push/test — sends a test notification to every device of the
// signed-in merchant (to check that notifications work on their phone).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { isPushConfigured, sendPushToUser } from '@/lib/server/push';

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
    const report = await sendPushToUser(auth.user.sub, {
      title: 'Notifications activées ✅',
      body: 'Vous serez alerté ici à chaque nouvelle commande et à chaque paiement reçu.',
      url: '/dashboard',
      tag: 'juula-test',
    });
    return NextResponse.json(report, { headers });
  });
}
