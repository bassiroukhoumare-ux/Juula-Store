'use client';

import { useEffect } from 'react';
import { initPixels } from '@/lib/store/tracking';
import type { StorePixels } from '@/lib/store/pixels';

/** Loads the store's Meta / TikTok pixels (PageView) on server-rendered pages. */
export function PixelsInit({ pixels }: { pixels: StorePixels }) {
  useEffect(() => {
    initPixels(pixels);
  }, [pixels]);
  return null;
}
