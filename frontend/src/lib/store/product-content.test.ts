import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COMPARISON_TITLE,
  cleanComparison,
  cleanDescription,
  cleanFaq,
  countWords,
  hasComparison,
  truncateWords,
} from './product-content';

describe('countWords', () => {
  it('counts words, ignoring markup and list markers', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('**Coton** bio, très doux.\n\n- Lavable\n- 2 tailles')).toBe(7);
    expect(countWords("L'été   arrive — vite !")).toBe(3);
  });
});

describe('truncateWords', () => {
  it('keeps the first N words and the original line breaks', () => {
    expect(truncateWords('un deux\ntrois quatre', 3)).toBe('un deux\ntrois');
    expect(truncateWords('court', 10)).toBe('court');
  });

  it('caps a description at 2 000 words', () => {
    const long = Array.from({ length: 2100 }, (_, i) => `mot${i}`).join(' ');
    expect(countWords(cleanDescription(long))).toBe(2000);
  });
});

describe('cleanFaq', () => {
  it('drops incomplete entries and survives garbage', () => {
    expect(cleanFaq(undefined)).toEqual([]);
    expect(cleanFaq('nope')).toEqual([]);
    expect(
      cleanFaq([
        { id: 'a', question: ' Délais ? ', answer: ' 24 h ' },
        { id: 'b', question: 'Sans réponse', answer: '' },
        { id: 'c', question: '', answer: 'Sans question' },
        null,
      ]),
    ).toEqual([{ id: 'a', question: 'Délais ?', answer: '24 h' }]);
  });
});

describe('cleanComparison', () => {
  it('defaults, drops empty rows and hides when disabled or empty', () => {
    const empty = cleanComparison(undefined);
    expect(empty.enabled).toBe(false);
    expect(hasComparison(empty)).toBe(false);

    const c = cleanComparison({
      enabled: true,
      title: '  ',
      rows: [
        { id: 'r1', criterion: 'Garantie', ours: { kind: 'yes' }, others: { kind: 'no' } },
        { id: 'r2', criterion: '', ours: { kind: 'yes' }, others: { kind: 'no' } },
        {
          id: 'r3',
          criterion: 'Vide',
          ours: { kind: 'text', text: ' ' },
          others: { kind: 'text', text: '' },
        },
        {
          id: 'r4',
          criterion: 'Livraison',
          ours: { kind: 'text', text: '24 h' },
          others: { kind: 'bogus' },
        },
      ],
    });
    expect(c.title).toBe(DEFAULT_COMPARISON_TITLE);
    expect(c.rows.map((r) => r.id)).toEqual(['r1', 'r4']);
    expect(c.rows[1]?.others).toEqual({ kind: 'yes' });
    expect(hasComparison(c)).toBe(true);
    expect(hasComparison({ ...c, enabled: false })).toBe(false);
  });
});
