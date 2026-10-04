'use client';

// Multipart upload to the authenticated, magic-byte-checked POST /api/upload
// (Cloudinary). The `api()` wrapper only sends JSON, so this mirrors its
// CSRF lookup and its one-shot refresh on 401.
import { api, ApiError } from './api';
import { API_URL, COOKIE_PREFIX } from './constants';

const CSRF_KEY = `${COOKIE_PREFIX}-csrf`;

function csrfToken(): string | null {
  const fromStorage = localStorage.getItem(CSRF_KEY);
  if (fromStorage) return fromStorage;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_KEY}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

const ERROR_MESSAGES: Record<string, string> = {
  FILE_TOO_LARGE: 'Image trop lourde (10 Mo maximum).',
  INVALID_MIME: 'Format non supporté — utilisez JPG, PNG ou WebP.',
  MAGIC_BYTE_MISMATCH: "Ce fichier n'est pas une image valide.",
  STORAGE_NOT_CONFIGURED: "Le stockage d'images n'est pas configuré sur le serveur.",
};

async function send(file: File): Promise<Response> {
  const form = new FormData();
  form.append('file', file);
  const token = csrfToken();
  return fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers: token ? { 'x-csrf-token': token } : {},
  });
}

/** Upload an image and return its public CDN URL. Throws with a French message. */
export async function uploadImage(file: File): Promise<string> {
  let res = await send(file);
  if (res.status === 401) {
    // Access token expired: `api()` refreshes it, then retry once.
    await api('/api/auth/me').catch(() => undefined);
    res = await send(file);
  }
  const body = (await res.json().catch(() => null)) as {
    url?: string;
    code?: string;
    error?: string;
  } | null;
  if (!res.ok || !body?.url) {
    const code = body?.code ?? body?.error ?? '';
    throw new ApiError(
      res.status,
      ERROR_MESSAGES[code] ?? "L'envoi de l'image a échoué. Réessayez.",
      body ?? {},
    );
  }
  return body.url;
}
