import { describe, it, expect } from 'vitest';
import { normalizeSubdomain, subdomainFromHost, subdomainProblem } from './subdomain';

describe('store subdomains', () => {
  it('normalizes shop names into addresses', () => {
    expect(normalizeSubdomain('Boutique Élégance Dakar!')).toBe('boutique-elegance-dakar');
    expect(normalizeSubdomain('  --Awa__Shop--  ')).toBe('awa-shop');
  });

  it('rejects reserved, too short and malformed addresses', () => {
    expect(subdomainProblem('www')).toBe('RESERVED');
    expect(subdomainProblem('admin')).toBe('RESERVED');
    expect(subdomainProblem('ab')).toBe('TOO_SHORT');
    expect(subdomainProblem('awa--shop')).toBe('INVALID');
    expect(subdomainProblem('awa-shop')).toBeNull();
  });

  it('extracts the shop from the request host', () => {
    expect(subdomainFromHost('awa-shop.juula.store')).toBe('awa-shop');
    expect(subdomainFromHost('AWA-SHOP.juula.store.')).toBe('awa-shop');
    expect(subdomainFromHost('www.juula.store')).toBeNull();
    expect(subdomainFromHost('juula.store')).toBeNull();
    expect(subdomainFromHost('a.b.juula.store')).toBeNull();
    expect(subdomainFromHost('juula-store.vercel.app')).toBeNull();
  });
});
