import 'server-only';
// Payout accounts of a store (Paramètres → Moyens de retrait): the legal
// name on the merchant's ID card and the Wave / Orange Money numbers that
// withdrawals are allowed to go to. The withdraw route only pays out to
// these numbers, in this name.
import { prisma } from '@/lib/server/prisma';
import { toSenegalE164 } from '@/lib/store/sn-phone';

export interface PayoutAccounts {
  legalName: string | null;
  wavePhone: string | null;
  orangePhone: string | null;
}

export async function getPayoutAccounts(userId: string): Promise<PayoutAccounts> {
  const store = await prisma.store.findUnique({
    where: { userId },
    select: { payoutLegalName: true, payoutWavePhone: true, payoutOrangePhone: true },
  });
  return {
    legalName: store?.payoutLegalName ?? null,
    wavePhone: store?.payoutWavePhone ?? null,
    orangePhone: store?.payoutOrangePhone ?? null,
  };
}

/** Legal name: letters (accents), spaces, apostrophes, dots and hyphens. */
export function isValidLegalName(name: string): boolean {
  const v = name.trim();
  return v.length >= 4 && v.length <= 100 && /\s/.test(v) && /^[\p{L}][\p{L} '’.-]+$/u.test(v);
}

export type PayoutAccountsResult =
  | { ok: true; accounts: PayoutAccounts }
  | { ok: false; error: string; message: string };

export async function savePayoutAccounts(
  userId: string,
  input: { legalName: string; wavePhone: string | null; orangePhone: string | null },
): Promise<PayoutAccountsResult> {
  if (!isValidLegalName(input.legalName)) {
    return {
      ok: false,
      error: 'LEGAL_NAME_INVALID',
      message: 'Indiquez votre prénom et votre nom, exactement comme sur votre pièce d’identité.',
    };
  }
  const wave = input.wavePhone ? toSenegalE164(input.wavePhone) : null;
  const orange = input.orangePhone ? toSenegalE164(input.orangePhone) : null;
  if (input.wavePhone && !wave) {
    return {
      ok: false,
      error: 'PHONE_INVALID',
      message: 'Numéro Wave invalide (ex : 77 123 45 67).',
    };
  }
  if (input.orangePhone && !orange) {
    return {
      ok: false,
      error: 'PHONE_INVALID',
      message: 'Numéro Orange Money invalide (ex : 77 123 45 67).',
    };
  }
  if (!wave && !orange) {
    return {
      ok: false,
      error: 'ACCOUNT_REQUIRED',
      message: 'Choisissez au moins un moyen de retrait : Wave ou Orange Money.',
    };
  }
  const legalName = input.legalName.trim().replace(/\s+/g, ' ');
  await prisma.store.upsert({
    where: { userId },
    create: {
      userId,
      payoutLegalName: legalName,
      payoutWavePhone: wave,
      payoutOrangePhone: orange,
    },
    update: { payoutLegalName: legalName, payoutWavePhone: wave, payoutOrangePhone: orange },
  });
  return { ok: true, accounts: { legalName, wavePhone: wave, orangePhone: orange } };
}
