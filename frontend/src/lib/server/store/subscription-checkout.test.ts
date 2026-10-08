import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createSession = vi.fn();
const getSession = vi.fn();
vi.mock('@/lib/server/payments/moneriz', () => ({
  createMonerizCheckoutSession: createSession,
  getMonerizCheckoutSession: getSession,
  getMonerizConfig: () => ({ secretKey: 'izp_test_x' }),
  MonerizApiError: class extends Error {},
}));
vi.mock('@/lib/server/store/notify', () => ({
  safeAfter: vi.fn(),
  sendProSubscriptionActivatedEmail: vi.fn(),
}));
vi.mock('@/lib/server/store/public-cache', () => ({ invalidateStorefront: vi.fn() }));

const { createProSubscriptionSession, verifyStoreSubscription } = await import('./subscription');

const sub = (over: object = {}) =>
  ({
    id: 'sub1',
    storeId: 'st1',
    userId: 'u1',
    amount: 11000,
    months: 3,
    status: 'pending',
    providerSessionId: 'cs_1',
    expiresAt: null,
    ...over,
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
    typeof fn === 'function' ? fn(prismaMock) : Promise.resolve([])) as never);
});

describe('createProSubscriptionSession', () => {
  it.each([
    [1, 3900],
    [3, 11000],
    [6, 22000],
    [12, 45000],
  ] as const)('%i month(s) → checkout of %i FCFA', async (months, amount) => {
    prismaMock.store.upsert.mockResolvedValue({ id: 'st1' } as never);
    prismaMock.storeSubscription.create.mockResolvedValue({ id: 'sub1' } as never);
    prismaMock.storeSubscription.update.mockResolvedValue({} as never);
    createSession.mockResolvedValue({ id: 'cs_1', checkoutUrl: 'https://pay.example/cs_1' });
    const r = await createProSubscriptionSession('u1', 'https://www.juula.store', {
      months,
      displayCurrency: 'EUR',
    });
    expect(r).toMatchObject({ ok: true, amount });
    expect(prismaMock.storeSubscription.create.mock.calls[0]![0].data).toMatchObject({
      amount,
      months,
      displayCurrency: 'EUR',
    });
    expect(createSession.mock.calls[0]![0]).toMatchObject({ amount, currency: 'XOF' });
  });
});

describe('verifyStoreSubscription', () => {
  const paid = { status: 'complete', reference: 'sub1', amount: 11000, paymentId: 'pay_1' };

  it('activates 3 months on top of the time left', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(sub());
    getSession.mockResolvedValue(paid);
    prismaMock.storeSubscription.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.store.findUnique.mockResolvedValue({
      planExpiresAt: new Date('2099-01-15T00:00:00Z'),
    } as never);
    const r = await verifyStoreSubscription('sub1');
    expect(r).toMatchObject({ status: 'active' });
    expect((r as { expiresAt: Date }).expiresAt.toISOString()).toBe('2099-04-15T00:00:00.000Z');
    expect(prismaMock.store.update.mock.calls[0]![0].data).toMatchObject({ plan: 'PRO' });
  });

  it('activates 12 months from today when nothing is left', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(sub({ months: 12, amount: 45000 }));
    getSession.mockResolvedValue({ ...paid, amount: 45000 });
    prismaMock.storeSubscription.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.store.findUnique.mockResolvedValue({ planExpiresAt: null } as never);
    const r = (await verifyStoreSubscription('sub1')) as { expiresAt: Date };
    const days = (r.expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(364);
    expect(days).toBeLessThan(367);
  });

  it('never extends twice when two verifications race', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(sub());
    getSession.mockResolvedValue(paid);
    prismaMock.storeSubscription.updateMany.mockResolvedValue({ count: 0 }); // lost the claim
    prismaMock.storeSubscription.findUnique.mockResolvedValue({
      expiresAt: new Date('2099-04-15T00:00:00Z'),
    } as never);
    expect(await verifyStoreSubscription('sub1')).toMatchObject({ status: 'active' });
    expect(prismaMock.store.update).not.toHaveBeenCalled();
  });

  it('does not renew an expired subscription for free', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(
      sub({ status: 'active', expiresAt: new Date('2020-01-01T00:00:00Z') }),
    );
    expect(await verifyStoreSubscription('sub1')).toEqual({ status: 'not_found' });
    expect(getSession).not.toHaveBeenCalled();
    expect(prismaMock.store.update).not.toHaveBeenCalled();
  });

  it('refuses a payment whose amount does not match the term', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(sub());
    getSession.mockResolvedValue({ ...paid, amount: 3900 });
    expect(await verifyStoreSubscription('sub1')).toEqual({ status: 'mismatch' });
    expect(prismaMock.store.update).not.toHaveBeenCalled();
  });

  it('waits while the payment is not complete', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(sub());
    getSession.mockResolvedValue({ ...paid, status: 'open' });
    expect(await verifyStoreSubscription('sub1')).toEqual({ status: 'pending' });
  });
});
