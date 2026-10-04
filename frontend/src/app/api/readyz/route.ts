/**
 * Readiness probe — "this instance is fit to serve traffic".
 * Pings DB and (if configured) Redis. Returns 503 if either is down so
 * the load balancer routes traffic away until they recover.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROBE_TIMEOUT_MS = 1_500;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`probe timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};
  let allOk = true;

  {
    const t0 = Date.now();
    try {
      await withTimeout(prisma.$queryRawUnsafe('SELECT 1'), PROBE_TIMEOUT_MS);
      checks.database = { ok: true, latencyMs: Date.now() - t0 };
    } catch (err) {
      allOk = false;
      checks.database = {
        ok: false,
        latencyMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (redis) {
    const t0 = Date.now();
    try {
      await withTimeout(redis.ping(), PROBE_TIMEOUT_MS);
      checks.redis = { ok: true, latencyMs: Date.now() - t0 };
    } catch (err) {
      allOk = false;
      checks.redis = {
        ok: false,
        latencyMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Which optional providers are configured (booleans only — never values).
  // Lets an operator spot a missing/blank env var on a deployment.
  const has = (...names: string[]) => names.every((n) => (process.env[n] ?? '').trim().length > 0);
  const emailFrom = (process.env.EMAIL_FROM ?? '').trim();
  const services = {
    email: has('RESEND_API_KEY', 'EMAIL_FROM'),
    emailFromLooksValid: /^(.+<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/.test(emailFrom),
    media: has('CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'),
    payments: has('MONERIZ_SECRET_KEY'),
    paymentWebhookSigned: has('MONERIZ_WEBHOOK_SECRET'),
    googleLogin: has('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'),
  };

  return NextResponse.json(
    { ok: allOk, time: new Date().toISOString(), checks, services },
    { status: allOk ? 200 : 503 },
  );
}
