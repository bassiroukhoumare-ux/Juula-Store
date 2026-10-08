import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.fn();
const wallet = vi.fn();
vi.mock('@/lib/server/store/notify', () => ({ sendAccountDeletionCodeEmail: sendMail }));
vi.mock('@/lib/server/store/payments', () => ({ computeMerchantWallet: wallet }));
vi.mock('@/lib/server/store/public-cache', () => ({ invalidateStorefront: vi.fn() }));
vi.mock('@/lib/server/storage', () => ({ tryCreateStorageClient: () => null }));

const { consumeDeletionCode, deletionBlockers, hashDeletionCode, sameEmail, sendDeletionCode } =
  await import('./deletion');

const NOW = new Date('2026-10-08T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);

beforeEach(() => {
  vi.clearAllMocks();
  sendMail.mockResolvedValue(true);
  prismaMock.$transaction.mockResolvedValue([{ count: 0 }, { id: 'new' }] as never);
  wallet.mockResolvedValue({ available: 0, pending: 0, inFlight: 0, frozen: 0 });
  prismaMock.user.findUnique.mockResolvedValue({ role: 'USER' } as never);
  prismaMock.organization.count.mockResolvedValue(0);
});

describe('deletionBlockers', () => {
  it('lets an empty merchant account go', async () => {
    expect(await deletionBlockers('u1')).toEqual([]);
  });

  it('refuses while the merchant still has money or is an admin', async () => {
    wallet.mockResolvedValue({ available: 12000, pending: 0, inFlight: 5000, frozen: 0 });
    prismaMock.user.findUnique.mockResolvedValue({ role: 'ADMIN' } as never);
    expect((await deletionBlockers('u1')).map((b) => b.code)).toEqual([
      'ADMIN_ACCOUNT',
      'BALANCE_AVAILABLE',
      'WITHDRAWAL_IN_PROGRESS',
    ]);
  });
});

describe('sendDeletionCode', () => {
  it('sends a 6-digit code and stores only its hash, valid 2 minutes', async () => {
    prismaMock.verificationCode.findMany.mockResolvedValue([]);
    const r = await sendDeletionCode('u1', 'awa@juula.test', NOW);
    expect(r).toMatchObject({ ok: true });
    const code = sendMail.mock.calls[0]![1] as string;
    expect(code).toMatch(/^\d{6}$/);
    const created = prismaMock.verificationCode.create.mock.calls[0]![0].data;
    expect(created.code).toBe(hashDeletionCode('u1', code));
    expect(created.code).not.toContain(code);
    expect((created.expiresAt as Date).getTime() - NOW.getTime()).toBe(120_000);
  });

  it('refuses a resend within 60 s', async () => {
    prismaMock.verificationCode.findMany.mockResolvedValue([{ createdAt: ago(20_000) }] as never);
    expect(await sendDeletionCode('u1', 'a@b.c', NOW)).toEqual({
      ok: false,
      error: 'RESEND_TOO_SOON',
      retryAfterSec: 40,
    });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('caps at 5 codes per hour', async () => {
    prismaMock.verificationCode.findMany.mockResolvedValue(
      [5, 10, 20, 30, 50].map((m) => ({ createdAt: ago(m * 60_000) })) as never,
    );
    expect(await sendDeletionCode('u1', 'a@b.c', NOW)).toMatchObject({
      ok: false,
      error: 'TOO_MANY_CODES',
      retryAfterSec: 600,
    });
  });
});

it('drops the code when the e-mail cannot be sent', async () => {
  prismaMock.verificationCode.findMany.mockResolvedValue([]);
  sendMail.mockResolvedValue(false);
  prismaMock.verificationCode.delete.mockResolvedValue({} as never);
  expect(await sendDeletionCode('u1', 'a@b.c', NOW)).toEqual({
    ok: false,
    error: 'EMAIL_UNAVAILABLE',
  });
  expect(prismaMock.verificationCode.delete).toHaveBeenCalledWith({ where: { id: 'new' } });
});

describe('consumeDeletionCode', () => {
  const row = (over: object = {}) =>
    ({
      id: 'c1',
      code: hashDeletionCode('u1', '123456'),
      expiresAt: new Date(NOW.getTime() + 60_000),
      attempts: 0,
      ...over,
    }) as never;

  it('accepts the right code once', async () => {
    prismaMock.verificationCode.findFirst.mockResolvedValue(row());
    prismaMock.verificationCode.updateMany.mockResolvedValue({ count: 1 });
    expect(await consumeDeletionCode('u1', '123456', NOW)).toEqual({ ok: true });
  });

  it('counts wrong codes and locks after 5', async () => {
    prismaMock.verificationCode.findFirst.mockResolvedValue(row());
    prismaMock.verificationCode.update.mockResolvedValue({ attempts: 1 } as never);
    expect(await consumeDeletionCode('u1', '000000', NOW)).toEqual({
      ok: false,
      error: 'CODE_INVALID',
      attemptsLeft: 4,
    });
    prismaMock.verificationCode.update.mockResolvedValue({ attempts: 5 } as never);
    expect(await consumeDeletionCode('u1', '000000', NOW)).toEqual({
      ok: false,
      error: 'CODE_LOCKED',
    });
  });

  it('rejects an expired code', async () => {
    prismaMock.verificationCode.findFirst.mockResolvedValue(row({ expiresAt: ago(1) }));
    expect(await consumeDeletionCode('u1', '123456', NOW)).toEqual({
      ok: false,
      error: 'CODE_EXPIRED',
    });
  });

  it('a code from another account never matches', async () => {
    prismaMock.verificationCode.findFirst.mockResolvedValue(
      row({ code: hashDeletionCode('u2', '123456') }),
    );
    prismaMock.verificationCode.update.mockResolvedValue({ attempts: 1 } as never);
    expect(await consumeDeletionCode('u1', '123456', NOW)).toMatchObject({ error: 'CODE_INVALID' });
  });
});

it('compares e-mails case- and space-insensitively', () => {
  expect(sameEmail('  Awa@Juula.Test ', 'awa@juula.test')).toBe(true);
  expect(sameEmail('awa@juula.tes', 'awa@juula.test')).toBe(false);
});
