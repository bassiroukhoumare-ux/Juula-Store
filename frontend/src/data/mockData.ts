import { FunnelPageConfig, FunnelPageItem, KpiMetrics, OrderLead, WalletState } from '@/types/juula';

// Plateforme vierge : aucune fausse commande
export const initialOrders: OrderLead[] = [];

// Métriques initiales à zéro pour le lancement en production
export const initialKpis: KpiMetrics = {
  todayVisits: {
    value: 0,
    changePercent: 0,
    target: 500,
  },
  ordersBreakdown: {
    total: 0,
    codCount: 0,
    onlineCount: 0,
    conversionRate: 0,
    changePercent: 0,
  },
  revenue: {
    total: 0,
    codAmount: 0,
    onlineAmount: 0,
    currency: 'FCFA',
    changePercent: 0,
  },
  leadCredits: {
    remaining: 100,
    total: 100,
    plan: 'Pack Starter Pro',
  },
};

// Portefeuille marchand vierge à 0 FCFA
export const initialWallet: WalletState = {
  availableBalance: 0,
  todayRevenue: 0,
  monthRevenue: 0,
  codCollectedAmount: 0,
  pendingCodAmount: 0,
  totalWithdrawn: 0,
  currency: 'FCFA',
  payoutHistory: [],
  inflowHistory: [],
};

// Configuration de base d'un tunnel de vente prêt à l'emploi
export const defaultFunnelConfig: FunnelPageConfig = {
  id: 'fnl-001',
  storeName: 'Ma Boutique',
  storeCode: 'JLA',
  productTitle: 'Mon Produit',
  slug: 'mon-produit',
  mediaItems: [],
  videoUrl: '',
  hasVideo: false,
  price: 0,
  originalPrice: 0,
  currency: 'FCFA',
  discountPercent: '',
  reviewScore: '',
  guaranteeBadge: 'Garantie Satisfait ou Remboursé',
  deliveryFee: 1500,
  deliveryFree: false,
  deliveryPricingType: 'fixed',
  fixedDeliveryFee: 1500,
  showUrgencyBadge: false,
  urgencyText: '',
  deliveryNotice: 'Livraison express partout à Dakar',
  benefits: [],
  ctaButtonText: 'Commander maintenant',
  codEnabled: true,
  mobileMoneyEnabled: true,
  reassuranceText: 'Paiement à la livraison (espèces) ou en ligne par Wave / Orange Money',
  whatsappSupportNumber: '',
  proofScreenshots: [],
  proofItems: [],
  reviews: [],
  quantityDiscountsEnabled: false,
  quantityDiscounts: [],
};

// Page initiale vierge en brouillon
export const initialFunnelPages: FunnelPageItem[] = [
  {
    id: 'fnl-001',
    internalName: 'Mon Premier Tunnel de Vente',
    status: 'draft',
    createdAt: "Aujourd'hui",
    updatedAt: "À l'instant",
    config: defaultFunnelConfig,
  },
];
