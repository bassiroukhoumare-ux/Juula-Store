'use client';

// Affiliate links on the public pages: ?ref=<slug> is checked by the server
// (active campaign only), then remembered 7 days for this shop and sent
// with the order so the partner earns the commission.
import { useEffect } from 'react';
import { getVisitorId } from './visitor-analytics';

interface StoredRef {
  ref: string;
  until: number;
}

const key = (shop: string) => `juula-ref:${shop}`;

/** The shop of the current page: <shop>.juula.store or /boutique/<shop>/… */
export function currentShop(): string | null {
  if (typeof window === 'undefined') return null;
  const path = /^\/boutique\/([^/]+)/.exec(window.location.pathname);
  if (path?.[1]) return decodeURIComponent(path[1]).toLowerCase();
  const host = window.location.hostname.toLowerCase();
  const m = /^([a-z0-9-]+)\.(juula\.store|localhost)$/.exec(host);
  return m?.[1] && m[1] !== 'www' ? m[1] : null;
}

export function storedReferral(shop: string | null = currentShop()): string | undefined {
  if (!shop) return undefined;
  try {
    const raw = localStorage.getItem(key(shop));
    if (!raw) return undefined;
    const v = JSON.parse(raw) as StoredRef;
    if (v.until > Date.now() && typeof v.ref === 'string') return v.ref;
    localStorage.removeItem(key(shop));
  } catch {
    // private mode / corrupted value
  }
  return undefined;
}

/** Reads ?ref= once per page load and records it when the campaign is active. */
export function useReferralCapture(): void {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    const shop = currentShop();
    if (!ref || !shop) return;
    fetch('/api/public/partners/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop, ref, visitorId: getVisitorId() }),
    })
      .then((r) => r.json())
      .then((body: { ok?: boolean; ref?: string; days?: number }) => {
        if (body.ok && body.ref) {
          const value: StoredRef = {
            ref: body.ref,
            until: Date.now() + (body.days ?? 7) * 86_400_000,
          };
          localStorage.setItem(key(shop), JSON.stringify(value));
        }
      })
      .catch(() => undefined);
  }, []);
}

/** Drop-in component for server pages. */
export function ReferralCapture(): null {
  useReferralCapture();
  return null;
}
