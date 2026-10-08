import { jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';
import { platformOrigin, subdomainFromHost } from '@/lib/store/subdomain';

// Session-aware routing, resolved at the edge so the installed app (PWA) never
// flashes the login screen.
//
// - Protected pages (/dashboard, /settings — AUTH_PROTECTED_PREFIXES overrides):
//   valid access cookie → render. Expired access but a live session hint →
//   bounce through /api/auth/refresh-and-return, which mints fresh cookies and
//   302s back to the original URL (query string included) — invisible to the
//   user. No session at all → /login?next=<url>.
// - Auth pages (/login, /signup) and the PWA entry (/?source=pwa): a signed-in
//   user goes straight to /dashboard (or `next`).
//
// The refresh cookie is path-scoped to /api/auth, so it is never sent here. The
// CSRF cookie (path /, same 60-day lifetime, set and cleared with the refresh
// cookie) serves as the "a session probably exists" hint; refresh-and-return
// does the real check and clears every cookie when the session is dead.
// `?expired=1` on /login marks that dead end and stops any further bounce.
//
// Store subdomains: a request to https://<shop>.juula.store/<path> is
// rewritten to /boutique/<shop>/<path> (storefront home or product page).
// Platform pages (dashboard, login…) always live on www and are redirected.
//
// Runs before every page (Next 16 "proxy", formerly middleware): no DB, no
// bcrypt, no Prisma. We only verify the access JWT
// signature/expiry and build redirects — the heavy lifting happens in
// /api/auth/refresh-and-return (runtime=nodejs).

const COOKIE_PREFIX = process.env.COOKIE_PREFIX || 'app';
const ACCESS_COOKIE = `${COOKIE_PREFIX}-token`;
const SESSION_HINT_COOKIE = `${COOKIE_PREFIX}-csrf`;
const LOGIN_PATH = process.env.AUTH_LOGIN_PATH || '/login';
const HOME_PATH = '/dashboard';

const AUTHED_PREFIXES = (process.env.AUTH_PROTECTED_PREFIXES || '/dashboard,/settings')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const AUTH_PAGES = new Set(['/login', '/signup']);

function isAuthedPath(pathname: string): boolean {
  return AUTHED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const secret = process.env.JWT_SECRET ? new TextEncoder().encode(process.env.JWT_SECRET) : null;

/** Access cookie present, correctly signed, not expired. */
async function hasValidAccess(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token || !secret) return false;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload.type === 'access';
  } catch {
    return false;
  }
}

/** Same-origin relative path only (open-redirect guard). */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return HOME_PATH;
  }
  const path = raw.split(/[?#]/)[0] ?? '';
  if (AUTH_PAGES.has(path) || raw.length > 2000) return HOME_PATH;
  return raw;
}

function redirectTo(req: NextRequest, pathname: string, params: Record<string, string>) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = new URLSearchParams(params).toString();
  return NextResponse.redirect(url, 303);
}

const PLATFORM_ONLY =
  /^\/(dashboard|login|signup|auth|settings|vitrine|conditions|confidentialite|boutique|p|adminom)(\/|$)/;

function storefront(req: NextRequest, shop: string): NextResponse {
  const { pathname, search } = req.nextUrl;
  if (PLATFORM_ONLY.test(pathname)) {
    return NextResponse.redirect(`${platformOrigin()}${pathname}${search}`, 308);
  }
  const url = req.nextUrl.clone();
  url.pathname = `/boutique/${shop}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const shop = subdomainFromHost(req.headers.get('host'));
  if (shop) return storefront(req, shop);

  const { pathname, search, searchParams } = req.nextUrl;
  const hasHint = Boolean(req.cookies.get(SESSION_HINT_COOKIE)?.value);

  if (isAuthedPath(pathname)) {
    if (await hasValidAccess(req)) return NextResponse.next();
    const next = pathname + search;
    if (hasHint) return redirectTo(req, '/api/auth/refresh-and-return', { next });
    return redirectTo(req, LOGIN_PATH, { next });
  }

  const isPwaEntry = pathname === '/' && searchParams.get('source') === 'pwa';
  if (AUTH_PAGES.has(pathname) || isPwaEntry) {
    if (searchParams.get('expired') === '1') return NextResponse.next();
    const next = safeNext(searchParams.get('next'));
    if (await hasValidAccess(req)) {
      const url = new URL(next, req.nextUrl.origin);
      return NextResponse.redirect(url, 303);
    }
    if (hasHint) return redirectTo(req, '/api/auth/refresh-and-return', { next });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)'],
};
