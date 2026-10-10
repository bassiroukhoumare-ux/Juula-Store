'use client';

// AI calls of the product-page tools. Goes through api() so the CSRF token and
// the silent session refresh are attached (the AI routes require both), and
// returns { ok, data } so callers keep their own error messages (data.message
// carries the server's reason, e.g. the AI usage limit).
import { api, ApiError } from '@/lib/api';

export async function postAi<T = Record<string, unknown>>(
  url: string,
  body: unknown,
): Promise<{ ok: boolean; data: T & { message?: string } }> {
  try {
    return { ok: true, data: await api<T & { message?: string }>(url, { method: 'POST', body }) };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, data: err.body as T & { message?: string } };
    throw err;
  }
}
