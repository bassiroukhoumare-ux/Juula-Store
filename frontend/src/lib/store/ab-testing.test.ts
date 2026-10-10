import { describe, it, expect } from 'vitest';
import {
  createDefaultPriceAbTest,
  computeAbNetProfit,
  decideAbVariant,
  applyAbVariantToConfig,
} from './ab-testing';
import { defaultFunnelConfig } from '@/data/mockData';

describe('ab-testing (A/B Testing Ultra-Simplifié)', () => {
  it('creates the default 1-click test with Version A (15 000 payant) and Version B (17 500 offert)', () => {
    const test = createDefaultPriceAbTest(15_000, 2_500);

    expect(test.enabled).toBe(true);
    expect(test.status).toBe('running');
    expect(test.targetVisits).toBe(100);

    // Version A : 15 000 FCFA + livraison payante 2 500 FCFA
    expect(test.variantA.price).toBe(15_000);
    expect(test.variantA.deliveryFee).toBe(2_500);
    expect(test.variantA.deliveryFree).toBe(false);

    // Version B : 17 500 FCFA + livraison offerte (0 FCFA)
    expect(test.variantB.price).toBe(17_500);
    expect(test.variantB.deliveryFee).toBe(0);
    expect(test.variantB.deliveryFree).toBe(true);
  });

  it('calculates net profit accurately for both variants and declares the winner after 100 visits', () => {
    const test = createDefaultPriceAbTest(15_000, 2_000);
    test.productCost = 6_000; // Coût unitaire d'achat
    test.estimatedShippingCost = 2_000; // Coût réel transporteur

    // Simulation de 100 visites (50 visites chacune)
    test.stats = {
      visitsA: 50,
      visitsB: 50,
      ordersA: 3, // 3 commandes à 15 000 F -> 6% conversion
      ordersB: 6, // 6 commandes à 17 000 F -> 12% conversion
      revenueA: 51_000,
      revenueB: 102_000,
    };

    const res = computeAbNetProfit(test);
    expect(res.totalVisits).toBe(100);
    expect(res.isThresholdReached).toBe(true);
    expect(res.visitsRemaining).toBe(0);
    expect(res.progressPercent).toBe(100);

    // Marge unitaire A : 15 000 - 6 000 + (2 000 - 2 000) = 9 000 F
    // Bénéfice net A (3 commandes) : 27 000 F
    expect(res.netProfitA).toBe(27_000);

    // Marge unitaire B : 17 000 - 6 000 - 2 000 = 9 000 F
    // Bénéfice net B (6 commandes) : 54 000 F
    expect(res.netProfitB).toBe(54_000);

    // Version B génère 2x plus de bénéfice net !
    expect(res.winner).toBe('B');
    expect(res.profitDifference).toBe(27_000);
    expect(res.summaryMessage).toContain('La Version B');
  });

  it('distributes traffic 50/50 deterministically based on visitor id', () => {
    const test = createDefaultPriceAbTest(15_000, 2_000);

    const v1 = decideAbVariant(test, 'visitor-123');
    const v2 = decideAbVariant(test, 'visitor-123');
    expect(v1).toBe(v2); // Même visiteur revoit la même offre

    const v3 = decideAbVariant(test, 'visitor-456');
    // Entre v1 et v3, les hashes alternent
    expect(['A', 'B']).toContain(v3);
  });

  it('applies variant settings to product config at render time', () => {
    const test = createDefaultPriceAbTest(15_000, 2_000);
    const configWithTest = { ...defaultFunnelConfig, abTest: test };

    const configB = applyAbVariantToConfig(configWithTest, 'B');
    expect(configB.price).toBe(17_000);
    expect(configB.deliveryFree).toBe(true);
    expect(configB.abVariant).toBe('B');

    const configA = applyAbVariantToConfig(configWithTest, 'A');
    expect(configA.price).toBe(15_000);
    expect(configA.deliveryFree).toBe(false);
    expect(configA.abVariant).toBe('A');
  });
});
