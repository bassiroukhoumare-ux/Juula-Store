import { describe, it, expect } from 'vitest';
import { MAX_CONFIG_BYTES, parseConfig } from './products';
import { defaultFunnelConfig } from '@/data/mockData';

describe('parseConfig', () => {
  it('keeps hosted media and drops browser-local URLs', () => {
    const result = parseConfig({
      ...defaultFunnelConfig,
      mediaItems: [
        { id: 'a', type: 'image', url: 'https://res.cloudinary.com/demo/image/upload/a.jpg' },
        { id: 'b', type: 'image', url: 'data:image/png;base64,AAAA' },
        { id: 'c', type: 'image', url: 'blob:http://localhost:3000/123' },
        { id: 'd', type: 'image', url: 'javascript:alert(1)' },
      ],
      videoUrl: 'blob:http://localhost:3000/vid',
      hasVideo: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.mediaItems.map((m) => m.id)).toEqual(['a']);
    expect(result.config.videoUrl).toBe('');
    expect(result.config.hasVideo).toBe(false);
  });

  it('rejects negative or fractional prices', () => {
    expect(parseConfig({ ...defaultFunnelConfig, price: -5 }).ok).toBe(false);
    expect(parseConfig({ ...defaultFunnelConfig, price: 99.5 }).ok).toBe(false);
  });

  it('rejects oversized configs', () => {
    const result = parseConfig({
      ...defaultFunnelConfig,
      benefits: ['x'.repeat(MAX_CONFIG_BYTES + 1)],
    });
    expect(result).toEqual({ ok: false, error: 'CONFIG_TOO_LARGE' });
  });
});
