// POST /api/payments/moneriz/withdraw — a merchant withdraws their available
// balance to Wave / Orange Money through a Moneriz payout.
//
// Sequence (race-free, same pattern as /api/withdrawals):
//   1. CSRF + session (requireAuth) + PIN lockout check
//   2. Serializable tx guarded by pg_advisory_xact_lock(userId):
//        guards (min/max, daily limit, PIN, balance) → insert PENDING row.
//      The balance only counts online orders paid ≥ 72h ago (Moneriz
//      settlement delay), minus withdrawals already reserved.
//   3. Outside the tx: Moneriz payout with idempotency key = withdrawal id.
//        accepted        → PROCESSING (+ providerPayoutId); the webhook
//                          (re-verified via API) moves it to COMPLETED/FAILED
//        rejected (4xx)  → FAILED, amount released, error returned
//        unknown (5xx/network) → stays PENDING (amount held) so a lost
//                          response can never lead to a double payout.
export const runtime = 'nodejs';

import 'server-only';
import { after, NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { verifyPin } from '@/lib/server/auth/pin';
import { isLockedOut, recordFailure, recordSuccess } from '@/lib/server/auth/lockout';
import { requireAuth } from '@/lib/server/middleware';
import { log } from '@/lib/server/observability/log';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { createMonerizWithdrawal, MonerizApiError } from '@/lib/server/payments/moneriz';
import { isMonerizConfigured, storeBalanceComputer } from '@/lib/server/store/payments';
import { sendWithdrawalFailedEmail, sendWithdrawalSentEmail } from '@/lib/server/store/notify';
import { lockUserTx } from '@/lib/server/withdrawals/lock';
import { getPayoutAccounts } from '@/lib/server/store/payout-accounts';
import { loadGuardConfigFromEnv, validateWithdrawalRequest } from '@/lib/server/withdrawals/guards';

const MONERIZ_MIN_PAYOUT = 1000;

const Body = z.object({
  amount: z.number().int().positive(),
  provider: z.enum(['wave', 'orange_money']),
  /** Ignored: payouts only go to the number saved in Paramètres. */
  phone: z.string().max(20).optional(),
  pin: z.string().regex(/^\d{4,6}$/),
});

const MESSAGES: Record<string, string> = {
  AMOUNT_BELOW_MIN: `Le montant minimum de retrait est de ${MONERIZ_MIN_PAYOUT} FCFA.`,
  AMOUNT_ABOVE_MAX: 'Ce montant dépasse le plafond autorisé par retrait.',
  DAILY_LIMIT_EXCEEDED: 'Plafond de retrait journalier atteint.',
  COOLDOWN_ACTIVE: 'Un retrait vient d’être effectué. Réessayez un peu plus tard.',
  PIN_NOT_SET: 'Créez d’abord votre code PIN de retrait dans les Paramètres.',
  PIN_REQUIRED: 'Code PIN requis.',
  PIN_INVALID: 'Code PIN incorrect.',
  INSUFFICIENT_BALANCE:
    'Solde disponible insuffisant. Les paiements en ligne deviennent retirables 72 h après leur réception.',
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const fail = (status: number, code: string, message?: string) =>
      NextResponse.json(
        { error: code, message: message ?? MESSAGES[code] ?? code },
        { status, headers },
      );

    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const userId = auth.user.sub;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return fail(400, 'VALIDATION_FAILED', 'Informations de retrait invalides.');
    const { amount, provider, pin } = parsed.data;

    // Payouts only go to the accounts saved in Paramètres, in the legal name
    // of the merchant's ID card.
    const accounts = await getPayoutAccounts(userId);
    if (!accounts.legalName) {
      return fail(
        400,
        'LEGAL_NAME_REQUIRED',
        'Renseignez votre nom complet (comme sur votre pièce d’identité) dans Paramètres → Moyens de retrait.',
      );
    }
    const phone = provider === 'wave' ? accounts.wavePhone : accounts.orangePhone;
    if (!phone) {
      return fail(
        400,
        'PAYOUT_ACCOUNT_MISSING',
        `Ajoutez votre numéro ${provider === 'wave' ? 'Wave' : 'Orange Money'} dans Paramètres → Moyens de retrait.`,
      );
    }
    const legalName = accounts.legalName;

    if (!isMonerizConfigured()) {
      return fail(
        503,
        'PAYMENT_PROVIDER_UNCONFIGURED',
        'Les retraits sont temporairement indisponibles.',
      );
    }

    const lockKey = `pin:${userId}`;
    if (await isLockedOut(lockKey)) {
      return fail(423, 'LOCKED_OUT', 'Trop de codes PIN erronés. Réessayez dans quelques minutes.');
    }

    const envConfig = loadGuardConfigFromEnv(process.env);
    const guardConfig = {
      ...envConfig,
      minAmount: Math.max(envConfig.minAmount, MONERIZ_MIN_PAYOUT),
      requirePin: true,
      balanceCheckEnabled: true,
    };

    let withdrawal: { id: string; amount: number };
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          await lockUserTx(tx, userId);
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { withdrawalPinHash: true },
          });
          const guard = await validateWithdrawalRequest({
            prisma: tx,
            config: guardConfig,
            userId,
            amount,
            pin,
            withdrawalPinHash: user?.withdrawalPinHash ?? null,
            computeBalance: storeBalanceComputer,
            bcryptCompare: verifyPin,
          });
          if (!guard.ok) return { ok: false as const, guard };

          const row = await tx.withdrawal.create({
            data: {
              userId,
              amount,
              currency: 'XOF',
              status: 'PENDING',
              provider: 'moneriz',
              destination: {
                method: provider === 'wave' ? 'WAVE' : 'ORANGE_MONEY',
                phone,
                accountName: legalName,
              } as Prisma.InputJsonValue,
            },
            select: { id: true, amount: true },
          });
          return { ok: true as const, row };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if (!result.ok) {
        if (result.guard.code === 'PIN_INVALID') {
          const r = await recordFailure(lockKey);
          if (r.locked)
            return fail(
              423,
              'LOCKED_OUT',
              'Trop de codes PIN erronés. Réessayez dans quelques minutes.',
            );
        }
        return fail(result.guard.status, result.guard.code);
      }
      await recordSuccess(lockKey);
      withdrawal = result.row;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
        return fail(409, 'TRANSIENT_CONFLICT', 'Un autre retrait est en cours. Réessayez.');
      }
      throw err;
    }

    try {
      const payout = (await createMonerizWithdrawal({
        amount: withdrawal.amount,
        currency: 'XOF',
        country: 'SN',
        paymentType: provider === 'wave' ? 'wave_money' : 'orange_money',
        destination: { phone, name: legalName },
        reason: 'Retrait des ventes Juula Store',
        idempotencyKey: `wd-${withdrawal.id}`,
      })) as { id?: unknown };
      const payoutId = typeof payout?.id === 'string' ? payout.id : null;
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'PROCESSING', processedAt: new Date(), providerPayoutId: payoutId },
      });
      log.info('store.withdrawal.sent', { userId, withdrawalId: withdrawal.id, amount });
      after(() => sendWithdrawalSentEmail(withdrawal.id));
      return NextResponse.json(
        { withdrawalId: withdrawal.id, status: 'PROCESSING', reference: payoutId ?? withdrawal.id },
        { status: 201, headers },
      );
    } catch (err) {
      const definitive =
        err instanceof MonerizApiError && err.statusCode >= 400 && err.statusCode < 500;
      log.error('store.withdrawal.provider_error', {
        userId,
        withdrawalId: withdrawal.id,
        definitive,
        error: err instanceof Error ? err.message : String(err),
      });
      if (definitive) {
        await prisma.withdrawal.update({
          where: { id: withdrawal.id },
          data: { status: 'FAILED', failureReason: (err as MonerizApiError).code },
        });
        after(() => sendWithdrawalFailedEmail(withdrawal.id));
        return fail(
          400,
          'PAYOUT_REJECTED',
          'Moneriz a refusé le virement. Vérifiez le numéro puis réessayez.',
        );
      }
      // Outcome unknown: keep the amount reserved (PENDING) — never risk a
      // double payout. Support can reconcile it with the provider.
      return NextResponse.json(
        {
          withdrawalId: withdrawal.id,
          status: 'PENDING',
          message: 'Retrait enregistré, confirmation de Moneriz en attente.',
        },
        { status: 202, headers },
      );
    }
  });
}
