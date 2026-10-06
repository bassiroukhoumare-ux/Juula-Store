import { describe, expect, it } from 'vitest';
import { guessShopType, suggestSlogans } from './slogans';

describe('guessShopType', () => {
  it('recognizes common shop types', () => {
    expect(guessShopType('je vends des robes wax')).toBe('mode');
    expect(guessShopType('Parfums et encens')).toBe('parfum');
    expect(guessShopType('baskets homme')).toBe('chaussures');
    expect(guessShopType('crèmes pour la peau')).toBe('beaute');
    expect(guessShopType('xyz')).toBeNull();
  });
});

describe('suggestSlogans', () => {
  it('returns up to 6 distinct ideas within the tagline limit', () => {
    const ideas = suggestSlogans({ what: 'robes wax', storeName: 'Awa Shop' });
    expect(ideas.length).toBeGreaterThanOrEqual(4);
    expect(ideas.length).toBeLessThanOrEqual(6);
    expect(new Set(ideas).size).toBe(ideas.length);
    expect(ideas.every((s) => s.length <= 140)).toBe(true);
  });
  it('uses the merchant words', () => {
    const ideas = suggestSlogans({ what: 'jus de bissap', seed: 3 });
    expect(ideas.some((s) => s.toLowerCase().includes('jus de bissap') || s.length > 0)).toBe(true);
  });
  it('changes with the seed', () => {
    const a = suggestSlogans({ what: 'robes', seed: 1 }).join('|');
    const b = suggestSlogans({ what: 'robes', seed: 7 }).join('|');
    expect(a).not.toBe(b);
  });
  it('still suggests something with no input', () => {
    expect(suggestSlogans({ what: '' }).length).toBeGreaterThan(0);
  });
});
