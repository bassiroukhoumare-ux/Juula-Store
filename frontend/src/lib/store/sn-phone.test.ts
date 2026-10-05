import { describe, expect, it } from 'vitest';
import { formatSenegalPhone, toSenegalE164 } from './sn-phone';

describe('toSenegalE164', () => {
  it('normalizes local and international forms', () => {
    expect(toSenegalE164('77 123 45 67')).toBe('+221771234567');
    expect(toSenegalE164('+221 76-123-45-67')).toBe('+221761234567');
    expect(toSenegalE164('221781234567')).toBe('+221781234567');
  });
  it('rejects non-mobile or malformed numbers', () => {
    expect(toSenegalE164('33 123 45 67')).toBeNull();
    expect(toSenegalE164('77 123')).toBeNull();
    expect(toSenegalE164('')).toBeNull();
  });
});

describe('formatSenegalPhone', () => {
  it('formats for display', () => {
    expect(formatSenegalPhone('+221771234567')).toBe('77 123 45 67');
    expect(formatSenegalPhone(null)).toBe('');
  });
});
