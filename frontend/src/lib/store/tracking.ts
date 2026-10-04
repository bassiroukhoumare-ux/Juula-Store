'use client';

// Meta (Facebook) Pixel + TikTok Pixel for public product pages.
//
// The loaders below are the vendors' official base snippets rewritten as
// functions: each installs a queueing stub synchronously, then appends the
// vendor script. Events tracked before the script finishes loading are
// queued and replayed by the vendor library, so callers can track right
// after `initPixels()` without waiting.
//
// Funnel events sent:
//   PageView          — on page load (both pixels)
//   ViewContent       — product page viewed
//   InitiateCheckout  — customer opened the order form
//   Purchase (Meta) / PlaceAnOrder + CompletePayment (TikTok) — order saved
// Purchase events carry the order reference as event_id, so a future
// server-side Conversions API can deduplicate against them.
import { isValidFacebookPixelId, isValidTiktokPixelId, type StorePixels } from './pixels';

type QueueFn = ((...args: unknown[]) => void) & Record<string, unknown>;

interface TrackingWindow {
  fbq?: QueueFn;
  _fbq?: QueueFn;
  ttq?: unknown[] & Record<string, unknown>;
  TiktokAnalyticsObject?: string;
}

function win(): TrackingWindow {
  return window as unknown as TrackingWindow;
}

function appendScript(src: string): void {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function loadFacebookPixel(pixelId: string): void {
  const w = win();
  if (!w.fbq) {
    const n = function (...args: unknown[]) {
      const callMethod = n.callMethod as ((...a: unknown[]) => void) | undefined;
      if (callMethod) callMethod.apply(n, args);
      else (n.queue as unknown[]).push(args);
    } as QueueFn;
    w.fbq = n;
    if (!w._fbq) w._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    appendScript('https://connect.facebook.net/en_US/fbevents.js');
  }
  w.fbq('init', pixelId);
  w.fbq('track', 'PageView');
}

const TTQ_METHODS = [
  'page',
  'track',
  'identify',
  'instances',
  'debug',
  'on',
  'off',
  'once',
  'ready',
  'alias',
  'group',
  'enableCookie',
  'disableCookie',
  'holdConsent',
  'revokeConsent',
  'grantConsent',
];

function loadTiktokPixel(pixelId: string): void {
  const w = win();
  if (!w.ttq) {
    w.TiktokAnalyticsObject = 'ttq';
    const ttq = [] as unknown as unknown[] & Record<string, unknown>;
    const defer = (target: unknown[] & Record<string, unknown>, method: string) => {
      target[method] = (...args: unknown[]) => {
        target.push([method, ...args]);
      };
    };
    for (const m of TTQ_METHODS) defer(ttq, m);
    ttq.methods = TTQ_METHODS;
    ttq.setAndDefer = defer;
    ttq.instance = (id: string) => {
      const registry = ttq._i as Record<string, unknown[] & Record<string, unknown>>;
      const inst = registry[id] ?? ([] as unknown as unknown[] & Record<string, unknown>);
      for (const m of TTQ_METHODS) defer(inst, m);
      return inst;
    };
    ttq.load = (id: string, opts?: Record<string, unknown>) => {
      const src = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      const registry = ((ttq._i as Record<string, unknown>) ??= {}) as Record<string, unknown>;
      const entry = [] as unknown as unknown[] & Record<string, unknown>;
      entry._u = src;
      registry[id] = entry;
      ((ttq._t as Record<string, number>) ??= {})[id] = Date.now();
      ((ttq._o as Record<string, unknown>) ??= {})[id] = opts ?? {};
      appendScript(`${src}?sdkid=${encodeURIComponent(id)}&lib=ttq`);
    };
    w.ttq = ttq;
  }
  const ttq = w.ttq as Record<string, (...a: unknown[]) => void>;
  ttq.load?.(pixelId);
  ttq.page?.();
}

let activePixels: StorePixels = { facebookPixelId: null, tiktokPixelId: null };
let initialized = false;

/** Load the store's pixels once per page. Invalid IDs are ignored. */
export function initPixels(pixels: StorePixels): void {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;
  activePixels = {
    facebookPixelId: isValidFacebookPixelId(pixels.facebookPixelId) ? pixels.facebookPixelId : null,
    tiktokPixelId: isValidTiktokPixelId(pixels.tiktokPixelId) ? pixels.tiktokPixelId : null,
  };
  if (activePixels.facebookPixelId) loadFacebookPixel(activePixels.facebookPixelId);
  if (activePixels.tiktokPixelId) loadTiktokPixel(activePixels.tiktokPixelId);
}

function fb(event: string, params: Record<string, unknown>, eventId?: string): void {
  if (!activePixels.facebookPixelId) return;
  win().fbq?.('track', event, params, ...(eventId ? [{ eventID: eventId }] : []));
}

function tt(event: string, params: Record<string, unknown>, eventId?: string): void {
  if (!activePixels.tiktokPixelId) return;
  const ttq = win().ttq as Record<string, (...a: unknown[]) => void> | undefined;
  ttq?.track?.(event, params, ...(eventId ? [{ event_id: eventId }] : []));
}

// Pixels expect ISO 4217; the app displays FCFA (= XOF).
function isoCurrency(currency: string | undefined): string {
  if (!currency || currency.toUpperCase() === 'FCFA') return 'XOF';
  return currency.toUpperCase();
}

export interface TrackedProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
}

export function trackViewContent(p: TrackedProduct): void {
  const currency = isoCurrency(p.currency);
  fb('ViewContent', {
    content_ids: [p.id],
    content_name: p.name,
    content_type: 'product',
    value: p.price,
    currency,
  });
  tt('ViewContent', {
    contents: [
      {
        content_id: p.id,
        content_name: p.name,
        content_type: 'product',
        price: p.price,
        quantity: 1,
      },
    ],
    value: p.price,
    currency,
  });
}

export function trackInitiateCheckout(p: TrackedProduct, quantity: number, value: number): void {
  const currency = isoCurrency(p.currency);
  fb('InitiateCheckout', {
    content_ids: [p.id],
    content_type: 'product',
    num_items: quantity,
    value,
    currency,
  });
  tt('InitiateCheckout', {
    contents: [
      { content_id: p.id, content_name: p.name, content_type: 'product', price: p.price, quantity },
    ],
    value,
    currency,
  });
}

export function trackPurchase(
  p: TrackedProduct,
  order: { reference: string; quantity: number; total: number },
): void {
  const currency = isoCurrency(p.currency);
  const contents = [
    {
      content_id: p.id,
      content_name: p.name,
      content_type: 'product',
      price: p.price,
      quantity: order.quantity,
    },
  ];
  fb(
    'Purchase',
    {
      content_ids: [p.id],
      content_name: p.name,
      content_type: 'product',
      num_items: order.quantity,
      value: order.total,
      currency,
    },
    order.reference,
  );
  tt('PlaceAnOrder', { contents, value: order.total, currency }, order.reference);
  tt('CompletePayment', { contents, value: order.total, currency }, `${order.reference}-pay`);
}
