// Juula Store — Business Model & Pricing Plans
// Plan Gratuit (0 FCFA/mois) vs Plan Juula Pro (6 000 FCFA/mois)

export type StorePlanType = 'FREE' | 'PRO';

export interface StorePlanConfig {
  id: StorePlanType;
  name: string;
  tagline: string;
  priceMonthly: number; // 0 or 6000
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
    name: 'Plan Gratuit',
    tagline: 'Pour tester et lancer votre boutique sans abonnement fixe',
    priceMonthly: 0,
    currency: 'FCFA',
    maxActiveProducts: 1,
    codEnabled: false,
    juulaCommissionPercent: 2.5,
    telecomGatewayPercent: 5.0,
    totalOnlineFeePercent: 7.5,
    pixelsAllowed: false,
    customSubdomainAllowed: false,
    features: [
      '1 produit actif maximum',
      'Paiements en ligne uniquement (Wave & Orange Money)',
      '7,5% de frais totaux (5% opérateurs télécoms + 2,5% Juula)',
      'Lien boutique standard (juula.store/p/…)',
      'Paiement à la livraison désactivé',
      'Pixels Facebook & TikTok inactifs',
      'Cockpit de gestion & alertes WhatsApp',
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'Plan Juula Pro',
    tagline:
      'Pour les e-commerçants qui veulent scaler avec paiement à la livraison et pixels pubs',
    priceMonthly: 6000,
    currency: 'FCFA',
    popular: true,
    maxActiveProducts: Infinity,
    codEnabled: true,
    juulaCommissionPercent: 0,
    telecomGatewayPercent: 5.0,
    totalOnlineFeePercent: 5.0,
    pixelsAllowed: true,
    customSubdomainAllowed: true,
    features: [
      'Produits & pages de vente illimités',
      'Paiement à la livraison (Espèces) débloqué',
      '0% de commission Juula (seuls les 5% de frais télécoms sont prélevés)',
      '0% de commission sur les paiements en espèces',
      'Pixels Facebook & TikTok débloqués pour vos pubs',
      'Sous-domaine personnalisé (boutique.juula.store)',
      'Badge marchand vérifié & support VIP 7j/7',
    ],
  },
};

export const PRO_PLAN_PRICE_FCFA = 6000;

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
