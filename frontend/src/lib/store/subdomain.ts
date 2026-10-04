// Store subdomains: https://<subdomain>.juula.store
//
// Shared by the browser (onboarding / settings live preview), the API
// (validation) and the edge middleware (host → storefront rewrite), so it
// must stay dependency-free.

/** Root domain the storefront subdomains hang off. "localhost:3000" in dev. */
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'juula.store').toLowerCase();

export const SUBDOMAIN_MIN = 3;
export const SUBDOMAIN_MAX = 30;

/** Never available to merchants: platform hosts, mail records, brand. */
export const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'administrateur',
  'dashboard',
  'tableau-de-bord',
  'login',
  'signup',
  'auth',
  'account',
  'compte',
  'mail',
  'email',
  'smtp',
  'imap',
  'pop',
  'send',
  'bounce',
  'mx',
  'ftp',
  'cdn',
  'static',
  'assets',
  'img',
  'images',
  'media',
  'files',
  'docs',
  'doc',
  'blog',
  'help',
  'aide',
  'support',
  'status',
  'dev',
  'test',
  'staging',
  'preview',
  'demo',
  'beta',
  'juula',
  'juulastore',
  'juula-store',
  'store',
  'boutique',
  'shop',
  'pay',
  'paiement',
  'payments',
  'wallet',
  'checkout',
  'billing',
  'facture',
  'factures',
  'security',
  'securite',
  'legal',
  'conditions',
  'confidentialite',
  'privacy',
  'terms',
  'contact',
  'about',
  'apropos',
  'moneriz',
  'wave',
  'orange',
  'orange-money',
  'google',
  'facebook',
  'tiktok',
  'whatsapp',
  '_dmarc',
  '_domainkey',
]);

/** "Boutique Élégance Dakar!" → "boutique-elegance-dakar". */
export function normalizeSubdomain(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SUBDOMAIN_MAX)
    .replace(/-+$/g, '');
}

export type SubdomainProblem = 'TOO_SHORT' | 'TOO_LONG' | 'INVALID' | 'RESERVED';

/** Validates an already-normalized subdomain. Returns null when acceptable. */
export function subdomainProblem(sub: string): SubdomainProblem | null {
  if (sub.length < SUBDOMAIN_MIN) return 'TOO_SHORT';
  if (sub.length > SUBDOMAIN_MAX) return 'TOO_LONG';
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(sub) || sub.includes('--')) return 'INVALID';
  if (RESERVED_SUBDOMAINS.has(sub)) return 'RESERVED';
  return null;
}

export const SUBDOMAIN_MESSAGES: Record<SubdomainProblem | 'TAKEN', string> = {
  TOO_SHORT: `Au moins ${SUBDOMAIN_MIN} caractères.`,
  TOO_LONG: `${SUBDOMAIN_MAX} caractères maximum.`,
  INVALID: 'Lettres, chiffres et tirets uniquement.',
  RESERVED: 'Cette adresse est réservée, choisissez-en une autre.',
  TAKEN: 'Cette adresse est déjà utilisée par une autre boutique.',
};

function isLocalRoot(): boolean {
  return ROOT_DOMAIN.startsWith('localhost') || ROOT_DOMAIN.startsWith('127.');
}

/** https://awa-shop.juula.store (http://awa-shop.localhost:3000 in dev). */
export function storeOrigin(subdomain: string): string {
  return `${isLocalRoot() ? 'http' : 'https'}://${subdomain}.${ROOT_DOMAIN}`;
}

/** Public product link on the merchant's subdomain. */
export function storeProductUrl(subdomain: string, productSlug: string): string {
  return `${storeOrigin(subdomain)}/${productSlug}`;
}

/**
 * Host → merchant subdomain, or null for the platform itself
 * (juula.store, www.juula.store, preview deployments, …).
 */
export function subdomainFromHost(host: string | null): string | null {
  if (!host) return null;
  const h = host.toLowerCase().replace(/\.$/, '');
  const suffix = `.${ROOT_DOMAIN}`;
  if (!h.endsWith(suffix)) return null;
  const sub = h.slice(0, -suffix.length);
  if (!sub || sub.includes('.') || sub === 'www') return null;
  return sub;
}

/** The platform itself: https://www.juula.store (http://localhost:3000 in dev). */
export function platformOrigin(): string {
  return isLocalRoot() ? `http://${ROOT_DOMAIN}` : `https://www.${ROOT_DOMAIN}`;
}
