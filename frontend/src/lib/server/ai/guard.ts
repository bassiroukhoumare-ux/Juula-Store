import 'server-only';
// Shared gate of the AI routes: CSRF + session + a per-merchant budget, so a
// script (or a stuck button) can't burn the Gemini quota/bill.
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { redis } from '@/lib/server/redis';
import {
  MemoryRateLimitStore,
  RedisRateLimitStore,
  type RateLimitStore,
} from '@/lib/server/rate-limit-store';

const WINDOW_MS = 10 * 60 * 1000;
export const AI_REQUESTS_PER_WINDOW = 30;

let store: RateLimitStore | null = null;
function limiter(): RateLimitStore {
  if (!store) {
    store = redis
      ? new RedisRateLimitStore({ redis, prefix: 'rl:ai:', windowMs: WINDOW_MS })
      : new MemoryRateLimitStore({ windowMs: WINDOW_MS });
  }
  return store;
}

/** Returns the caller's user id, or the response to send back (403/401/429). */
export async function guardAiRequest(
  req: NextRequest,
  headers: Record<string, string>,
): Promise<{ userId: string } | NextResponse> {
  const csrf = verifyCsrf(req);
  if (csrf) return csrf;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.sub;
  const { totalHits, resetTime } = await limiter().increment(userId);
  if (totalHits > AI_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.max(
      1,
      Math.ceil(((resetTime?.getTime() ?? Date.now()) - Date.now()) / 1000),
    );
    return NextResponse.json(
      {
        error: 'AI_RATE_LIMITED',
        message: `Vous avez utilisé l’IA ${AI_REQUESTS_PER_WINDOW} fois en 10 minutes. Réessayez dans ${Math.ceil(retryAfter / 60)} min.`,
      },
      { status: 429, headers: { ...headers, 'Retry-After': String(retryAfter) } },
    );
  }
  return { userId };
}
