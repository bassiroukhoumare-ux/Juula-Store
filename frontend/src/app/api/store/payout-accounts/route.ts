// GET  /api/store/payout-accounts — the store's payout accounts.
// PUT  /api/store/payout-accounts — set the legal name (as on the ID card)
//      and the Wave and/or Orange Money numbers withdrawals go to.
//
// Changing where money goes is sensitive: once a withdrawal PIN exists, the
// PIN is required (same lockout as withdrawals), so a stolen session alone
// cannot redirect payouts.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { verifyPin } from '@/lib/server/auth/pin';
import { isLockedOut, recordFailure, recordSuccess } from '@/lib/server/auth/lockout';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { getPayoutAccounts, savePayoutAccounts } from '@/lib/server/store/payout-accounts';

const Body = z.object({
  legalName: z.string().trim().max(100),
  wavePhone: z.string().trim().max(25).nullable(),
  orangePhone: z.string().trim().max(25).nullable(),
  pin: z
    .string()
    .regex(/^\d{4,6}$/)
    .optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const accounts = await getPayoutAccounts(auth.user.sub);
    return NextResponse.json(
      { accounts },
      { headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' } },
    );
  });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const fail = (status: number, error: string, message: string) =>
      NextResponse.json({ error, message }, { status, headers });

    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const userId = auth.user.sub;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, 'VALIDATION_FAILED', 'Informations invalides.');
    const { pin, ...input } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { withdrawalPinHash: true },
    });
    if (user?.withdrawalPinHash) {
      const lockKey = `pin:${userId}`;
      if (await isLockedOut(lockKey)) {
        return fail(
          423,
          'LOCKED_OUT',
          'Trop de codes PIN erronés. Réessayez dans quelques minutes.',
        );
      }
      if (!pin) return fail(403, 'PIN_REQUIRED', 'Saisissez votre code PIN de retrait.');
      if (!(await verifyPin(pin, user.withdrawalPinHash))) {
        await recordFailure(lockKey);
        return fail(403, 'PIN_INVALID', 'Code PIN incorrect.');
      }
      await recordSuccess(lockKey);
    }

    const result = await savePayoutAccounts(userId, input);
    if (!result.ok) return fail(400, result.error, result.message);
    return NextResponse.json({ accounts: result.accounts }, { headers });
  });
}
