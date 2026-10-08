import 'server-only';
// Account self-deletion: blockers, e-mailed one-time code, then erasure.
//
// Money first: an account is never erased while it still holds merchant money
// (withdrawable balance, payments inside the hold, withdrawals in flight,
// disputed orders) — deleting would strand funds the merchant is owed.
//
// Erasure removes the shop, products, orders and customer data, uploads,
// sign-in methods and devices, and anonymises the User row. The row itself is
// kept because withdrawal records (accounting) reference it; it no longer holds
// any personal data and can never sign in again (no e-mail, no password, no
// OAuth link, tokenVersion bumped → every session dies on its next request).
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/server/prisma';
import { log } from '@/lib/server/observability/log';
import { computeMerchantWallet } from '@/lib/server/store/payments';
import { invalidateStorefront } from '@/lib/server/store/public-cache';
import { sendAccountDeletionCodeEmail } from '@/lib/server/store/notify';
import { tryCreateStorageClient } from '@/lib/server/storage';

export const DELETE_CODE_TYPE = 'ACCOUNT_DELETE';
export const CODE_TTL_MS = 2 * 60_000;
export const RESEND_AFTER_MS = 60_000;
export const MAX_CODES_PER_HOUR = 5;
export const MAX_ATTEMPTS = 5;

export type DeletionBlocker =
  | { code: 'BALANCE_AVAILABLE'; amount: number }
  | { code: 'BALANCE_PENDING'; amount: number }
  | { code: 'WITHDRAWAL_IN_PROGRESS'; amount: number }
  | { code: 'DISPUTE_OPEN'; amount: number }
  | { code: 'ADMIN_ACCOUNT' }
  | { code: 'ORGANIZATION_OWNER' };

export async function deletionBlockers(userId: string): Promise<DeletionBlocker[]> {
  const [user, wallet, ownedOrgs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    computeMerchantWallet(userId),
    prisma.organization.count({ where: { ownerId: userId } }),
  ]);
  const out: DeletionBlocker[] = [];
  if (user && user.role !== 'USER') out.push({ code: 'ADMIN_ACCOUNT' });
  if (ownedOrgs > 0) out.push({ code: 'ORGANIZATION_OWNER' });
  if (wallet.available > 0) out.push({ code: 'BALANCE_AVAILABLE', amount: wallet.available });
  if (wallet.pending > 0) out.push({ code: 'BALANCE_PENDING', amount: wallet.pending });
  if (wallet.inFlight > 0) out.push({ code: 'WITHDRAWAL_IN_PROGRESS', amount: wallet.inFlight });
  if (wallet.frozen > 0) out.push({ code: 'DISPUTE_OPEN', amount: wallet.frozen });
  return out;
}

/** Codes are stored hashed (and bound to the user): a DB leak reveals nothing. */
export function hashDeletionCode(userId: string, code: string): string {
  return createHash('sha256').update(`account-delete:${userId}:${code}`).digest('hex');
}

export function sameEmail(typed: string, actual: string): boolean {
  return typed.trim().toLowerCase() === actual.trim().toLowerCase();
}

export type SendCodeResult =
  | { ok: true; expiresAt: Date; resendAt: Date }
  | { ok: false; error: 'RESEND_TOO_SOON' | 'TOO_MANY_CODES'; retryAfterSec: number }
  | { ok: false; error: 'EMAIL_UNAVAILABLE' };

export async function sendDeletionCode(
  userId: string,
  email: string,
  now = new Date(),
): Promise<SendCodeResult> {
  const recent = await prisma.verificationCode.findMany({
    where: {
      userId,
      type: DELETE_CODE_TYPE,
      createdAt: { gt: new Date(now.getTime() - 3600_000) },
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  const last = recent[0];
  if (last && now.getTime() - last.createdAt.getTime() < RESEND_AFTER_MS) {
    const wait = RESEND_AFTER_MS - (now.getTime() - last.createdAt.getTime());
    return { ok: false, error: 'RESEND_TOO_SOON', retryAfterSec: Math.ceil(wait / 1000) };
  }
  if (recent.length >= MAX_CODES_PER_HOUR) {
    const oldest = recent[recent.length - 1]!;
    const wait = oldest.createdAt.getTime() + 3600_000 - now.getTime();
    return { ok: false, error: 'TOO_MANY_CODES', retryAfterSec: Math.ceil(wait / 1000) };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);
  // One live code at a time: older ones stop working.
  const [, created] = await prisma.$transaction([
    prisma.verificationCode.updateMany({
      where: { userId, type: DELETE_CODE_TYPE, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.verificationCode.create({
      data: { userId, type: DELETE_CODE_TYPE, code: hashDeletionCode(userId, code), expiresAt },
      select: { id: true },
    }),
  ]);
  const sent = await sendAccountDeletionCodeEmail(email, code, CODE_TTL_MS / 60_000);
  if (!sent) {
    // Not delivered: drop it so it neither works nor counts against the limits.
    await prisma.verificationCode.delete({ where: { id: created.id } }).catch(() => undefined);
    return { ok: false, error: 'EMAIL_UNAVAILABLE' };
  }
  return { ok: true, expiresAt, resendAt: new Date(now.getTime() + RESEND_AFTER_MS) };
}

export type ConsumeCodeResult =
  | { ok: true }
  | { ok: false; error: 'CODE_INVALID'; attemptsLeft: number }
  | { ok: false; error: 'CODE_EXPIRED' | 'CODE_LOCKED' | 'NO_CODE' };

/** Checks the code and burns it (single use, atomic). */
export async function consumeDeletionCode(
  userId: string,
  code: string,
  now = new Date(),
): Promise<ConsumeCodeResult> {
  const row = await prisma.verificationCode.findFirst({
    where: { userId, type: DELETE_CODE_TYPE, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return { ok: false, error: 'NO_CODE' };
  if (row.expiresAt <= now) return { ok: false, error: 'CODE_EXPIRED' };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: 'CODE_LOCKED' };

  const expected = Buffer.from(row.code, 'hex');
  const given = Buffer.from(hashDeletionCode(userId, code), 'hex');
  const match = expected.length === given.length && timingSafeEqual(expected, given);
  if (!match) {
    const updated = await prisma.verificationCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - updated.attempts);
    return attemptsLeft === 0
      ? { ok: false, error: 'CODE_LOCKED' }
      : { ok: false, error: 'CODE_INVALID', attemptsLeft };
  }
  // Burn it; a concurrent request with the same code loses the race.
  const burned = await prisma.verificationCode.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: now },
  });
  return burned.count === 1 ? { ok: true } : { ok: false, error: 'NO_CODE' };
}

/** Deletes everything the merchant owns and anonymises the account. */
export async function eraseAccount(userId: string): Promise<void> {
  const [store, products, uploads] = await Promise.all([
    prisma.store.findUnique({
      where: { userId },
      select: { subdomain: true, aliases: { select: { subdomain: true } } },
    }),
    prisma.product.findMany({ where: { userId }, select: { slug: true } }),
    prisma.fileUpload.findMany({ where: { userId }, select: { key: true } }),
  ]);

  await prisma.$transaction([
    prisma.storeOrder.deleteMany({ where: { merchantId: userId } }),
    prisma.product.deleteMany({ where: { userId } }),
    prisma.promoCode.deleteMany({ where: { merchantId: userId } }),
    prisma.partner.deleteMany({ where: { merchantId: userId } }),
    prisma.store.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.notificationState.deleteMany({ where: { userId } }),
    prisma.notificationPreferences.deleteMany({ where: { userId } }),
    prisma.pushSubscription.deleteMany({ where: { userId } }),
    prisma.oAuthAccount.deleteMany({ where: { userId } }),
    prisma.organizationMember.deleteMany({ where: { userId } }),
    prisma.verificationCode.deleteMany({ where: { userId } }),
    prisma.fileUpload.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@deleted.juula.invalid`,
        name: null,
        avatarUrl: null,
        passwordHash: null,
        withdrawalPinHash: null,
        emailVerifiedAt: null,
        status: 'DELETED',
        tokenVersion: { increment: 1 },
      },
    }),
  ]);

  invalidateStorefront({
    userId,
    slugs: products.map((p) => p.slug),
    subdomains: [store?.subdomain, ...(store?.aliases ?? []).map((a) => a.subdomain)],
  });
  log.info('account.deleted', { userId, products: products.length, uploads: uploads.length });

  // Images on the CDN: best effort, after the data is gone.
  const storage = tryCreateStorageClient();
  if (storage && uploads.length) {
    const results = await Promise.allSettled(uploads.map((u) => storage.deleteObject(u.key)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed) log.warn('account.deleted.cdn_cleanup_partial', { userId, failed });
  }
}
