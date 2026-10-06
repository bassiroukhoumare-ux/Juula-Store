// Affiliate links (Marketing → Liens & partenaires): rules shared by the
// server (attribution, commissions) and the screens (merchant + influencer).

export const COMMISSION_TYPES = ['percent', 'fixed'] as const;
export type CommissionType = (typeof COMMISSION_TYPES)[number];

/** A visitor stays attributed to the partner for 7 days after the click. */
export const ATTRIBUTION_DAYS = 7;

export type PartnerStatus = 'active' | 'scheduled' | 'expired' | 'suspended';

export interface PartnerRules {
  startsAt: string | null;
  expiresAt: string;
  suspended: boolean;
  commissionType: CommissionType;
  commissionValue: number;
  /** null = every product. */
  productSlug: string | null;
}

/** ?ref= value: lowercase letters, digits, - and _. */
export function normalizePartnerSlug(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40);
}

export function partnerStatus(
  p: Pick<PartnerRules, 'startsAt' | 'expiresAt' | 'suspended'>,
  now: Date = new Date(),
): PartnerStatus {
  if (p.suspended) return 'suspended';
  if (new Date(p.expiresAt).getTime() < now.getTime()) return 'expired';
  if (p.startsAt && new Date(p.startsAt).getTime() > now.getTime()) return 'scheduled';
  return 'active';
}

export function daysLeft(expiresAt: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000));
}

/**
 * Commission of one order: products only (never the delivery fee), and only
 * the eligible product when the partnership covers a single product.
 */
export function computeCommission(
  items: { slug: string; quantity: number; lineTotal: number }[],
  rules: { commissionType: string; commissionValue: number; productSlug: string | null },
): number {
  const eligible = rules.productSlug ? items.filter((i) => i.slug === rules.productSlug) : items;
  if (rules.commissionType === 'percent') {
    const base = eligible.reduce((s, i) => s + i.lineTotal, 0);
    return Math.max(0, Math.round((base * rules.commissionValue) / 100));
  }
  return Math.max(0, eligible.reduce((s, i) => s + i.quantity, 0) * rules.commissionValue);
}

/** Commission state follows the delivery: confirmed when delivered, void when cancelled. */
export type CommissionState = 'validated' | 'pending' | 'cancelled';

export function commissionState(orderStatus: string): CommissionState {
  if (orderStatus === 'delivered') return 'validated';
  if (orderStatus === 'cancelled') return 'cancelled';
  return 'pending';
}

export function commissionLabel(
  rules: Pick<PartnerRules, 'commissionType' | 'commissionValue'>,
  productTitle: string | null,
): string {
  const amount =
    rules.commissionType === 'percent'
      ? `${rules.commissionValue} %`
      : `${rules.commissionValue.toLocaleString('fr-FR')} FCFA`;
  const per = rules.commissionType === 'fixed' ? ' par article vendu' : '';
  return productTitle
    ? `${amount}${per} sur « ${productTitle} »`
    : `${amount}${per} sur toutes les ventes`;
}

/** Merchant-side view of a partner with its results. */
export interface PartnerDTO extends PartnerRules {
  id: string;
  name: string;
  slug: string;
  productTitle: string | null;
  token: string;
  paidAmount: number;
  paidAt: string | null;
  paidVia: string | null;
  createdAt: string;
  stats: PartnerStats;
}

export interface PartnerStats {
  clicks: number;
  pendingOrders: number;
  validatedOrders: number;
  cancelledOrders: number;
  /** Items revenue of non-cancelled orders (FCFA). */
  revenue: number;
  pendingCommission: number;
  validatedCommission: number;
  /** validatedCommission - paidAmount. */
  dueCommission: number;
}
