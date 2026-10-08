import { XOF_PER_EUR } from '@/lib/money';

// Juula Store — Business Model & Pricing Plans
// Création gratuite ; abonnement 3 900 FCFA/mois pour être en ligne ;
// paiement en ligne JuulaPay optionnel, 7,5 % par paiement.

export type StorePlanType = 'FREE' | 'PRO';

export interface StorePlanConfig {
  id: StorePlanType;
  name: string;
  tagline: string;
  priceMonthly: number; // 0 or 3900
  currency: string;
  popular?: boolean;
  maxActiveProducts: number;
  codEnabled: boolean;
  juulaCommissionPercent: number;
  telecomGatewayPercent: number;
  totalOnlineFeePercent: number;
  pixelsAllowed: boolean;
  customSubdomainAllowed: boolean;
  features: string[];
}

export const JUULA_PLANS: Record<StorePlanType, StorePlanConfig> = {
  FREE: {
    id: 'FREE',
    name: 'Création',
    tagline: 'Préparez votre boutique et vos pages produits, sans payer',
    priceMonthly: 0,
    currency: 'FCFA',
    maxActiveProducts: Infinity,
    codEnabled: false,
    juulaCommissionPercent: 2.5,
    telecomGatewayPercent: 5.0,
    totalOnlineFeePercent: 7.5,
    pixelsAllowed: false,
    customSubdomainAllowed: false,
    features: [
      'Boutique et pages produits illimitées',
      'Bannières, sections, témoignages et couleurs',
      'Aperçu de votre boutique avant publication',
      'Visible par vos clients une fois l’abonnement activé',
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'Abonnement Juula',
    tagline: 'Votre boutique et vos pages produits en ligne',
    priceMonthly: 3900,
    currency: 'FCFA',
    popular: true,
    maxActiveProducts: Infinity,
    codEnabled: true,
    juulaCommissionPercent: 2.5,
    telecomGatewayPercent: 5.0,
    totalOnlineFeePercent: 7.5,
    pixelsAllowed: true,
    customSubdomainAllowed: true,
    features: [
      'Boutique et pages produits en ligne',
      'Lien personnalisé : maboutique.juula.store',
      'Paiement à la livraison et « Commander sur WhatsApp »',
      'Liens de paiement directs (Wave Business, Orange Money…)',
      'Pixels Facebook & TikTok, statistiques et notifications',
      'Option : paiement en ligne Mobile Money JuulaPay (7,5 % par paiement)',
    ],
  },
};

export const PRO_PLAN_PRICE_FCFA = 3900;

// ─────────────────────────────────────────────────────────────────────────
// Subscription terms: 1, 3, 6 or 12 months, paid once (no auto-renewal).
// Prices are in FCFA (XOF) — the only currency the payment provider charges.
// EUR / USD are display conversions for merchants abroad.
// ─────────────────────────────────────────────────────────────────────────
export type SubscriptionMonths = 1 | 3 | 6 | 12;

export interface SubscriptionTerm {
  months: SubscriptionMonths;
  label: string;
  priceXof: number;
}

export const SUBSCRIPTION_TERMS: readonly SubscriptionTerm[] = [
  { months: 1, label: '1 mois', priceXof: 3900 },
  { months: 3, label: '3 mois', priceXof: 11000 },
  { months: 6, label: '6 mois', priceXof: 22000 },
  { months: 12, label: '1 an', priceXof: 45000 },
];

export function subscriptionTerm(months: number): SubscriptionTerm | null {
  return SUBSCRIPTION_TERMS.find((t) => t.months === months) ?? null;
}

/** Saving vs paying month by month, in whole percent (0 for 1 month). */
export function termSavingsPercent(term: SubscriptionTerm): number {
  const full = PRO_PLAN_PRICE_FCFA * term.months;
  return Math.max(0, Math.round((1 - term.priceXof / full) * 100));
}

/** Price per month of a term, rounded to the franc. */
export function termMonthlyXof(term: SubscriptionTerm): number {
  return Math.round(term.priceXof / term.months);
}

export type PriceCurrency = 'XOF' | 'EUR' | 'USD';

/**
 * Display price in another currency, rounded the way a price tag would be:
 * euros end in ,99 (5,95 → 5,99) and dollars go to the next half dollar
 * (18,33 → 18,50). FCFA stays exact.
 */
export function displayPrice(xof: number, currency: PriceCurrency, xofPerUsd: number): number {
  if (currency === 'EUR') {
    const v = xof / XOF_PER_EUR; // fixed peg: 1 € = 655,957 FCFA
    return Math.max(0.99, Math.ceil(v) - 0.01);
  }
  if (currency === 'USD') {
    if (!(xofPerUsd > 0)) return 0;
    return Math.ceil((xof / xofPerUsd) * 2) / 2;
  }
  return xof;
}

/** Adds calendar months (31 Jan + 1 month → 28/29 Feb, never overflows). */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

export function isStorePro(
  store: { plan?: string | null; planExpiresAt?: Date | string | null } | null | undefined,
): boolean {
  if (!store || store.plan !== 'PRO') return false;
  if (!store.planExpiresAt) return true;
  const exp =
    typeof store.planExpiresAt === 'string' ? new Date(store.planExpiresAt) : store.planExpiresAt;
  return exp.getTime() > Date.now();
}

// ─────────────────────────────────────────────────────────────────────────
// Legacy compatibility (retained for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────
export interface LeadPack {
  credits: number;
  price: number;
  label: string;
  popular: boolean;
  costPerLead: string;
  discount?: string;
  tagline: string;
}

export const LEAD_PACKS: LeadPack[] = [
  {
    credits: 50,
    price: 5000,
    label: 'Pack Découverte',
    popular: false,
    costPerLead: '100 FCFA/lead',
    tagline: 'Pour tester votre premier produit',
  },
  {
    credits: 150,
    price: 12500,
    label: 'Pack Croissance',
    popular: true,
    costPerLead: '83 FCFA/lead',
    discount: '-17%',
    tagline: 'Pour les boutiques qui vendent chaque jour',
  },
  {
    credits: 500,
    price: 35000,
    label: 'Pack Scaler Pro',
    popular: false,
    costPerLead: '70 FCFA/lead',
    discount: '-30%',
    tagline: 'Pour scaler vos campagnes Facebook & TikTok',
  },
];

export const WELCOME_CREDITS = 100;
