// POST /api/account/delete/confirm — step 4: { code } → the account is erased,
// every session is invalidated and the auth cookies are cleared.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { clearAuthCookies, clearCsrfCookie, verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { consumeDeletionCode, deletionBlockers, eraseAccount } from '@/lib/server/account/deletion';

const Body = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();

const MESSAGES: Record<string, string> = {
  CODE_INVALID: 'Code incorrect.',
  CODE_EXPIRED: 'Ce code a expiré. Demandez-en un nouveau.',
  CODE_LOCKED: 'Trop d’essais avec ce code. Demandez-en un nouveau.',
  NO_CODE: 'Aucun code en cours. Demandez-en un nouveau.',
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const headers = { 'x-request-id': ctx.requestId };

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Saisissez les 6 chiffres du code.' },
        { status: 400, headers },
      );
    }
    // Re-checked here: money may have arrived since the code was sent.
    const blockers = await deletionBlockers(auth.user.sub);
    if (blockers.length) {
      return NextResponse.json(
        {
          error: 'DELETION_BLOCKED',
          message: 'Votre compte ne peut pas encore être supprimé.',
          blockers,
        },
        { status: 409, headers },
      );
    }

    const check = await consumeDeletionCode(auth.user.sub, parsed.data.code);
    if (!check.ok) {
      return NextResponse.json(
        {
          error: check.error,
          message: MESSAGES[check.error],
          ...(check.error === 'CODE_INVALID' ? { attemptsLeft: check.attemptsLeft } : {}),
        },
        { status: 400, headers },
      );
    }

    await eraseAccount(auth.user.sub);
    await clearAuthCookies();
    await clearCsrfCookie();
    return NextResponse.json({ deleted: true }, { headers });
  });
}
