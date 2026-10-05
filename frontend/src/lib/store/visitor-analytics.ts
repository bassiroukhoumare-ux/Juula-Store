'use client';
// Browser side of the first-party product-page analytics: an anonymous
// visitor id (localStorage, no cookie), the visit's traffic source (computed
// once per browsing session) and fire-and-forget event calls.
import { classifySource } from './traffic-source';

const VISITOR_KEY = 'juula-visitor-id';
const SOURCE_KEY = 'juula-visit-source';

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
    const id = randomId();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}

/** First-touch source of this browsing session (survives in-site navigation). */
export function getVisitSource(): { source: string; referrer: string | null } {
  try {
    const saved = sessionStorage.getItem(SOURCE_KEY);
    if (saved) return JSON.parse(saved) as { source: string; referrer: string | null };
  } catch {
    // ignore
  }
  const { source, referrerHost } = classifySource({
    referrer: document.referrer,
    pageUrl: window.location.href,
  });
  const value = { source, referrer: referrerHost };
  try {
    sessionStorage.setItem(SOURCE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
  return value;
}

function post(slug: string, body: Record<string, unknown>): void {
  void fetch(`/api/public/products/${encodeURIComponent(slug)}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

export function trackProductEvent(slug: string, type: 'view' | 'checkout_open'): void {
  const { source, referrer } = getVisitSource();
  post(slug, { type, visitorId: getVisitorId(), source, referrer });
}

export interface CheckoutDraftFields {
  customerName: string;
  phone: string;
  address: string;
  quantity: number;
}

export function saveCheckoutDraft(slug: string, fields: CheckoutDraftFields): void {
  post(slug, {
    type: 'draft',
    visitorId: getVisitorId(),
    customerName: fields.customerName.trim().slice(0, 120),
    phone: fields.phone.trim().slice(0, 30),
    address: fields.address.trim().slice(0, 300),
    quantity: fields.quantity,
  });
}
