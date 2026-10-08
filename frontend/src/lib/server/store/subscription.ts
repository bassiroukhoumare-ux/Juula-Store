// Juula Store — subscription checkout: 1, 3, 6 or 12 months, paid once in FCFA.
import { invalidateStorefront } from '@/lib/server/store/public-cache';
import 'server-only';
import { prisma } from '@/lib/server/prisma';
import {
  createMonerizCheckoutSession,
  getMonerizCheckoutSession,
  getMonerizConfig,
  MonerizApiError,
} from '@/lib/server/payments/moneriz';
import {
  addMonths,
  isStorePro,
  subscriptionTerm,
  type PriceCurrency,
  type SubscriptionMonths,
} from '@/lib/store/plans';
import { log } from '@/lib/server/observability/log';
import { safeAfter, sendProSubscriptionActivatedEmail } from '@/lib/server/store/notify';

function isMonerizConfigured(): boolean {
  return Boolean(getMonerizConfig().secretKey);
}

export interface SubscriptionStatusResult {
  plan: 'FREE' | 'PRO';
  isPro: boolean;
  expiresAt: string | null;
  activeUntil: string | null;
}

export async function getStoreSubscriptionStatus(
  userId: string,
): Promise<SubscriptionStatusResult> {
  const store = await prisma.store.findUnique({
    where: { userId },
    select: { plan: true, planExpiresAt: true },
  });
  const isPro = isStorePro(store);
  return {
    plan: isPro ? 'PRO' : 'FREE',
    isPro,
    expiresAt: store?.planExpiresAt?.toISOString() ?? null,
    activeUntil: store?.planExpiresAt
      ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
          store.planExpiresAt,
        )
      : null,
  };
}

export interface CreateSubscriptionResult {
  ok: true;
  checkoutUrl: string;
  sessionId: string;
  subscriptionId: string;
  amount: number;
}

export type CreateSubscriptionError = {
  ok: false;
  error: 'CONFIG_MISSING' | 'STORE_NOT_FOUND' | 'ALREADY_ACTIVE' | 'PROVIDER_ERROR';
  message: string;
};

export async function createProSubscriptionSession(
  userId: string,
  returnBaseUrl: string,
  choice: { months: SubscriptionMonths; displayCurrency: PriceCurrency } = {
    months: 1,
    displayCurrency: 'XOF',
  },
): Promise<CreateSubscriptionResult | CreateSubscriptionError> {
  // The amount always comes from the server-side price list, never the client.
  const term = subscriptionTerm(choice.months);
  if (!term) {
    return { ok: false, error: 'PROVIDER_ERROR', message: 'Durée d’abonnement invalide.' };
  }
  const amount = term.priceXof;

  if (!isMonerizConfigured()) {
    return {
      ok: false,
      error: 'CONFIG_MISSING',
      message: 'Moyen de paiement temporairement indisponible.',
    };
  }

  const store = await prisma.store.upsert({
    where: { userId },
    create: { userId, plan: 'FREE' },
    update: {},
  });

  // Create pending subscription record
  const sub = await prisma.storeSubscription.create({
    data: {
      storeId: store.id,
      userId,
      plan: 'PRO',
      amount,
      currency: 'FCFA',
      months: term.months,
      displayCurrency: choice.displayCurrency,
      status: 'pending',
    },
  });

  const base = returnBaseUrl.replace(/\/+$/, '');
  const successUrl = `${base}/dashboard?sub_status=success&sub_id=${sub.id}`;
  const cancelUrl = `${base}/dashboard?sub_status=cancelled`;

  try {
    const session = await createMonerizCheckoutSession({
      amount,
      currency: 'XOF',
      title: `Abonnement Juula — ${term.label} (${amount.toLocaleString('fr-FR').replace(/\s/g, ' ')} FCFA)`,
      reference: sub.id,
      country: 'SN',
      integrationMode: 'redirect',
      embedOrigin: base,
      successUrl,
      cancelUrl,
      metadata: {
        type: 'store_subscription',
        subscriptionId: sub.id,
        storeId: store.id,
        userId,
        plan: 'PRO',
        months: term.months,
      },
      idempotencyKey: `sub-${sub.id}-${Date.now()}`,
    });

    await prisma.storeSubscription.update({
      where: { id: sub.id },
      data: { providerSessionId: session.id },
    });

    return {
      ok: true,
      checkoutUrl: session.checkoutUrl,
      sessionId: session.id,
      subscriptionId: sub.id,
      amount,
    };
  } catch (err) {
    log.error('store.subscription.create_failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      ok: false,
      error: 'PROVIDER_ERROR',
      message: 'Impossible d’initialiser le paiement pour le moment.',
    };
  }
}

export type VerifySubscriptionResult =
  | { status: 'active'; plan: 'PRO'; expiresAt: Date }
  | { status: 'pending' | 'not_found' | 'mismatch' | 'unavailable' };

export async function verifyStoreSubscription(
  subscriptionIdOrSessionId: string,
): Promise<VerifySubscriptionResult> {
  const sub = await prisma.storeSubscription.findFirst({
    where: {
      OR: [{ id: subscriptionIdOrSessionId }, { providerSessionId: subscriptionIdOrSessionId }],
    },
  });

  if (!sub) return { status: 'not_found' };
  // A payment activates its subscription once. An already-activated one is
  // only reported — never extended again (else re-verifying an old, expired
  // subscription would renew the plan for free).
  if (sub.status !== 'pending') {
    return sub.status === 'active' && sub.expiresAt && sub.expiresAt > new Date()
      ? { status: 'active', plan: 'PRO', expiresAt: sub.expiresAt }
      : { status: 'not_found' };
  }
  if (!sub.providerSessionId || !isMonerizConfigured()) return { status: 'unavailable' };

  let session;
  try {
    session = await getMonerizCheckoutSession(sub.providerSessionId);
  } catch (err) {
    if (err instanceof MonerizApiError && err.statusCode === 404) return { status: 'mismatch' };
    return { status: 'unavailable' };
  }

  if (session.status !== 'complete') return { status: 'pending' };
  // Compare with the amount fixed when this checkout was created (a price
  // change must not reject a checkout started before it).
  if (session.reference !== sub.id || session.amount !== sub.amount) {
    log.error('store.subscription.mismatch', {
      subId: sub.id,
      sessionAmount: session.amount,
      expected: sub.amount,
    });
    return { status: 'mismatch' };
  }

  // Active for the months bought, added after any time still left. The
  // pending → active claim is atomic: when the webhook and the merchant's
  // return page verify at the same time, only one of them extends the plan.
  const startsAt = new Date();
  const expiresAt = await prisma.$transaction(async (tx) => {
    const claimed = await tx.storeSubscription.updateMany({
      where: { id: sub.id, status: 'pending' },
      data: { status: 'active', startsAt, providerPaymentId: session.paymentId },
    });
    if (claimed.count !== 1) return null;
    const currentStore = await tx.store.findUnique({
      where: { id: sub.storeId },
      select: { planExpiresAt: true },
    });
    const baseDate =
      currentStore?.planExpiresAt && currentStore.planExpiresAt > startsAt
        ? currentStore.planExpiresAt
        : startsAt;
    const until = addMonths(baseDate, sub.months);
    await tx.storeSubscription.update({ where: { id: sub.id }, data: { expiresAt: until } });
    await tx.store.update({
      where: { id: sub.storeId },
      data: { plan: 'PRO', planExpiresAt: until },
    });
    return until;
  });

  if (!expiresAt) {
    // Another request activated it a moment ago: report its result.
    const done = await prisma.storeSubscription.findUnique({
      where: { id: sub.id },
      select: { expiresAt: true },
    });
    return done?.expiresAt
      ? { status: 'active', plan: 'PRO', expiresAt: done.expiresAt }
      : { status: 'pending' };
  }

  // The shop goes online at once (cached pages refreshed).
  invalidateStorefront({ userId: sub.userId });
  log.info('store.subscription.activated', {
    storeId: sub.storeId,
    userId: sub.userId,
    expiresAt: expiresAt.toISOString(),
  });

  safeAfter(async () => {
    await prisma.notification
      .upsert({
        where: { dedupeKey: `pro-activated-${sub.id}` },
        create: {
          userId: sub.userId,
          type: 'plan.pro_activated',
          title: 'Abonnement Juula activé',
          body: `Votre boutique et vos pages produits sont en ligne pour ${sub.months === 12 ? '1 an' : `${sub.months} mois`}.`,
          dedupeKey: `pro-activated-${sub.id}`,
          data: { plan: 'PRO', expiresAt: expiresAt.toISOString() },
        },
        update: {},
      })
      .catch((err) => log.error('store.subscription.notif_failed', { error: String(err) }));

    await sendProSubscriptionActivatedEmail(sub.userId, expiresAt, sub.months, sub.amount).catch(
      (err) => log.error('store.subscription.email_failed', { error: String(err) }),
    );
  });

  return { status: 'active', plan: 'PRO', expiresAt };
}
