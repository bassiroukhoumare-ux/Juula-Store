import { describe, it, expect } from 'vitest';
import { deliveryUrl } from './upload';

const base = 'https://res.cloudinary.com/pchjjyws';

describe('deliveryUrl', () => {
  it('serves photos (incl. iPhone HEIC) in an optimised web format', () => {
    expect(deliveryUrl(`${base}/image/upload/v1/juula/u/image/a.heic`, 'image')).toBe(
      `${base}/image/upload/f_auto,q_auto/v1/juula/u/image/a.heic`,
    );
  });
  it('serves videos as MP4 and voice notes as MP3', () => {
    expect(deliveryUrl(`${base}/video/upload/v1/juula/u/video/b.mov`, 'video')).toBe(
      `${base}/video/upload/q_auto/v1/juula/u/video/b.mp4`,
    );
    expect(deliveryUrl(`${base}/video/upload/v1/juula/u/audio/c.ogg`, 'audio')).toBe(
      `${base}/video/upload/v1/juula/u/audio/c.mp3`,
    );
  });
});
