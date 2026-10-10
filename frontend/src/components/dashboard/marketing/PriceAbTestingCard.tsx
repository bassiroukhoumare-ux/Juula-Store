'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Split,
  Trophy,
  Truck,
  Zap,
} from 'lucide-react';
import type { FunnelPageConfig, FunnelPageItem } from '@/types/juula';
import { formatFCFA } from '@/lib/orderUtils';
import {
  computeAbNetProfit,
  createDefaultPriceAbTest,
  parsePriceAbTest,
} from '@/lib/store/ab-testing';

interface PriceAbTestingCardProps {
  pages: FunnelPageItem[];
  onUpdateProduct: (id: string, patch: Partial<FunnelPageConfig>) => void;
  accent?: string | undefined;
}

export const PriceAbTestingCard: React.FC<PriceAbTestingCardProps> = ({
  pages,
  onUpdateProduct,
  accent: _accent = '#235BF7',
}) => {
  // Sélection du produit à tester (premier produit par défaut)
  const [selectedProductId, setSelectedProductId] = useState<string>(pages[0]?.id ?? '');

  const selectedPage = useMemo(
    () => pages.find((p) => p.id === selectedProductId) ?? pages[0] ?? null,
    [pages, selectedProductId],
  );

  // Configuration de test actuelle ou parse
  const currentTest = useMemo(() => {
    if (!selectedPage) return null;
    return parsePriceAbTest(
      selectedPage.config.abTest,
      selectedPage.config.price,
      selectedPage.config.deliveryFee || 2000,
    );
  }, [selectedPage]);

  // États du formulaire de personnalisation (avant ou pendant le test)
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [priceA, setPriceA] = useState<number>(15000);
  const [shippingA, setShippingA] = useState<number>(2000);
  const [priceB, setPriceB] = useState<number>(17500);
  const [shippingB, setShippingB] = useState<number>(0);
  const [productCost, setProductCost] = useState<number>(6000);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState<'A' | 'B' | null>(null);

  // Synchronisation lors du changement de produit sélectionné
  React.useEffect(() => {
    if (selectedPage) {
      const p = selectedPage.config.price || 15000;
      const s = selectedPage.config.deliveryFee || 2000;
      setPriceA(p);
      setShippingA(s);
      setPriceB(p + (s || 2500));
      setShippingB(0);
      setProductCost(Math.round(p * 0.45));
    }
  }, [selectedPage]);

  // 1-Click Launch: Lance le test avec le préréglage ultra-simplifié
  const handleLaunchDefaultTest = async () => {
    if (!selectedPage) return;
    setIsSaving(true);
    try {
      const newTest = createDefaultPriceAbTest(
        selectedPage.config.price,
        selectedPage.config.deliveryFee || 2000,
      );
      // Si l'utilisateur a personnalisé les champs :
      if (isCustomizing) {
        newTest.variantA.price = priceA;
        newTest.variantA.deliveryFee = shippingA;
        newTest.variantA.deliveryFree = shippingA === 0;
        newTest.variantA.description = `${priceA.toLocaleString('fr-FR')} FCFA (${shippingA > 0 ? 'livraison payante' : 'livraison offerte'})`;

        newTest.variantB.price = priceB;
        newTest.variantB.deliveryFee = shippingB;
        newTest.variantB.deliveryFree = shippingB === 0;
        newTest.variantB.description = `${priceB.toLocaleString('fr-FR')} FCFA (${shippingB === 0 ? 'livraison offerte' : 'livraison payante'})`;

        newTest.productCost = productCost;
        newTest.estimatedShippingCost = shippingA || 2000;
      }

      onUpdateProduct(selectedPage.id, {
        abTest: newTest,
      });
      setIsCustomizing(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Bascule pause / reprise
  const handleTogglePause = () => {
    if (!selectedPage || !currentTest) return;
    const newStatus = currentTest.status === 'running' ? 'paused' : 'running';
    onUpdateProduct(selectedPage.id, {
      abTest: { ...currentTest, status: newStatus },
    });
  };

  // Arrêter le test
  const handleStopTest = () => {
    if (!selectedPage || !currentTest) return;
    if (
      !window.confirm('Voulez-vous vraiment arrêter ce test A/B et conserver le prix initial ?')
    ) {
      return;
    }
    onUpdateProduct(selectedPage.id, {
      abTest: { ...currentTest, enabled: false, status: 'completed' },
    });
  };

  // Appliquer définitivement la Version Gagnante (1 clic !)
  const handleApplyWinner = (variant: 'A' | 'B') => {
    if (!selectedPage || !currentTest) return;
    const v = variant === 'B' ? currentTest.variantB : currentTest.variantA;
    const confirmMsg = `Confirmez-vous l'application de la ${v.label} ? Le prix de la page passera à ${v.price.toLocaleString('fr-FR')} FCFA et la livraison sera ${v.deliveryFree ? 'offerte (0 FCFA)' : `${v.deliveryFee.toLocaleString('fr-FR')} FCFA`}.`;

    if (!window.confirm(confirmMsg)) return;

    onUpdateProduct(selectedPage.id, {
      price: v.price,
      deliveryFree: v.deliveryFree,
      deliveryFee: v.deliveryFee,
      fixedDeliveryFee: v.deliveryFee,
      deliveryPricingType: v.deliveryFree ? 'free' : 'fixed',
      abTest: {
        ...currentTest,
        enabled: false,
        status: 'completed',
        winner: variant,
        completedAt: new Date().toISOString(),
      },
    });
  };

  // Calcul du bénéfice net
  const netResult = useMemo(() => {
    if (!currentTest) return null;
    return computeAbNetProfit(currentTest);
  }, [currentTest]);

  const copyTestLink = (variant: 'a' | 'b') => {
    if (!selectedPage) return;
    const url = `${window.location.origin}/p/${selectedPage.config.slug}?ab=${variant}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(variant === 'a' ? 'A' : 'B');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Simuler une visite/commande pour tester le fonctionnement en direct
  const handleSimulateVisitor = (variant: 'A' | 'B', orderPlaced: boolean) => {
    if (!selectedPage || !currentTest) return;
    const updatedStats = { ...currentTest.stats };
    if (variant === 'A') {
      updatedStats.visitsA += 1;
      if (orderPlaced) {
        updatedStats.ordersA += 1;
        updatedStats.revenueA += currentTest.variantA.price + currentTest.variantA.deliveryFee;
      }
    } else {
      updatedStats.visitsB += 1;
      if (orderPlaced) {
        updatedStats.ordersB += 1;
        updatedStats.revenueB += currentTest.variantB.price;
      }
    }

    onUpdateProduct(selectedPage.id, {
      abTest: {
        ...currentTest,
        stats: updatedStats,
      },
    });
  };

  if (!selectedPage) {
    return (
      <div className="p-8 text-center text-[#7A808C] bg-white rounded-[28px] border border-[#ECEFF4]">
        <Split className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Créez d'abord un produit pour configurer un test A/B de prix.</p>
      </div>
    );
  }

  const isTestActive = currentTest && currentTest.enabled && currentTest.status !== 'completed';

  return (
    <div className="space-y-6">
      {/* 1. Entête du Concept & Sélecteur de Produit */}
      <div className="bg-white rounded-[28px] p-6 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0 shadow-xs">
              <Split className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#201D1D] tracking-tight">
                  A/B Testing Ultra-Simplifié (Test de Prix)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                  50/50 Automatique
                </span>
              </div>
              <p className="text-[13px] text-[#7A808C] mt-0.5 leading-relaxed">
                Testez automatiquement 2 offres de prix et de livraison. Juula.Store répartit le
                trafic à 50/50 et vous indique après <strong>100 visites</strong> quelle version
                génère le plus de bénéfice net.
              </p>
            </div>
          </div>

          {/* Sélecteur de produit */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-[#7A808C]">Produit :</span>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="py-2 px-3 text-[13px] font-bold text-[#201D1D] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#235BF7]/30"
            >
              {pages.map((p) => {
                const hasAb = p.config.abTest?.enabled;
                return (
                  <option key={p.id} value={p.id}>
                    {p.config.productTitle || p.internalName} ({formatFCFA(p.config.price)}){' '}
                    {hasAb ? '· [Test en cours]' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* 2. SI AUCUN TEST EN COURS SUR CE PRODUIT -> ÉCRAN DE LANCEMENT 1-CLIC */}
      {!isTestActive && (
        <div className="bg-gradient-to-br from-white via-white to-[#F8FAFC] rounded-[28px] p-6 sm:p-8 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF3FF] text-[#235BF7] text-xs font-black uppercase tracking-wider mb-2">
              <Zap className="w-3.5 h-3.5" />
              <span>Préréglage Intelligent Recommandé</span>
            </div>
            <h4 className="text-2xl font-black text-[#201D1D] tracking-tight">
              Lancer le test de prix en 1 clic
            </h4>
            <p className="text-[14px] text-[#7A808C] mt-1">
              Les e-commerçants hésitent souvent entre faire payer la livraison ou l'offrir en
              augmentant le prix. Ce test compare les deux offres en direct sur 100 visiteurs.
            </p>
          </div>

          {/* Grille de prévisualisation des 2 versions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Version A */}
            <div className="rounded-2xl p-5 border-2 border-[#E2E8F0] bg-white space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-[#475569] text-xs font-black uppercase">
                  Version A · Prix Standard
                </span>
                <span className="text-xs text-[#94A3B8] font-bold">50% du trafic</span>
              </div>
              <div className="space-y-1">
                <span className="text-3xl font-black text-[#201D1D] tracking-tight block">
                  {formatFCFA(priceA)}
                </span>
                <span className="text-[13px] font-bold text-[#E11D48] flex items-center gap-1.5">
                  <Truck className="w-4 h-4" />
                  Livraison payante : +{formatFCFA(shippingA)}
                </span>
              </div>
              <p className="text-xs text-[#7A808C] pt-2 border-t border-[#F1F5F9]">
                Offre standard : le client voit le prix attractif mais paie la livraison à la
                caisse.
              </p>
            </div>

            {/* Version B */}
            <div className="rounded-2xl p-5 border-2 border-[#235BF7] bg-[#F7F9FF] space-y-3 relative overflow-hidden shadow-sm">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-[#235BF7] text-white text-xs font-black uppercase shadow-xs">
                  Version B · Tout Inclus
                </span>
                <span className="text-xs text-[#235BF7] font-black">50% du trafic</span>
              </div>
              <div className="space-y-1">
                <span className="text-3xl font-black text-[#235BF7] tracking-tight block">
                  {formatFCFA(priceB)}
                </span>
                <span className="text-[13px] font-black text-[#059669] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#059669]" />
                  Livraison Offerte (0 FCFA)
                </span>
              </div>
              <p className="text-xs text-[#7A808C] pt-2 border-t border-[#DBEAFE]">
                Offre premium : le client bénéficie de la gratuité perçue de la livraison.
              </p>
            </div>
          </div>

          {/* Formulaire de personnalisation optionnel */}
          {isCustomizing && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                <span className="text-xs font-black text-[#201D1D] uppercase tracking-wider">
                  Paramètres personnalisés du test
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomizing(false)}
                  className="text-xs text-[#7A808C] hover:text-[#201D1D]"
                >
                  Masquer
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
                <div>
                  <label className="text-xs font-bold text-[#7A808C] block mb-1">
                    Prix Version A (FCFA)
                  </label>
                  <input
                    type="number"
                    value={priceA}
                    onChange={(e) => setPriceA(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#7A808C] block mb-1">
                    Livraison Version A (FCFA)
                  </label>
                  <input
                    type="number"
                    value={shippingA}
                    onChange={(e) => setShippingA(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#7A808C] block mb-1">
                    Prix Version B (FCFA)
                  </label>
                  <input
                    type="number"
                    value={priceB}
                    onChange={(e) => setPriceB(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#7A808C] block mb-1">
                    Coût de revient unitaire (FCFA)
                  </label>
                  <input
                    type="number"
                    value={productCost}
                    onChange={(e) => setProductCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-sm font-bold"
                    title="Votre coût d'achat du produit pour calculer le bénéfice net"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleLaunchDefaultTest}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-black transition-all shadow-[0_4px_16px_rgba(35,91,247,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Lancer l'A/B Test en 1 Clic (50/50)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {!isCustomizing && (
              <button
                type="button"
                onClick={() => setIsCustomizing(true)}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#475569] text-[13px] font-bold transition-colors"
              >
                Personnaliser les montants
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. SI UN TEST EST ACTIF -> DASHBOARD DE RÉSULTATS EN TEMPS RÉEL */}
      {isTestActive && currentTest && netResult && (
        <div className="space-y-6 animate-in fade-in">
          {/* Jauge des 100 visites & Statut */}
          <div className="bg-white rounded-[28px] p-6 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      currentTest.status === 'running'
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-sm font-extrabold text-[#201D1D]">
                    {currentTest.status === 'running'
                      ? 'Test en cours : Trafic réparti 50/50'
                      : 'Test en pause'}
                  </span>
                </div>
                <p className="text-xs text-[#7A808C] mt-0.5">
                  Objectif statistique : 100 visites pour déclarer le vainqueur définitif.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] text-[#475569] text-xs font-bold hover:bg-[#F8FAFC] flex items-center gap-1.5"
                >
                  {currentTest.status === 'running' ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Reprendre</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleStopTest}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50"
                >
                  Arrêter
                </button>
              </div>
            </div>

            {/* Barre de progression des 100 visites */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-[#201D1D]">
                  Progression du test : {netResult.totalVisits} / {currentTest.targetVisits} visites
                </span>
                <span className="text-[#235BF7]">{netResult.progressPercent}%</span>
              </div>
              <div className="h-3 w-full bg-[#F1F5F9] rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-[#235BF7] to-[#059669] rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${netResult.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Grille comparative des 2 versions en direct */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colonne Version A */}
            <div
              className={`rounded-[28px] p-6 border-2 transition-all space-y-5 bg-white ${
                netResult.winner === 'A'
                  ? 'border-emerald-500 shadow-[0_4px_20px_rgba(5,150,105,0.15)] ring-2 ring-emerald-500/20'
                  : 'border-[#ECEFF4]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-[#475569] text-xs font-black uppercase">
                    Version A (Base)
                  </span>
                  {netResult.winner === 'A' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-emerald-600" /> Vainqueur
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => copyTestLink('a')}
                  className="text-xs font-bold text-[#235BF7] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  {copiedLink === 'A' ? 'Lien copié !' : 'Tester en direct'}
                </button>
              </div>

              {/* L'offre */}
              <div className="space-y-1">
                <span className="text-3xl font-black text-[#201D1D] tracking-tight block">
                  {formatFCFA(currentTest.variantA.price)}
                </span>
                <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  Livraison payante : +{formatFCFA(currentTest.variantA.deliveryFee)}
                </span>
              </div>

              {/* Métriques */}
              <div className="grid grid-cols-2 gap-2.5 text-left pt-2 border-t border-[#F1F5F9]">
                <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#7A808C] block uppercase tracking-wider">
                    Visiteurs
                  </span>
                  <span className="text-xl font-black text-[#201D1D]">
                    {currentTest.stats.visitsA}
                  </span>
                </div>
                <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#7A808C] block uppercase tracking-wider">
                    Commandes
                  </span>
                  <span className="text-xl font-black text-[#201D1D]">
                    {currentTest.stats.ordersA}
                  </span>
                </div>
                <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#7A808C] block uppercase tracking-wider">
                    Conversion
                  </span>
                  <span className="text-xl font-black text-[#201D1D]">
                    {netResult.conversionRateA.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#7A808C] block uppercase tracking-wider">
                    Chiffre d'Affaires
                  </span>
                  <span className="text-xl font-black text-[#201D1D]">
                    {formatFCFA(currentTest.stats.revenueA)}
                  </span>
                </div>
              </div>

              {/* Bloc Bénéfice Net */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <span className="text-xs font-bold text-[#7A808C] block uppercase tracking-wider">
                  Bénéfice Net Réel Estimé
                </span>
                <span className="text-2xl font-black text-[#059669] block tracking-tight">
                  {formatFCFA(netResult.netProfitA)}
                </span>
                <span className="text-[11px] text-[#94A3B8] block">
                  (Marge unitaire : {formatFCFA(netResult.marginPerOrderA)} / commande)
                </span>
              </div>

              {/* Bouton d'application si vainqueur */}
              <button
                type="button"
                onClick={() => handleApplyWinner('A')}
                className={`w-full py-3 px-4 rounded-2xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  netResult.winner === 'A'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                    : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569]'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Appliquer la Version A définitivement</span>
              </button>
            </div>

            {/* Colonne Version B */}
            <div
              className={`rounded-[28px] p-6 border-2 transition-all space-y-5 bg-white ${
                netResult.winner === 'B'
                  ? 'border-[#235BF7] shadow-[0_4px_20px_rgba(35,91,247,0.15)] ring-2 ring-[#235BF7]/20 bg-[#FAF9FF]'
                  : 'border-[#ECEFF4]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#235BF7] text-white text-xs font-black uppercase shadow-xs">
                    Version B (Offerte)
                  </span>
                  {netResult.winner === 'B' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-emerald-600" /> Vainqueur Recommandé
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => copyTestLink('b')}
                  className="text-xs font-bold text-[#235BF7] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  {copiedLink === 'B' ? 'Lien copié !' : 'Tester en direct'}
                </button>
              </div>

              {/* L'offre */}
              <div className="space-y-1">
                <span className="text-3xl font-black text-[#235BF7] tracking-tight block">
                  {formatFCFA(currentTest.variantB.price)}
                </span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  Livraison Offerte (0 FCFA)
                </span>
              </div>

              {/* Métriques */}
              <div className="grid grid-cols-2 gap-2.5 text-left pt-2 border-t border-[#F1F5F9]">
                <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#7A808C] block uppercase tracking-wider">
                    Visiteurs
                  </span>
                  <span className="text-xl font-black text-[#201D1D]">
                    {currentTest.stats.visitsB}
                  </span>
                </div>
                <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#7A808C] block uppercase tracking-wider">
                    Commandes
                  </span>
                  <span className="text-xl font-black text-[#201D1D]">
                    {currentTest.stats.ordersB}
                  </span>
                </div>
                <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#7A808C] block uppercase tracking-wider">
                    Conversion
                  </span>
                  <span className="text-xl font-black text-[#201D1D]">
                    {netResult.conversionRateB.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#7A808C] block uppercase tracking-wider">
                    Chiffre d'Affaires
                  </span>
                  <span className="text-xl font-black text-[#201D1D]">
                    {formatFCFA(currentTest.stats.revenueB)}
                  </span>
                </div>
              </div>

              {/* Bloc Bénéfice Net */}
              <div className="p-4 rounded-2xl bg-[#EEF3FF] border border-[#BFDBFE] space-y-1">
                <span className="text-xs font-bold text-[#235BF7] block uppercase tracking-wider">
                  Bénéfice Net Réel Estimé
                </span>
                <span className="text-2xl font-black text-[#235BF7] block tracking-tight">
                  {formatFCFA(netResult.netProfitB)}
                </span>
                <span className="text-[11px] text-[#7A808C] block">
                  (Marge unitaire : {formatFCFA(netResult.marginPerOrderB)} / commande)
                </span>
              </div>

              {/* Bouton d'application si vainqueur */}
              <button
                type="button"
                onClick={() => handleApplyWinner('B')}
                className={`w-full py-3 px-4 rounded-2xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  netResult.winner === 'B'
                    ? 'bg-[#235BF7] hover:bg-[#1B4AD6] text-white shadow-md'
                    : 'bg-[#EEF3FF] hover:bg-[#DBEAFE] text-[#235BF7]'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Appliquer la Version B définitivement</span>
              </button>
            </div>
          </div>

          {/* Bannière de conclusion / recommandation Juula */}
          <div className="rounded-[28px] p-6 bg-gradient-to-r from-[#201D1D] to-[#1E293B] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-sm font-black text-white tracking-wide uppercase">
                  Verdict Statistique Juula.Store
                </span>
              </div>
              <p className="text-[14px] text-white/90 leading-relaxed">
                {netResult.summaryMessage}
              </p>
            </div>

            {netResult.winner && (
              <button
                type="button"
                onClick={() => handleApplyWinner(netResult.winner!)}
                className="shrink-0 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-[13px] font-black transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Appliquer la Version {netResult.winner} en 1 clic</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Simulateur de test en direct (pour démonstration & test rapide) */}
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
            <span className="text-xs font-bold text-[#7A808C] block uppercase tracking-wider">
              Simulateur de trafic (Démonstration)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSimulateVisitor('A', false)}
                className="px-2.5 py-1 text-xs font-bold bg-white border border-[#CBD5E1] rounded-lg hover:bg-slate-100"
              >
                +1 Visite A
              </button>
              <button
                type="button"
                onClick={() => handleSimulateVisitor('A', true)}
                className="px-2.5 py-1 text-xs font-bold bg-white border border-[#CBD5E1] rounded-lg hover:bg-slate-100 text-emerald-700"
              >
                +1 Commande A
              </button>
              <button
                type="button"
                onClick={() => handleSimulateVisitor('B', false)}
                className="px-2.5 py-1 text-xs font-bold bg-white border border-[#CBD5E1] rounded-lg hover:bg-slate-100"
              >
                +1 Visite B
              </button>
              <button
                type="button"
                onClick={() => handleSimulateVisitor('B', true)}
                className="px-2.5 py-1 text-xs font-bold bg-white border border-[#CBD5E1] rounded-lg hover:bg-slate-100 text-emerald-700"
              >
                +1 Commande B
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
