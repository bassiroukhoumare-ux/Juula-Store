import { describe, it, expect } from 'vitest';
import {
  isValidFacebookPixelId,
  isValidTiktokPixelId,
  normalizeFacebookPixelId,
  normalizeTiktokPixelId,
} from './pixels';

describe('pixel ID validation', () => {
  it('accepts numeric Meta pixel IDs, spaces stripped', () => {
    expect(isValidFacebookPixelId(normalizeFacebookPixelId(' 1234 5678 9012 3456 '))).toBe(true);
  });

  it('accepts TikTok pixel IDs case-insensitively', () => {
    expect(isValidTiktokPixelId(normalizeTiktokPixelId('c4abcdefgh1234567890'))).toBe(true);
  });

  it.each(["123'); alert(1); //", '12345</script><script>', 'abc123', ''])(
    'rejects injection / malformed Meta ID %j',
    (id) => {
      expect(isValidFacebookPixelId(id)).toBe(false);
    },
  );

  it.each(["C4ABC');x('", 'C4-ABC-123', 'SHORT', null, undefined])(
    'rejects malformed TikTok ID %j',
    (id) => {
      expect(isValidTiktokPixelId(id)).toBe(false);
    },
  );
});
