// FCFA per US dollar (EUR needs no lookup: fixed CFA parity). Refreshed at
// most every 12h from a public rates API; conservative fallback offline.
import 'server-only';
import { DEFAULT_XOF_PER_USD } from '@/lib/money';

const TTL_MS = 12 * 3600_000;
let cache: { xofPerUsd: number; at: number; source: 'live' | 'fallback' } | null = null;

export async function getXofPerUsd(): Promise<{ xofPerUsd: number; source: 'live' | 'fallback' }> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 43200 },
    });
    const body = (await res.json()) as { rates?: Record<string, number> };
    const rate = body.rates?.XOF;
    if (res.ok && typeof rate === 'number' && rate > 300 && rate < 1500) {
      cache = { xofPerUsd: Math.round(rate * 100) / 100, at: Date.now(), source: 'live' };
      return cache;
    }
  } catch {
    // fall through
  }
  return cache ?? { xofPerUsd: DEFAULT_XOF_PER_USD, source: 'fallback' };
}
