import { describe, it, expect } from 'vitest';
import { isStorePro, JUULA_PLANS, PRO_PLAN_PRICE_FCFA } from '@/lib/store/plans';
import { netAmountFor } from '@/lib/server/store/payments';

describe('Juula Store Pricing & Plan Gating', () => {
  describe('isStorePro helper', () => {
    it('returns false for null or undefined store', () => {
      expect(isStorePro(null)).toBe(false);
      expect(isStorePro(undefined)).toBe(false);
    });

    it('returns false for FREE plan', () => {
      expect(isStorePro({ plan: 'FREE' })).toBe(false);
      expect(isStorePro({ plan: 'FREE', planExpiresAt: new Date(Date.now() + 100000) })).toBe(
        false,
      );
    });

    it('returns true for PRO plan with no expiration date', () => {
      expect(isStorePro({ plan: 'PRO', planExpiresAt: null })).toBe(true);
    });

    it('returns true for PRO plan with future expiration date', () => {
      const future = new Date(Date.now() + 30 * 24 * 3600_000);
      expect(isStorePro({ plan: 'PRO', planExpiresAt: future })).toBe(true);
      expect(isStorePro({ plan: 'PRO', planExpiresAt: future.toISOString() })).toBe(true);
    });

    it('returns false for PRO plan with expired date', () => {
      const past = new Date(Date.now() - 1000);
      expect(isStorePro({ plan: 'PRO', planExpiresAt: past })).toBe(false);
      expect(isStorePro({ plan: 'PRO', planExpiresAt: past.toISOString() })).toBe(false);
    });
  });

  describe('Commission and Net Amount computation', () => {
    it('calculates 7.5% total deduction on Free plan (5% telco + 2.5% Juula)', () => {
      // 10 000 FCFA - 7.5% (750 FCFA) = 9 250 FCFA
      expect(netAmountFor(10000, false)).toBe(9250);
      // 20 000 FCFA - 7.5% (1500 FCFA) = 18 500 FCFA
      expect(netAmountFor(20000, false)).toBe(18500);
    });

    it('calculates 5.0% total deduction on Pro plan (strictly telco gateway fee, 0% Juula fee)', () => {
      // 10 000 FCFA - 5.0% (500 FCFA) = 9 500 FCFA
      expect(netAmountFor(10000, true)).toBe(9500);
      // 20 000 FCFA - 5.0% (1000 FCFA) = 19 000 FCFA
      expect(netAmountFor(20000, true)).toBe(19000);
    });
  });

  describe('Plan configuration specifications', () => {
    it('Free plan allows 1 active product and disables COD and pixels', () => {
      const free = JUULA_PLANS.FREE;
      expect(free.priceMonthly).toBe(0);
      expect(free.maxActiveProducts).toBe(1);
      expect(free.codEnabled).toBe(false);
      expect(free.pixelsAllowed).toBe(false);
      expect(free.totalOnlineFeePercent).toBe(7.5);
    });

    it('Pro plan allows unlimited products, enables COD and pixels for 6 000 FCFA/mo', () => {
      const pro = JUULA_PLANS.PRO;
      expect(pro.priceMonthly).toBe(PRO_PLAN_PRICE_FCFA);
      expect(pro.priceMonthly).toBe(6000);
      expect(pro.maxActiveProducts).toBe(Infinity);
      expect(pro.codEnabled).toBe(true);
      expect(pro.pixelsAllowed).toBe(true);
      expect(pro.juulaCommissionPercent).toBe(0);
      expect(pro.totalOnlineFeePercent).toBe(5.0);
    });
  });
});
