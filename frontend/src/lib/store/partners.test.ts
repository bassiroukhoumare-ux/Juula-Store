import { describe, expect, it } from 'vitest';
import {
  commissionLabel,
  commissionState,
  computeCommission,
  daysLeft,
  normalizePartnerSlug,
  partnerStatus,
} from './partners';

const now = new Date('2026-10-06T12:00:00Z');
const items = [
  { slug: 'montre', quantity: 2, lineTotal: 20000 },
  { slug: 'bracelet', quantity: 1, lineTotal: 5000 },
];

describe('partners', () => {
  it('slug: lowercase, no accents, URL-safe', () => {
    expect(normalizePartnerSlug('Fatou Diop!')).toBe('fatou-diop');
    expect(normalizePartnerSlug('Amadou_Lifestyle')).toBe('amadou_lifestyle');
    expect(normalizePartnerSlug('Éléonore')).toBe('eleonore');
  });

  it('status follows the dates and the suspension', () => {
    const base = { startsAt: null, expiresAt: '2026-10-10T00:00:00Z', suspended: false };
    expect(partnerStatus(base, now)).toBe('active');
    expect(partnerStatus({ ...base, expiresAt: '2026-10-01T00:00:00Z' }, now)).toBe('expired');
    expect(partnerStatus({ ...base, startsAt: '2026-10-08T00:00:00Z' }, now)).toBe('scheduled');
    expect(partnerStatus({ ...base, suspended: true }, now)).toBe('suspended');
    expect(daysLeft(base.expiresAt, now)).toBe(4);
  });

  it('commission on products only, eligible product only', () => {
    expect(
      computeCommission(items, {
        commissionType: 'percent',
        commissionValue: 10,
        productSlug: null,
      }),
    ).toBe(2500);
    expect(
      computeCommission(items, {
        commissionType: 'percent',
        commissionValue: 10,
        productSlug: 'montre',
      }),
    ).toBe(2000);
    expect(
      computeCommission(items, {
        commissionType: 'fixed',
        commissionValue: 1500,
        productSlug: 'montre',
      }),
    ).toBe(3000);
    expect(
      computeCommission(items, {
        commissionType: 'fixed',
        commissionValue: 1500,
        productSlug: 'autre',
      }),
    ).toBe(0);
  });

  it('commission state follows the delivery', () => {
    expect(commissionState('delivered')).toBe('validated');
    expect(commissionState('cancelled')).toBe('cancelled');
    expect(commissionState('new')).toBe('pending');
    expect(commissionState('confirmed')).toBe('pending');
  });

  it('label', () => {
    expect(commissionLabel({ commissionType: 'percent', commissionValue: 10 }, null)).toBe(
      '10 % sur toutes les ventes',
    );
    expect(
      commissionLabel({ commissionType: 'fixed', commissionValue: 1500 }, 'Montre Polycarbon'),
    ).toContain('par article vendu sur « Montre Polycarbon »');
  });
});
