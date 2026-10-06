import { describe, expect, it } from 'vitest';
import {
  bundleDiscountFor,
  bundlePrice,
  computePromoDiscount,
  countdownEnd,
  isAnnouncementVisible,
  normalizePromoCode,
  parseAnnouncement,
  parseCrossSell,
  promoStatus,
} from './marketing';

const base = {
  code: 'WELCOME10',
  type: 'percent' as const,
  value: 10,
  minAmount: null,
  maxUses: null,
  usedCount: 0,
  expiresAt: null,
  active: true,
};
const now = new Date('2026-10-06T12:00:00Z');

describe('normalizePromoCode', () => {
  it('uppercases and strips spaces and symbols', () => {
    expect(normalizePromoCode(' welcome 10! ')).toBe('WELCOME10');
    expect(normalizePromoCode('soldes-2026')).toBe('SOLDES-2026');
  });
});

describe('computePromoDiscount', () => {
  it('percent, fixed and free shipping', () => {
    expect(computePromoDiscount(base, 20000, 1000, now)).toMatchObject({
      ok: true,
      discount: 2000,
    });
    expect(
      computePromoDiscount({ ...base, type: 'fixed', value: 2000 }, 20000, 1000, now),
    ).toMatchObject({ ok: true, discount: 2000 });
    expect(
      computePromoDiscount({ ...base, type: 'free_shipping', value: 0 }, 20000, 1500, now),
    ).toMatchObject({ ok: true, discount: 1500 });
  });

  it('never takes more than the order', () => {
    expect(
      computePromoDiscount({ ...base, type: 'fixed', value: 50000 }, 3000, 500, now),
    ).toMatchObject({ ok: true, discount: 3500 });
  });

  it('explicit errors', () => {
    expect(computePromoDiscount({ ...base, minAmount: 15000 }, 10000, 0, now)).toMatchObject({
      ok: false,
      error: 'PROMO_MIN_AMOUNT',
    });
    expect(
      computePromoDiscount({ ...base, expiresAt: '2026-10-01T00:00:00Z' }, 20000, 0, now),
    ).toMatchObject({ ok: false, error: 'PROMO_EXPIRED' });
    expect(
      computePromoDiscount({ ...base, maxUses: 5, usedCount: 5 }, 20000, 0, now),
    ).toMatchObject({ ok: false, error: 'PROMO_EXHAUSTED' });
    expect(computePromoDiscount({ ...base, active: false }, 20000, 0, now)).toMatchObject({
      ok: false,
      error: 'PROMO_INVALID',
    });
    expect(
      computePromoDiscount({ ...base, type: 'free_shipping', value: 0 }, 20000, 0, now),
    ).toMatchObject({ ok: false, error: 'PROMO_NOT_APPLICABLE' });
  });

  it('status', () => {
    expect(promoStatus(base, now)).toBe('active');
    expect(promoStatus({ ...base, active: false }, now)).toBe('disabled');
  });
});

describe('announcement bar', () => {
  it('parses safely and hides finished countdowns', () => {
    expect(parseAnnouncement(null).enabled).toBe(false);
    const bar = parseAnnouncement({
      enabled: true,
      text: 'Vente flash',
      style: 'nope',
      countdown: { enabled: true, endsAt: '2026-10-06T10:00:00Z', daily: false },
    });
    expect(bar.style).toBe('dark');
    expect(isAnnouncementVisible(bar, now)).toBe(false);
    expect(
      isAnnouncementVisible(
        { ...bar, countdown: { ...bar.countdown, endsAt: '2026-10-07T10:00:00Z' } },
        now,
      ),
    ).toBe(true);
  });

  it('daily countdown ends at the next midnight', () => {
    const bar = parseAnnouncement({
      enabled: true,
      text: 'x',
      countdown: { enabled: true, daily: true },
    });
    expect(countdownEnd(bar, now)?.toISOString()).toBe('2026-10-07T00:00:00.000Z');
  });
});

describe('cross-sell', () => {
  it('caps suggestions and discount', () => {
    expect(parseCrossSell({ slugs: ['a', 'b', 'b', 'c', 'd'], discountPercent: 150 })).toEqual({
      slugs: ['a', 'b', 'c'],
      discountPercent: 90,
    });
  });

  it('bundle price applies only with the main product in the cart', () => {
    const cs = (slug: string) =>
      slug === 'montre'
        ? { slugs: ['bracelet'], discountPercent: 20 }
        : { slugs: [], discountPercent: 0 };
    expect(bundleDiscountFor('bracelet', ['montre', 'bracelet'], cs)).toBe(20);
    expect(bundleDiscountFor('bracelet', ['bracelet'], cs)).toBe(0);
    expect(bundlePrice(5000, 20)).toBe(4000);
  });
});
