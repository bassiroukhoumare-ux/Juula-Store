// @vitest-environment node
// Session routing (proxy.ts): installed-app auto-login, protected
// pages, silent refresh bounce and loop guards.
import { SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const SECRET = 'x'.repeat(48);
let middleware: typeof import('../../../proxy').proxy;

beforeAll(async () => {
  vi.stubEnv('JWT_SECRET', SECRET);
  vi.stubEnv('AUTH_PROTECTED_PREFIXES', '');
  ({ proxy: middleware } = await import('../../../proxy'));
});

const access = (type = 'access', exp = '15m', secret = SECRET) =>
  new SignJWT({ sub: 'u1', type })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode(secret));

function req(path: string, cookies: Record<string, string> = {}) {
  const r = new NextRequest(`http://localhost:3000${path}`, {
    headers: { host: 'localhost:3000' },
  });
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v);
  return r;
}

const location = (res: Response) => {
  const l = res.headers.get('location');
  if (!l) return null;
  const u = new URL(l);
  return u.pathname + u.search;
};

describe('protected pages', () => {
  it('renders the dashboard with a valid access cookie', async () => {
    const res = await middleware(req('/dashboard', { 'app-token': await access() }));
    expect(location(res)).toBeNull();
  });

  it('silently refreshes (query string kept) when only the session hint is left', async () => {
    const res = await middleware(req('/dashboard?commande=CMD-1', { 'app-csrf': 'c' }));
    expect(location(res)).toBe(
      `/api/auth/refresh-and-return?next=${encodeURIComponent('/dashboard?commande=CMD-1')}`,
    );
  });

  it.each([
    ['forged', () => access('access', '15m', 'y'.repeat(48))],
    ['refresh-typed', () => access('refresh')],
  ])('treats a %s token as no access', async (_, make) => {
    const res = await middleware(req('/settings', { 'app-token': await make() }));
    expect(location(res)).toBe(`/login?next=${encodeURIComponent('/settings')}`);
  });

  it('sends a visitor without session to /login', async () => {
    const res = await middleware(req('/dashboard'));
    expect(location(res)).toBe(`/login?next=${encodeURIComponent('/dashboard')}`);
  });
});

describe('auth pages and PWA entry', () => {
  it('opens the installed app straight on the dashboard', async () => {
    const res = await middleware(req('/?source=pwa', { 'app-token': await access() }));
    expect(location(res)).toBe('/dashboard');
  });

  it('sends a signed-in user from /login to `next`', async () => {
    const next = encodeURIComponent('/dashboard?tab=wallet');
    const res = await middleware(req(`/login?next=${next}`, { 'app-token': await access() }));
    expect(location(res)).toBe('/dashboard?tab=wallet');
  });

  it('refuses external or self-referencing `next` targets', async () => {
    const tok = await access();
    for (const next of ['//evil.example', '/login', '/signup?x=1']) {
      const res = await middleware(
        req(`/login?next=${encodeURIComponent(next)}`, { 'app-token': tok }),
      );
      expect(location(res)).toBe('/dashboard');
    }
  });

  it('refreshes from /signup when only the session hint is left', async () => {
    const res = await middleware(req('/signup', { 'app-csrf': 'c' }));
    expect(location(res)).toBe(
      `/api/auth/refresh-and-return?next=${encodeURIComponent('/dashboard')}`,
    );
  });

  it('stays on /login?expired=1 (no redirect loop)', async () => {
    const res = await middleware(
      req('/login?expired=1', { 'app-token': await access(), 'app-csrf': 'c' }),
    );
    expect(location(res)).toBeNull();
  });

  it('leaves the public landing page alone', async () => {
    const res = await middleware(req('/', { 'app-token': await access() }));
    expect(location(res)).toBeNull();
  });
});
