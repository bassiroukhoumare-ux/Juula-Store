import 'server-only';
// /adminom — the platform back-office, opened with a single master access
// code. Only the code's SHA-256 lives in the environment
// (ADMIN_ACCESS_CODE_HASH); a successful login sets a signed, HttpOnly
// `admin_auth_token` cookie (12 h). Every admin API checks it, and mutating
// calls also require a same-origin request with the `x-adminom` header.
import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import {
  MemoryRateLimitStore,
  RedisRateLimitStore,
  type RateLimitStore,
} from '@/lib/server/rate-limit-store';

export const ADMIN_COOKIE = 'admin_auth_token';
const AUDIENCE = 'juula-adminom';
const SESSION_HOURS = 12;

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not configured');
  return new TextEncoder().encode(s);
}

/**
 * SHA-256 (hex) of the master code, from ADMIN_ACCESS_CODE_HASH only — the code
 * itself never lives in the repository. Tolerates quotes / spaces / a trailing
 * newline pasted into the hosting dashboard.
 */
function configuredHash(): string | null {
  const v = (process.env.ADMIN_ACCESS_CODE_HASH ?? '').trim().replace(/^["']|["']$/g, '');
  return /^[a-f0-9]{64}$/i.test(v) ? v.toLowerCase() : null;
}

export function isAdminomConfigured(): boolean {
  return configuredHash() !== null;
}

/** Constant-time comparison of the code's SHA-256 with the configured one. */
export function checkAccessCode(code: string): boolean {
  const hash = configuredHash();
  if (!hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const given = createHash('sha256').update(code.trim(), 'utf8').digest();
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function createAdminToken(): Promise<string> {
  return new SignJWT({ role: 'adminom' })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

export function adminCookieOptions(maxAge = SESSION_HOURS * 3600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

async function validToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: AUDIENCE });
    return payload.role === 'adminom';
  } catch {
    return false;
  }
}

/** Server components: is the visitor signed in to /adminom? */
export async function hasAdminSession(): Promise<boolean> {
  return validToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

/**
 * API guard. Returns a response to send back when access is refused, null
 * when the call may proceed. Mutations must come from this site (Origin) and
 * carry `x-adminom: 1` (a header other sites cannot add without CORS).
 */
export async function requireAdminom(req: NextRequest): Promise<NextResponse | null> {
  const ok = await validToken(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!ok) {
    return NextResponse.json(
      { error: 'ADMIN_AUTH_REQUIRED', message: 'Session administrateur expirée.' },
      { status: 401 },
    );
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    const sameOrigin = !origin || (host !== null && new URL(origin).host === host);
    if (!sameOrigin || req.headers.get('x-adminom') !== '1') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
  }
  return null;
}

// Login attempts: 5 / 15 min per IP (the code cannot be brute-forced).
let limiter: RateLimitStore | null = null;
export async function loginRateLimit(req: NextRequest): Promise<number | null> {
  limiter ??= redis
    ? new RedisRateLimitStore({ redis, prefix: 'rl:adminom-login:', windowMs: 15 * 60_000 })
    : new MemoryRateLimitStore({ windowMs: 15 * 60_000 });
  const xff = req.headers.get('x-forwarded-for');
  const ip = xff ? xff.split(',')[0]!.trim() : (req.headers.get('x-real-ip') ?? 'unknown');
  const { totalHits, resetTime } = await limiter.increment(ip);
  if (totalHits <= 5) return null;
  return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
}

export function requestMeta(req: NextRequest): { ip?: string; userAgent?: string } {
  const xff = req.headers.get('x-forwarded-for');
  const ip = xff ? xff.split(',')[0]!.trim() : (req.headers.get('x-real-ip') ?? undefined);
  const ua = req.headers.get('user-agent') ?? undefined;
  return { ...(ip ? { ip } : {}), ...(ua ? { userAgent: ua } : {}) };
}

/**
 * The audit log (AdminAction) needs a user as author: actions done from
 * /adminom are signed by this technical account (it cannot sign in: no
 * password, no Google account).
 */
const ACTOR_EMAIL = 'adminom@system.juula.store';
let actorId: string | null = null;
export async function adminomActorId(): Promise<string> {
  if (actorId) return actorId;
  const user = await prisma.user.upsert({
    where: { email: ACTOR_EMAIL },
    create: { email: ACTOR_EMAIL, name: 'Admin Juula (/adminom)' },
    update: {},
    select: { id: true },
  });
  actorId = user.id;
  return actorId;
}
