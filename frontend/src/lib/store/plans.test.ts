import { describe, expect, it } from 'vitest';
import {
  SUBSCRIPTION_TERMS,
  addMonths,
  displayPrice,
  subscriptionTerm,
  termMonthlyXof,
  termSavingsPercent,
} from './plans';

const term = (m: number) => subscriptionTerm(m)!;

describe('subscription terms', () => {
  it('prices 1 / 3 / 6 / 12 months', () => {
    expect(SUBSCRIPTION_TERMS.map((t) => [t.months, t.priceXof])).toEqual([
      [1, 3900],
      [3, 11000],
      [6, 22000],
      [12, 45000],
    ]);
    expect(subscriptionTerm(2)).toBeNull();
  });

  it('computes the real saving vs monthly payment', () => {
    expect([1, 3, 6, 12].map((m) => termSavingsPercent(term(m)))).toEqual([0, 6, 6, 4]);
  });

  it('computes the monthly equivalent', () => {
    expect([1, 3, 6, 12].map((m) => termMonthlyXof(term(m)))).toEqual([3900, 3667, 3667, 3750]);
  });
});

describe('displayPrice', () => {
  it('keeps FCFA exact', () => expect(displayPrice(11000, 'XOF', 600)).toBe(11000));

  it('converts to euros at the fixed peg, ending in ,99', () => {
    expect([3900, 11000, 22000, 45000].map((x) => displayPrice(x, 'EUR', 0))).toEqual([
      5.99, 16.99, 33.99, 68.99,
    ]);
  });

  it('converts to dollars, up to the next half dollar', () => {
    expect([3900, 11000, 22000, 45000].map((x) => displayPrice(x, 'USD', 600))).toEqual([
      6.5, 18.5, 37, 75,
    ]);
  });
});

describe('addMonths', () => {
  it('adds calendar months without overflowing short months', () => {
    expect(addMonths(new Date('2026-01-31T10:00:00Z'), 1).toISOString()).toBe(
      '2026-02-28T10:00:00.000Z',
    );
    expect(addMonths(new Date('2026-10-08T00:00:00Z'), 12).toISOString()).toBe(
      '2027-10-08T00:00:00.000Z',
    );
  });
});
