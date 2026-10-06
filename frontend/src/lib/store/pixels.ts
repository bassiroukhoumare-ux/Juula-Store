// Ad-tracking pixel ID formats. IDs are interpolated into the pixel loader
// scripts on public product pages, so they are validated against a strict
// alphabet both when saved and when rendered (no script injection).

// Meta (Facebook) Pixel IDs are purely numeric, typically 15–16 digits.
export const FACEBOOK_PIXEL_ID_REGEX = /^\d{10,20}$/;
// TikTok Pixel IDs are uppercase alphanumeric, typically 20 chars (e.g. "C4ABCD...").
export const TIKTOK_PIXEL_ID_REGEX = /^[A-Z0-9]{10,32}$/;

export function normalizeFacebookPixelId(raw: string): string {
  return raw.replace(/\s+/g, '');
}

export function normalizeTiktokPixelId(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

export function isValidFacebookPixelId(id: string | null | undefined): id is string {
  return typeof id === 'string' && FACEBOOK_PIXEL_ID_REGEX.test(id);
}

export function isValidTiktokPixelId(id: string | null | undefined): id is string {
  return typeof id === 'string' && TIKTOK_PIXEL_ID_REGEX.test(id);
}

// Google tag: GA4 measurement id (G-…), Google Ads (AW-…) or tag id (GT-…).
export const GOOGLE_TAG_ID_REGEX = /^(G|AW|GT)-[A-Z0-9]{4,20}$/;

export function normalizeGoogleTagId(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

export function isValidGoogleTagId(id: string | null | undefined): id is string {
  return typeof id === 'string' && GOOGLE_TAG_ID_REGEX.test(id);
}

export interface StorePixels {
  facebookPixelId: string | null;
  tiktokPixelId: string | null;
  /** Optional Google tag (GA4 / Ads). */
  googleTagId?: string | null | undefined;
}
