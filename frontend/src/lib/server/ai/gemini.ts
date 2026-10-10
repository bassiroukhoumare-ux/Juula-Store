import 'server-only';
// Single entry point to the Gemini API for every AI feature.
//
// - Current models, tried in order (Google retires model ids for new keys —
//   gemini-2.5-flash already answers 404 « no longer available to new users »).
//   GEMINI_MODEL overrides the first choice without a deploy of code.
// - API key sent in the x-goog-api-key header, never in the URL (URLs end up
//   in proxy/CDN logs).
// - Bounded time per attempt; failures are logged instead of being swallowed,
//   so a dead key or quota shows up in the logs at once.
import { log } from '@/lib/server/observability/log';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';
// Measured: gemini-3.5-flash (low thinking) ≈ 4-5 s, the lite models ≈ 2-3 s;
// gemini-flash-latest hung > 60 s, so it is not in the chain.
const DEFAULT_MODELS = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite'];
const ATTEMPT_TIMEOUT_MS = 12_000;
// The browser client (lib/api.ts) aborts any call after 30 s: stay well below.
const TOTAL_BUDGET_MS = 26_000;

/** Low « thinking » on full flash models: same quality here, 5x faster. */
function withModelConfig(body: unknown, model: string): unknown {
  if (!body || typeof body !== 'object' || /lite/.test(model)) return body;
  const b = body as { generationConfig?: Record<string, unknown> };
  return {
    ...b,
    generationConfig: { ...(b.generationConfig ?? {}), thinkingConfig: { thinkingLevel: 'low' } },
  };
}

export function geminiModels(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  return preferred ? [preferred, ...DEFAULT_MODELS.filter((m) => m !== preferred)] : DEFAULT_MODELS;
}

export function geminiApiKey(override?: string | null): string {
  return override?.trim() || process.env.GEMINI_API_KEY?.trim() || '';
}

export function isGeminiConfigured(): boolean {
  return Boolean(geminiApiKey());
}

/**
 * POST :generateContent with `body`, trying each model until one answers 2xx.
 * Returns that Response, or a synthetic 503 Response when none did (no key,
 * network down, every model failed) — callers then use their fallback.
 */
export async function geminiGenerateContent(
  body: unknown,
  apiKey?: string | null,
): Promise<Response> {
  const key = geminiApiKey(apiKey);
  if (!key) return new Response(null, { status: 503, statusText: 'GEMINI_NOT_CONFIGURED' });

  let last = 'no attempt';
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  for (const model of geminiModels()) {
    const left = deadline - Date.now();
    if (left < 2_000) break;
    try {
      const res = await fetch(`${API}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(withModelConfig(body, model)),
        signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, left)),
      });
      if (res.ok) return res;
      const detail = await res.text().catch(() => '');
      last = `${model} → ${res.status} ${detail.slice(0, 160)}`;
      // A bad key fails the same way on every model: stop early.
      if (res.status === 400 && /API key/i.test(detail)) break;
      if (res.status === 401 || res.status === 403) break;
    } catch (err) {
      last = `${model} → ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  log.warn('ai.gemini.unavailable', { detail: last });
  return new Response(null, { status: 503, statusText: 'GEMINI_UNAVAILABLE' });
}
