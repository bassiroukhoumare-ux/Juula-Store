import { describe, expect, it } from 'vitest';
import { classifySource, countryLabel, sanitizeSource, sourceLabel } from './traffic-source';

const page = 'https://awa.juula.store/montre';

describe('classifySource', () => {
  it('reads utm_source and ad click ids first', () => {
    expect(classifySource({ pageUrl: `${page}?utm_source=ig`, referrer: '' }).source).toBe(
      'instagram',
    );
    expect(classifySource({ pageUrl: `${page}?fbclid=abc` }).source).toBe('facebook');
    expect(classifySource({ pageUrl: `${page}?ttclid=abc` }).source).toBe('tiktok');
  });
  it('maps known referrers', () => {
    expect(
      classifySource({ pageUrl: page, referrer: 'https://l.facebook.com/l.php?u=x' }).source,
    ).toBe('facebook');
    expect(classifySource({ pageUrl: page, referrer: 'https://www.tiktok.com/' }).source).toBe(
      'tiktok',
    );
    expect(classifySource({ pageUrl: page, referrer: 'https://www.google.sn/' }).source).toBe(
      'google',
    );
  });
  it('treats no referrer and same-site navigation as direct', () => {
    expect(classifySource({ pageUrl: page, referrer: '' }).source).toBe('direct');
    expect(classifySource({ pageUrl: page, referrer: 'https://awa.juula.store/' }).source).toBe(
      'direct',
    );
  });
  it('keeps unknown websites as their host', () => {
    const r = classifySource({ pageUrl: page, referrer: 'https://www.monblog.sn/article' });
    expect(r).toEqual({ source: 'monblog.sn', referrerHost: 'monblog.sn' });
  });
});

describe('sanitizeSource', () => {
  it('accepts known sources and plausible hosts only', () => {
    expect(sanitizeSource('TikTok')).toBe('tiktok');
    expect(sanitizeSource('monblog.sn')).toBe('monblog.sn');
    expect(sanitizeSource('<script>')).toBe('direct');
  });
});

describe('labels', () => {
  it('names sources and countries in French', () => {
    expect(sourceLabel('direct')).toBe('Accès direct');
    expect(sourceLabel('monblog.sn')).toBe('monblog.sn');
    expect(countryLabel('SN')).toBe('Sénégal');
    expect(countryLabel(null)).toBe('Inconnu');
  });
});
