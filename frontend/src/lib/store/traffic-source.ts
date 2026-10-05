// Where a product-page visitor comes from. Used by the browser (to tag the
// visit) and the server (to re-validate what the browser sent).

export const KNOWN_SOURCES = [
  'facebook',
  'instagram',
  'tiktok',
  'whatsapp',
  'google',
  'youtube',
  'snapchat',
  'twitter',
  'linkedin',
  'telegram',
  'direct',
] as const;

export type KnownSource = (typeof KNOWN_SOURCES)[number];

export const SOURCE_LABELS: Record<KnownSource, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  google: 'Google',
  youtube: 'YouTube',
  snapchat: 'Snapchat',
  twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',
  telegram: 'Telegram',
  direct: 'Accès direct',
};

const HOST_RULES: [RegExp, KnownSource][] = [
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, 'facebook'],
  [/(^|\.)(instagram\.com|ig\.me)$/, 'instagram'],
  [/(^|\.)(tiktok\.com|tiktokv\.com)$/, 'tiktok'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
  [/(^|\.)google\.[a-z.]+$/, 'google'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)snapchat\.com$/, 'snapchat'],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, 'twitter'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'linkedin'],
  [/(^|\.)(t\.me|telegram\.org)$/, 'telegram'],
];

const UTM_ALIASES: Record<string, KnownSource> = {
  fb: 'facebook',
  facebook: 'facebook',
  meta: 'facebook',
  ig: 'instagram',
  instagram: 'instagram',
  tiktok: 'tiktok',
  tt: 'tiktok',
  whatsapp: 'whatsapp',
  wa: 'whatsapp',
  google: 'google',
  youtube: 'youtube',
  snapchat: 'snapchat',
  twitter: 'twitter',
  x: 'twitter',
  linkedin: 'linkedin',
  telegram: 'telegram',
};

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Source of a visit: utm_source / ad click ids first, then the referrer's
 * host. Internal navigation (same host) and no referrer → "direct". Unknown
 * websites are kept as their host name (e.g. "monblog.sn").
 */
export function classifySource(input: { referrer?: string | null | undefined; pageUrl: string }): {
  source: string;
  referrerHost: string | null;
} {
  let params: URLSearchParams;
  let pageHost: string | null = null;
  try {
    const page = new URL(input.pageUrl);
    params = page.searchParams;
    pageHost = page.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    params = new URLSearchParams();
  }
  const referrerHost = hostOf(input.referrer);

  const utm = params.get('utm_source')?.trim().toLowerCase();
  if (utm && UTM_ALIASES[utm]) return { source: UTM_ALIASES[utm], referrerHost };
  if (params.has('fbclid')) return { source: 'facebook', referrerHost };
  if (params.has('ttclid')) return { source: 'tiktok', referrerHost };
  if (params.has('gclid')) return { source: 'google', referrerHost };

  if (!referrerHost || referrerHost === pageHost) return { source: 'direct', referrerHost: null };
  for (const [re, source] of HOST_RULES) if (re.test(referrerHost)) return { source, referrerHost };
  return { source: sanitizeSource(referrerHost), referrerHost };
}

/** Server-side guard: a known source, or a plausible host name (max 60 chars). */
export function sanitizeSource(raw: string): string {
  const v = raw.trim().toLowerCase();
  if ((KNOWN_SOURCES as readonly string[]).includes(v)) return v;
  return /^[a-z0-9.-]{3,60}$/.test(v) ? v : 'direct';
}

export function sourceLabel(source: string): string {
  return (SOURCE_LABELS as Record<string, string>)[source] ?? source;
}

const countryNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['fr'], { type: 'region' })
    : null;

/** "SN" → "Sénégal"; unknown → "Inconnu". */
export function countryLabel(code: string | null | undefined): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return 'Inconnu';
  try {
    return countryNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** ISO 3166-1 alpha-2 country code. */
export function isCountryCode(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Z]{2}$/.test(v);
}
