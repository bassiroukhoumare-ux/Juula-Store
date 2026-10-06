import 'server-only';
// Promo codes on the server: look up, check and consume a merchant's code.
// The discount is always recomputed here — the client only sends the code.
import type { NextRequest } from 'next/server';
import type { Prisma, PromoCode } from '@prisma/client';
import { redis } from '@/lib/server/redis';
import {
  MemoryRateLimitStore,
  RedisRateLimitStore,
  type RateLimitStore,
} from '@/lib/server/rate-limit-store';
import {
  computePromoDiscount,
  normalizePromoCode,
  type PromoCodeDTO,
  type PromoResult,
  type PromoType,
} from '@/lib/store/marketing';

type Client = Prisma.TransactionClient;

export function toPromoDTO(p: PromoCode): PromoCodeDTO {
  return {
    id: p.id,
    code: p.code,
    type: p.type as PromoType,
    value: p.value,
    minAmount: p.minAmount,
    maxUses: p.maxUses,
    usedCount: p.usedCount,
    expiresAt: p.expiresAt?.toISOString() ?? null,
    active: p.active,
    createdAt: p.createdAt.toISOString(),
  };
}

export type CheckedPromo = (PromoResult & { ok: true; id: string }) | (PromoResult & { ok: false });

/** Validates `rawCode` for this merchant and order amounts (no side effect). */
export async function checkPromo(
  client: Client,
  merchantId: string,
  rawCode: string,
  subtotal: number,
  deliveryFee: number,
): Promise<CheckedPromo> {
  const code = normalizePromoCode(rawCode);
  if (!code) {
    return { ok: false, error: 'PROMO_INVALID', message: 'Saisissez un code promo.' };
  }
  const promo = await client.promoCode.findUnique({
    where: { merchantId_code: { merchantId, code } },
  });
  if (!promo) {
    return { ok: false, error: 'PROMO_INVALID', message: 'Ce code promo n’existe pas.' };
  }
  const result = computePromoDiscount(toPromoDTO(promo), subtotal, deliveryFee);
  return result.ok ? { ...result, id: promo.id } : result;
}

/** Thrown inside an order transaction when the last use was just taken. */
export class PromoExhaustedError extends Error {
  constructor() {
    super('PROMO_EXHAUSTED');
  }
}

/**
 * Counts one use, atomically and only while uses remain (two simultaneous
 * orders cannot both take the last use). Returns false when it ran out.
 */
export async function consumePromo(tx: Client, promoId: string): Promise<boolean> {
  const updated = await tx.$executeRaw`
    UPDATE "PromoCode" SET "usedCount" = "usedCount" + 1, "updatedAt" = NOW()
    WHERE "id" = ${promoId} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
  return updated === 1;
}

// Code checks from the public pages: 20 tries / 10 min per IP, so codes
// cannot be guessed by brute force.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CHECKS = 20;
let limiter: RateLimitStore | null = null;

export async function promoCheckRateLimit(req: NextRequest): Promise<number | null> {
  limiter ??= redis
    ? new RedisRateLimitStore({ redis, prefix: 'rl:promo-check:', windowMs: WINDOW_MS })
    : new MemoryRateLimitStore({ windowMs: WINDOW_MS });
  const xff = req.headers.get('x-forwarded-for');
  const ip = xff ? xff.split(',')[0]!.trim() : (req.headers.get('x-real-ip') ?? 'unknown');
  const { totalHits, resetTime } = await limiter.increment(ip);
  if (totalHits <= MAX_CHECKS) return null;
  return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
}
