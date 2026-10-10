// A/B Testing Ultra-Simplifié (Test de Prix)
// Permet de tester 2 versions d'offre en 1 clic :
// Version A : Produit à 15 000 FCFA (livraison payante)
// Version B : Produit à 17 500 FCFA (livraison offerte)
// Répartit le trafic à 50/50 et indique au vendeur, après 100 visites,
// quelle version génère le plus de bénéfice net.

import type { FunnelPageConfig } from '@/types/juula';

export interface PriceAbVariant {
  label: string; // 'Version A' | 'Version B'
  price: number; // Prix produit unitaire
  deliveryFee: number; // Frais facturés au client
  deliveryFree: boolean; // true si livraison offerte
  description?: string | undefined;
}

export interface PriceAbTestStats {
  visitsA: number;
  visitsB: number;
  ordersA: number;
  ordersB: number;
  revenueA: number; // CA total encaissé (produit + livraison si facturée)
  revenueB: number;
}

export interface PriceAbTest {
  enabled: boolean;
  status: 'running' | 'completed' | 'paused';
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  targetVisits: number; // 100 par défaut (seuil statistique)
  productCost: number; // Coût de revient unitaire (ex: 6 000 FCFA)
  estimatedShippingCost: number; // Coût réel transporteur (ex: 2 000 FCFA)
  variantA: PriceAbVariant;
  variantB: PriceAbVariant;
  stats: PriceAbTestStats;
  winner?: 'A' | 'B' | null | undefined;
}

export const TARGET_AB_VISITS = 100;

/**
 * Crée le préréglage A/B test recommandé en 1 clic :
 * Version A : Prix de base (livraison payante)
 * Version B : Prix majoré (livraison offerte)
 */
export function createDefaultPriceAbTest(
  currentPrice: number,
  currentDeliveryFee: number = 2000,
): PriceAbTest {
  const basePrice = Math.max(1000, currentPrice || 15000);
  const shippingFee = Math.max(1000, currentDeliveryFee || 2000);
  // Majoraton recommandée : on intègre les frais de livraison dans le prix produit
  const premiumPrice = basePrice + shippingFee;
  // Estimation du coût produit (environ 40-50% du prix de vente si non spécifié)
  const estimatedCost = Math.round(basePrice * 0.45);

  return {
    enabled: true,
    status: 'running',
    startedAt: new Date().toISOString(),
    targetVisits: TARGET_AB_VISITS,
    productCost: estimatedCost,
    estimatedShippingCost: shippingFee,
    variantA: {
      label: 'Version A',
      price: basePrice,
      deliveryFee: shippingFee,
      deliveryFree: false,
      description: `${basePrice.toLocaleString('fr-FR')} FCFA (livraison payante)`,
    },
    variantB: {
      label: 'Version B',
      price: premiumPrice,
      deliveryFee: 0,
      deliveryFree: true,
      description: `${premiumPrice.toLocaleString('fr-FR')} FCFA (livraison offerte)`,
    },
    stats: {
      visitsA: 0,
      visitsB: 0,
      ordersA: 0,
      ordersB: 0,
      revenueA: 0,
      revenueB: 0,
    },
    winner: null,
  };
}

/** Parse en toute sécurité la configuration d'un A/B test stocké */
export function parsePriceAbTest(
  raw: unknown,
  fallbackPrice: number = 15000,
  fallbackFee: number = 2000,
): PriceAbTest | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.enabled !== 'boolean') return null;

  const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  const vA = (o.variantA as Record<string, unknown>) || {};
  const vB = (o.variantB as Record<string, unknown>) || {};
  const stats = (o.stats as Record<string, unknown>) || {};

  return {
    enabled: Boolean(o.enabled),
    status: o.status === 'completed' || o.status === 'paused' ? o.status : 'running',
    startedAt: typeof o.startedAt === 'string' ? o.startedAt : undefined,
    completedAt: typeof o.completedAt === 'string' ? o.completedAt : undefined,
    targetVisits: num(o.targetVisits, TARGET_AB_VISITS),
    productCost: num(o.productCost, Math.round(fallbackPrice * 0.45)),
    estimatedShippingCost: num(o.estimatedShippingCost, fallbackFee || 2000),
    variantA: {
      label: typeof vA.label === 'string' ? vA.label : 'Version A',
      price: num(vA.price, fallbackPrice),
      deliveryFee: num(vA.deliveryFee, fallbackFee),
      deliveryFree: Boolean(vA.deliveryFree),
      description: typeof vA.description === 'string' ? vA.description : undefined,
    },
    variantB: {
      label: typeof vB.label === 'string' ? vB.label : 'Version B',
      price: num(vB.price, fallbackPrice + fallbackFee),
      deliveryFee: num(vB.deliveryFee, 0),
      deliveryFree: typeof vB.deliveryFree === 'boolean' ? vB.deliveryFree : true,
      description: typeof vB.description === 'string' ? vB.description : undefined,
    },
    stats: {
      visitsA: num(stats.visitsA, 0),
      visitsB: num(stats.visitsB, 0),
      ordersA: num(stats.ordersA, 0),
      ordersB: num(stats.ordersB, 0),
      revenueA: num(stats.revenueA, 0),
      revenueB: num(stats.revenueB, 0),
    },
    winner: o.winner === 'A' || o.winner === 'B' ? o.winner : null,
  };
}

export interface AbNetProfitResult {
  totalVisits: number;
  progressPercent: number;
  isThresholdReached: boolean;
  visitsRemaining: number;
  // Métriques A
  conversionRateA: number;
  netProfitA: number;
  marginPerOrderA: number;
  // Métriques B
  conversionRateB: number;
  netProfitB: number;
  marginPerOrderB: number;
  // Comparatif & Vainqueur
  winner: 'A' | 'B' | null;
  profitDifference: number;
  profitMultiplier: number;
  summaryMessage: string;
}

/**
 * Calcule le bénéfice net de chaque version en déduisant :
 * - Le coût produit
 * - Le coût transporteur réel selon qui le prend en charge
 */
export function computeAbNetProfit(test: PriceAbTest): AbNetProfitResult {
  const { stats, variantA, variantB, productCost, estimatedShippingCost, targetVisits } = test;
  const totalVisits = stats.visitsA + stats.visitsB;
  const isThresholdReached = totalVisits >= targetVisits;
  const visitsRemaining = Math.max(0, targetVisits - totalVisits);
  const progressPercent = Math.min(100, Math.round((totalVisits / targetVisits) * 100));

  // Taux de conversion
  const conversionRateA = stats.visitsA > 0 ? (stats.ordersA / stats.visitsA) * 100 : 0;
  const conversionRateB = stats.visitsB > 0 ? (stats.ordersB / stats.visitsB) * 100 : 0;

  // Calcul du bénéfice net par commande :
  // Version A (livraison payante) :
  // Le client paie le produit (variantA.price) + la livraison (variantA.deliveryFee).
  // Coûts du vendeur : productCost + estimatedShippingCost.
  // Marge unitaire A = (prix A - coût produit) + (frais facturés - frais réels)
  const marginPerOrderA = Math.max(
    0,
    variantA.price - productCost + (variantA.deliveryFee - estimatedShippingCost),
  );
  const netProfitA = stats.ordersA * marginPerOrderA;

  // Version B (livraison offerte) :
  // Le client paie uniquement le produit (variantB.price).
  // Le vendeur absorbe le transporteur réel : estimatedShippingCost.
  // Marge unitaire B = prix B - coût produit - estimatedShippingCost
  const marginPerOrderB = Math.max(0, variantB.price - productCost - estimatedShippingCost);
  const netProfitB = stats.ordersB * marginPerOrderB;

  // Détermination du vainqueur
  let winner: 'A' | 'B' | null = null;
  if (isThresholdReached || totalVisits >= 30) {
    if (netProfitB > netProfitA) {
      winner = 'B';
    } else if (netProfitA > netProfitB) {
      winner = 'A';
    }
  }

  const profitDifference = Math.abs(netProfitB - netProfitA);
  const profitMultiplier =
    netProfitA > 0 && netProfitB > 0
      ? Number((netProfitB / netProfitA).toFixed(2))
      : netProfitB > 0
        ? 2
        : 1;

  let summaryMessage = '';
  if (!isThresholdReached) {
    summaryMessage = `Test en cours : ${totalVisits} / ${targetVisits} visites enregistrées (${visitsRemaining} visites restantes pour conclure).`;
  } else if (winner === 'B') {
    summaryMessage = `La Version B (Livraison offerte à ${variantB.price.toLocaleString('fr-FR')} FCFA) l'emporte avec +${profitDifference.toLocaleString('fr-FR')} FCFA de bénéfice net en plus !`;
  } else if (winner === 'A') {
    summaryMessage = `La Version A (${variantA.price.toLocaleString('fr-FR')} FCFA + livraison) l'emporte avec +${profitDifference.toLocaleString('fr-FR')} FCFA de bénéfice net en plus !`;
  } else {
    summaryMessage = 'Les deux versions génèrent actuellement un bénéfice net identique.';
  }

  return {
    totalVisits,
    progressPercent,
    isThresholdReached,
    visitsRemaining,
    conversionRateA,
    netProfitA,
    marginPerOrderA,
    conversionRateB,
    netProfitB,
    marginPerOrderB,
    winner,
    profitDifference,
    profitMultiplier,
    summaryMessage,
  };
}

/**
 * Répartit le trafic 50/50 de manière déterministe pour un visiteur.
 * Utilise le visitorId s'il est fourni (hash string), ou 50% aléatoire.
 */
export function decideAbVariant(test: PriceAbTest, visitorId?: string): 'A' | 'B' {
  if (!test.enabled || test.status !== 'running') {
    return 'A';
  }
  if (!visitorId) {
    return Math.random() < 0.5 ? 'A' : 'B';
  }
  // Simple hash déterministe pour que le même visiteur revoie toujours la même offre
  let hash = 0;
  for (let i = 0; i < visitorId.length; i++) {
    hash = (hash << 5) - hash + visitorId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2 === 0 ? 'A' : 'B';
}

/**
 * Applique les prix et conditions de la variante sélectionnée
 * sur la configuration d'une page produit pour affichage client.
 */
export function applyAbVariantToConfig(
  config: FunnelPageConfig,
  variant: 'A' | 'B',
): FunnelPageConfig {
  const test = config.abTest;
  if (!test || !test.enabled) return config;

  const v = variant === 'B' ? test.variantB : test.variantA;
  return {
    ...config,
    price: v.price,
    deliveryFree: v.deliveryFree,
    deliveryFee: v.deliveryFee,
    fixedDeliveryFee: v.deliveryFree ? 0 : v.deliveryFee,
    deliveryPricingType: v.deliveryFree ? 'free' : 'fixed',
    abVariant: variant,
  };
}
