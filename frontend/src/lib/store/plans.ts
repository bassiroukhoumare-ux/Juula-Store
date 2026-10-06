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
