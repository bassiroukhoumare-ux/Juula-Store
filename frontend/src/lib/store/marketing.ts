// Marketing rules shared by the server (pricing) and the screens: promo
// codes, the shop announcement bar and cross-sell (« souvent acheté avec »).

// ─────────────────────────────────────────────────────────────────────────
// Promo codes
// ─────────────────────────────────────────────────────────────────────────
export const PROMO_TYPES = ['percent', 'fixed', 'free_shipping'] as const;
export type PromoType = (typeof PROMO_TYPES)[number];

export interface PromoCodeDTO {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  minAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export type PromoStatus = 'active' | 'expired' | 'exhausted' | 'disabled';

/** Codes are case-insensitive: stored and compared uppercase, A-Z 0-9 _ -. */
export function normalizePromoCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 30);
}

export function promoStatus(
  p: Pick<PromoCodeDTO, 'active' | 'expiresAt' | 'maxUses' | 'usedCount'>,
  now: Date = new Date(),
): PromoStatus {
  if (!p.active) return 'disabled';
  if (p.expiresAt && new Date(p.expiresAt).getTime() <= now.getTime()) return 'expired';
  if (p.maxUses !== null && p.usedCount >= p.maxUses) return 'exhausted';
  return 'active';
}

export function promoLabel(p: Pick<PromoCodeDTO, 'type' | 'value'>): string {
  if (p.type === 'percent') return `-${p.value} %`;
  if (p.type === 'fixed') return `-${p.value.toLocaleString('fr-FR')} FCFA`;
  return 'Livraison offerte';
}

export type PromoResult =
  | { ok: true; discount: number; code: string; label: string }
  | { ok: false; error: string; message: string };

/**
 * What a valid code takes off an order. `subtotal` is the price of the items
 * (after quantity / bundle discounts), `deliveryFee` the shipping charged.
 */
export function computePromoDiscount(
  promo: Pick<
    PromoCodeDTO,
    'code' | 'type' | 'value' | 'minAmount' | 'maxUses' | 'usedCount' | 'expiresAt' | 'active'
  >,
  subtotal: number,
  deliveryFee: number,
  now: Date = new Date(),
): PromoResult {
  const status = promoStatus(promo, now);
  if (status === 'disabled') {
    return { ok: false, error: 'PROMO_INVALID', message: 'Ce code promo n’est pas valide.' };
  }
  if (status === 'expired') {
    return { ok: false, error: 'PROMO_EXPIRED', message: 'Ce code promo a expiré.' };
  }
  if (status === 'exhausted') {
    return {
      ok: false,
      error: 'PROMO_EXHAUSTED',
      message: 'Ce code promo a déjà été utilisé le nombre de fois prévu.',
    };
  }
  if (promo.minAmount && subtotal < promo.minAmount) {
    return {
      ok: false,
      error: 'PROMO_MIN_AMOUNT',
      message: `Montant minimum non atteint : ce code est valable dès ${promo.minAmount.toLocaleString('fr-FR')} FCFA d’achat.`,
    };
  }
  let discount = 0;
  if (promo.type === 'percent') discount = Math.round((subtotal * promo.value) / 100);
  else if (promo.type === 'fixed') discount = promo.value;
  else discount = deliveryFee;
  if (promo.type === 'free_shipping' && deliveryFee === 0) {
    return {
      ok: false,
      error: 'PROMO_NOT_APPLICABLE',
      message: 'La livraison est déjà offerte pour cette commande.',
    };
  }
  discount = Math.max(0, Math.min(discount, subtotal + deliveryFee));
  return { ok: true, discount, code: promo.code, label: promoLabel(promo) };
}

// ─────────────────────────────────────────────────────────────────────────
// Announcement bar (top of the shop)
// ─────────────────────────────────────────────────────────────────────────
export const ANNOUNCEMENT_STYLES = ['dark', 'accent', 'red'] as const;
export type AnnouncementStyle = (typeof ANNOUNCEMENT_STYLES)[number];

export interface AnnouncementBar {
  enabled: boolean;
  text: string;
  /** Optional link: a category name (« cat:Mode ») or a product slug (« product:slug »). */
  link: string;
  style: AnnouncementStyle;
  countdown: {
    enabled: boolean;
    /** ISO end date (fixed mode). */
    endsAt: string | null;
    /** Daily mode: restarts every day and ends at midnight (Dakar time). */
    daily: boolean;
  };
}

export const DEFAULT_ANNOUNCEMENT: AnnouncementBar = {
  enabled: false,
  text: '',
  link: '',
  style: 'dark',
  countdown: { enabled: false, endsAt: null, daily: false },
};

export function parseAnnouncement(raw: unknown): AnnouncementBar {
  if (!raw || typeof raw !== 'object') return DEFAULT_ANNOUNCEMENT;
  const a = raw as Partial<AnnouncementBar>;
  const c = (a.countdown ?? {}) as Partial<AnnouncementBar['countdown']>;
  const endsAt =
    typeof c.endsAt === 'string' && !Number.isNaN(Date.parse(c.endsAt)) ? c.endsAt : null;
  return {
    enabled: a.enabled === true,
    text: typeof a.text === 'string' ? a.text.slice(0, 160) : '',
    link: typeof a.link === 'string' ? a.link.slice(0, 160) : '',
    style: ANNOUNCEMENT_STYLES.includes(a.style as AnnouncementStyle)
      ? (a.style as AnnouncementStyle)
      : 'dark',
    countdown: { enabled: c.enabled === true, endsAt, daily: c.daily === true },
  };
}

/** Countdown target, or null when there is nothing (left) to count. */
export function countdownEnd(bar: AnnouncementBar, now: Date = new Date()): Date | null {
  if (!bar.countdown.enabled) return null;
  if (bar.countdown.daily) {
    // Dakar is UTC+0: the next UTC midnight.
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  }
  if (!bar.countdown.endsAt) return null;
  const end = new Date(bar.countdown.endsAt);
  return end.getTime() > now.getTime() ? end : null;
}

/** The bar is shown when on, with a text, and (fixed countdown) not finished. */
export function isAnnouncementVisible(bar: AnnouncementBar, now: Date = new Date()): boolean {
  if (!bar.enabled || !bar.text.trim()) return false;
  if (bar.countdown.enabled && !bar.countdown.daily && !countdownEnd(bar, now)) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
// Cross-sell (stored in each product's config)
// ─────────────────────────────────────────────────────────────────────────
export const CROSS_SELL_MAX = 3;

export interface CrossSell {
  /** 1 to 3 suggested products (slugs of the same merchant). */
  slugs: string[];
  /** Discount on a suggested product when bought with this one (0-90 %). */
  discountPercent: number;
}

export function parseCrossSell(raw: unknown): CrossSell {
  if (!raw || typeof raw !== 'object') return { slugs: [], discountPercent: 0 };
  const c = raw as Partial<CrossSell>;
  const slugs = Array.isArray(c.slugs)
    ? [...new Set(c.slugs.filter((s): s is string => typeof s === 'string' && s.length <= 120))]
    : [];
  const pct = Number(c.discountPercent);
  return {
    slugs: slugs.slice(0, CROSS_SELL_MAX),
    discountPercent: Number.isFinite(pct) ? Math.max(0, Math.min(90, Math.round(pct))) : 0,
  };
}

/** Price of a suggested product bought together with its main product. */
export function bundlePrice(price: number, discountPercent: number): number {
  return Math.max(0, Math.round(price * (1 - discountPercent / 100)));
}

/**
 * In a cart: the best « acheté ensemble » discount a line gets, i.e. the
 * highest discount among the other cart products that suggest it.
 */
export function bundleDiscountFor(
  slug: string,
  cartSlugs: string[],
  crossSellOf: (slug: string) => CrossSell,
): number {
  let best = 0;
  for (const other of cartSlugs) {
    if (other === slug) continue;
    const cs = crossSellOf(other);
    if (cs.slugs.includes(slug)) best = Math.max(best, cs.discountPercent);
  }
  return best;
}
