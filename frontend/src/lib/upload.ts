'use client';

// Direct browser → Cloudinary uploads (photos, videos, audio).
//
// 1. Ask our server for a short-lived signature (POST /api/upload/sign —
//    authenticated, CSRF-protected, via the `api()` wrapper).
// 2. Send the file straight to Cloudinary with XHR (progress events), so
//    large phone photos and videos never hit Vercel's 4.5 MB body limit.
// 3. Return a delivery URL every browser can play: HEIC → JPG/WebP,
//    MOV → MP4, voice notes → MP3, with automatic quality/format.
import { api, ApiError } from './api';
import { MEDIA_RULES, type MediaKind } from './upload-rules';

export type { MediaKind } from './upload-rules';

interface SignResponse {
  uploadUrl: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  folder: string;
  allowed_formats: string;
}

export interface UploadOptions {
  /** 0 → 100 while the file is being sent. */
  onProgress?: (percent: number) => void;
}

function readableSize(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} Mo`;
}

/** Cloudinary secure_url → URL optimised for display in every browser. */
export function deliveryUrl(secureUrl: string, kind: MediaKind): string {
  const [base, rest] = secureUrl.split('/upload/');
  if (!base || !rest) return secureUrl;
  const withoutExt = rest.replace(/\.[a-z0-9]+$/i, '');
  if (kind === 'image') return `${base}/upload/f_auto,q_auto/${rest}`;
  if (kind === 'video') return `${base}/upload/q_auto/${withoutExt}.mp4`;
  return `${base}/upload/${withoutExt}.mp3`;
}

function sendToCloudinary(
  file: File,
  sign: SignResponse,
  onProgress?: (p: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sign.apiKey);
    form.append('timestamp', String(sign.timestamp));
    form.append('signature', sign.signature);
    form.append('folder', sign.folder);
    form.append('allowed_formats', sign.allowed_formats);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', sign.uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: { secure_url?: string; error?: { message?: string } } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // fallthrough
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.secure_url) {
        resolve(body.secure_url);
        return;
      }
      const msg = body?.error?.message ?? '';
      reject(
        new Error(
          /format/i.test(msg)
            ? 'Format de fichier non accepté.'
            : /size|large/i.test(msg)
              ? 'Fichier trop lourd.'
              : msg
                ? `L'envoi a échoué : ${msg}`
                : 'L’envoi du fichier a échoué. Réessayez.',
        ),
      );
    };
    xhr.onerror = () => reject(new Error('Connexion perdue pendant l’envoi. Réessayez.'));
    xhr.send(form);
  });
}

/** Upload a photo, video or audio file and return its public URL. Throws with a French message. */
export async function uploadMedia(
  file: File,
  kind: MediaKind,
  options: UploadOptions = {},
): Promise<string> {
  const rule = MEDIA_RULES[kind];
  if (file.size > rule.maxBytes) {
    throw new Error(
      `Fichier trop lourd (${readableSize(file.size)}). Maximum : ${readableSize(rule.maxBytes)}.`,
    );
  }
  let sign: SignResponse;
  try {
    sign = await api<SignResponse>('/api/upload/sign', { method: 'POST', body: { kind } });
  } catch (err) {
    const message =
      err instanceof ApiError && typeof err.body.message === 'string'
        ? err.body.message
        : err instanceof ApiError && typeof err.body.error === 'string'
          ? err.body.error
          : err instanceof Error
            ? err.message
            : 'Impossible de préparer l’envoi. Vérifiez votre connexion.';
    throw new Error(message);
  }
  options.onProgress?.(0);
  const secureUrl = await sendToCloudinary(file, sign, options.onProgress);
  options.onProgress?.(100);
  return deliveryUrl(secureUrl, kind);
}

/** Product photos. */
export function uploadImage(file: File, options: UploadOptions = {}): Promise<string> {
  return uploadMedia(file, 'image', options);
}
