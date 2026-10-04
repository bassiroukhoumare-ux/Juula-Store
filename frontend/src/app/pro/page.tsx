'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  XCircle,
  Package,
  Truck,
  Target,
  Globe,
  Headphones,
  ArrowLeft,
  Coins,
  Info,
} from 'lucide-react';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import { api, ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/orderUtils';

interface SubscriptionStatusResponse {
  plan: 'FREE' | 'PRO';
  planExpiresAt: string | null;
  daysRemaining: number;
}

export default function ProSubscriptionPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState<SubscriptionStatusResponse | null>(null);

  // Interactive Simulator state
  const [simulatedAmount, setSimulatedAmount] = useState<number>(10000);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const subStatusParam = urlParams.get('sub_status');
          const subId = urlParams.get('sub_id');
          if (subStatusParam === 'success' && subId) {
            try {
              await api('/api/store/subscription/verify', {
                method: 'POST',
                body: { subscriptionId: subId },
              });
            } catch {
              // Webhook or background verify handles it
            }
            window.history.replaceState({}, '', '/pro');
          }
        }

        const res = await api<SubscriptionStatusResponse>('/api/store/subscription');
        if (mounted && res) {
          setSubStatus(res);
        }
      } catch {
        // Guest or unauthenticated, ignore status fetch
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const isPro = subStatus?.plan === 'PRO';

  const handleSubscribe = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const data = await api<{ checkoutUrl?: string }>('/api/store/subscription', {
        method: 'POST',
      });

      if (!data?.checkoutUrl) {
        setErrorMessage('Impossible d’initialiser le paiement. Veuillez réessayer.');
        setIsProcessing(false);
        return;
      }

      // Redirection immédiate vers la session sécurisée Moneriz (Wave & Orange Money)
      window.location.href = data.checkoutUrl;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // Si l'utilisateur n'est pas connecté, rediriger vers login
          router.push('/login?redirect=/pro');
          return;
        }
        setErrorMessage(
          (err.body?.message as string) || err.message || 'Impossible d’initialiser le paiement.',
        );
      } else {
        setErrorMessage('Erreur réseau. Vérifiez votre connexion.');
      }
      setIsProcessing(false);
    }
  };

  // Calculations for 5% telecom fee vs 0% COD
  const feeOnline = Math.round(simulatedAmount * 0.05);
  const netOnline = simulatedAmount - feeOnline;
  const netDelivery = simulatedAmount; // 0% fee on COD

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-[#1E60F8] selection:text-white">
      {/* Top Banner / Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/dashboard" className="transition-transform active:scale-95">
              <JuulaLogo height={34} />
            </Link>
            <div className="hidden sm:block h-6 w-px bg-[#CBD5E1]" />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Tableau de bord</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFF4FF] border border-[#BFDBFE] text-xs font-bold text-[#1E60F8]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Abonnement Marchand Pro</span>
            </div>

            {isPro ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Plan Pro Actif</span>
              </span>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={isProcessing}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-[#1E60F8] hover:bg-[#164ED0] text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Initialisation...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white text-white" />
                    <span>Passer à Pro (6 000 F)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 bg-gradient-to-b from-white via-[#F8FAFC] to-[#F1F5F9]">
        <div className="absolute inset-0 bg-[radial-gradient(#1E60F8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EFF4FF] border border-[#BFDBFE] text-[#1E60F8] text-xs font-extrabold uppercase tracking-wider mb-6 shadow-xs">
            <Zap className="w-3.5 h-3.5 fill-[#1E60F8]" />
            <span>Multipliez vos ventes · 0% de commission Juula</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#0F172A] leading-[1.15] max-w-4xl mx-auto">
            Vendez sans limites.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1E60F8] via-[#3B82F6] to-[#059669]">
              Encaissez à 100% avec Juula Pro.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#475569] max-w-2xl mx-auto leading-relaxed">
            Débloquez le <strong>paiement à la livraison</strong> (espèces), ajoutez des{' '}
            <strong>produits illimités</strong> et rentabilisez vos publicités grâce aux{' '}
            <strong>pixels Meta & TikTok</strong>.
          </p>

          {/* Pricing Highlight Card */}
          <div className="mt-10 max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white shadow-2xl border border-white/10 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#1E60F8]/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black uppercase tracking-wider bg-white/10 text-white/90 px-3 py-1 rounded-full border border-white/15">
                Formule Tout Inclus
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4" /> Sans engagement
              </span>
            </div>

            <div className="text-left mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black tracking-tight">6 000</span>
                <span className="text-lg font-bold text-white/80">FCFA</span>
                <span className="text-xs text-white/60 font-medium">/ mois</span>
              </div>
              <p className="text-xs text-white/70 mt-1">
                Paiement direct Wave & Orange Money · Activation immédiate
              </p>
            </div>

            {isPro ? (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-left mb-4">
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Votre Plan Juula Pro est déjà actif !</span>
                </div>
                {subStatus?.planExpiresAt && (
                  <p className="text-xs text-emerald-200 mt-1">
                    Valable encore {subStatus.daysRemaining} jour(s) (jusqu&apos;au{' '}
                    {new Intl.DateTimeFormat('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }).format(new Date(subStatus.planExpiresAt))}
                    ).
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Link
                    href="/dashboard"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold text-center transition-colors"
                  >
                    Retourner à mes ventes
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {errorMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-xs text-red-200 text-left">
                    {errorMessage}
                  </div>
                )}

                <button
                  onClick={handleSubscribe}
                  disabled={isProcessing}
                  className="w-full py-4 px-6 rounded-2xl bg-[#1E60F8] hover:bg-[#164ED0] active:scale-[0.98] text-white font-black text-sm tracking-tight flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(30,96,248,0.5)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Redirection vers le paiement...
                    </span>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white text-white" />
                      <span>Activer Juula Pro maintenant (6 000 FCFA)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}

            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-4 text-[11px] text-white/60">
              <span>✓ Wave</span>
              <span>•</span>
              <span>✓ Orange Money</span>
              <span>•</span>
              <span>✓ Zéro engagement</span>
            </div>
          </div>
        </div>
      </section>

      {/* THE CONCRETE 10 000 FCFA EXAMPLE & COD STRATEGY */}
      <section className="py-16 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
              <Coins className="w-3.5 h-3.5" />
              <span>Transparence Totale sur les Frais</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
              Comment fonctionnent les frais ?<br />
              <span className="text-[#1E60F8]">L&apos;exemple concret de 10 000 FCFA</span>
            </h2>
            <p className="mt-3 text-sm text-[#64748B]">
              Juula ne prend <strong>0 FCFA de commission</strong> sur le plan Pro. Découvrez
              comment optimiser vos marges selon vos modes de paiement.
            </p>
          </div>

          {/* Interactive Preset selector */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
            <span className="text-xs font-bold text-[#64748B] mr-2">Exemples de prix :</span>
            {[5000, 10000, 20000, 50000].map((amt) => (
              <button
                key={amt}
                onClick={() => setSimulatedAmount(amt)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  simulatedAmount === amt
                    ? 'bg-[#1E60F8] text-white shadow-sm scale-105'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
              >
                {formatNumber(amt)} FCFA
              </button>
            ))}
          </div>

          {/* Side by side cards: Online vs Delivery */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Mode 1: Paiement en ligne */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF4FF] text-[#1E60F8] text-xs font-extrabold">
                    <span>1. Paiement en ligne sécurisé</span>
                  </div>
                  <span className="text-xs text-[#64748B] font-bold">Wave & Orange Money</span>
                </div>

                <h3 className="text-lg font-black text-[#0F172A] mb-2">
                  Client paie en ligne sur votre vitrine
                </h3>
                <p className="text-xs text-[#64748B] mb-6 leading-relaxed">
                  Votre client règle immédiatement sa commande sur votre page de vente par mobile
                  money.
                </p>

                <div className="space-y-3 p-4 rounded-2xl bg-white border border-[#E2E8F0]">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B]">Prix du produit vendu :</span>
                    <span className="font-bold text-[#0F172A]">
                      {formatNumber(simulatedAmount)} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B] flex items-center gap-1">
                      Frais opérateurs télécoms (5%) :
                      <Info className="w-3.5 h-3.5 text-[#94A3B8]" />
                    </span>
                    <span className="font-bold text-red-600">- {formatNumber(feeOnline)} FCFA</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B]">Commission Juula (Plan Pro) :</span>
                    <span className="font-black text-emerald-600">0 FCFA (0%)</span>
                  </div>
                  <div className="pt-3 border-t border-[#E2E8F0] flex justify-between items-baseline">
                    <span className="text-xs font-black text-[#0F172A]">Vous recevez net :</span>
                    <span className="text-lg font-black text-[#1E60F8]">
                      {formatNumber(netOnline)} FCFA
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-[11px] text-[#64748B] bg-white/60 p-3 rounded-xl border border-dashed border-[#CBD5E1]">
                ℹ️ <strong>Transparence :</strong> Les 5% sont prélevés directement par la
                passerelle de paiement et les opérateurs télécoms. Juula ne prend aucun centime sur
                votre vente.
              </div>
            </div>

            {/* Mode 2: Paiement à la livraison (EXCLUSIF PRO) */}
            <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#ECFDF5] to-[#F0FDF4] border-2 border-emerald-500 shadow-md relative flex flex-col justify-between">
              <div className="absolute -top-3 right-6 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                ⭐ EXCLUSIF JUULA PRO
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                    <Truck className="w-3.5 h-3.5" />
                    <span>2. Paiement à la livraison (Espèces)</span>
                  </div>
                  <span className="text-xs text-emerald-700 font-bold">100% pour vous</span>
                </div>

                <h3 className="text-lg font-black text-emerald-950 mb-2">
                  Client paie en cash au livreur
                </h3>
                <p className="text-xs text-emerald-800 mb-6 leading-relaxed">
                  Le mode d&apos;achat favori en Afrique de l&apos;Ouest : le client valide sa
                  commande en 1 clic et paie en espèces à la livraison.
                </p>

                <div className="space-y-3 p-4 rounded-2xl bg-white border border-emerald-200">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B]">Prix du produit vendu :</span>
                    <span className="font-bold text-[#0F172A]">
                      {formatNumber(simulatedAmount)} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B]">Frais opérateurs télécoms :</span>
                    <span className="font-bold text-emerald-600">0 FCFA (0%)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B]">Commission Juula (Plan Pro) :</span>
                    <span className="font-black text-emerald-600">0 FCFA (0%)</span>
                  </div>
                  <div className="pt-3 border-t border-emerald-200 flex justify-between items-baseline">
                    <span className="text-xs font-black text-emerald-950">
                      Vous encaissez en main propre :
                    </span>
                    <span className="text-xl font-black text-emerald-600">
                      {formatNumber(netDelivery)} FCFA
                    </span>
                  </div>
                </div>
              </div>

              {/* Pro Tip Box */}
              <div className="mt-5 p-3.5 rounded-2xl bg-emerald-600 text-white shadow-xs">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
                  <p className="text-xs leading-relaxed">
                    <strong>L&apos;astuce des top marchands Juula :</strong> Avec le Plan Pro, vous
                    pouvez choisir de <strong>désactiver le paiement en ligne</strong> et proposer{' '}
                    <strong>exclusivement le paiement à la livraison</strong>. Ainsi, vous avez{' '}
                    <strong>0% de prélèvement</strong> et vous conservez{' '}
                    <strong>100% de votre chiffre d&apos;affaires</strong> !
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE: GRATUIT VS PRO */}
      <section className="py-16 lg:py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF4FF] text-[#1E60F8] text-xs font-bold uppercase tracking-wider mb-3">
            <span>Comparatif Clair</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
            Pourquoi passer à Juula Pro ?
          </h2>
          <p className="mt-2 text-sm text-[#64748B]">
            Comparez le Plan Gratuit et le Plan Juula Pro en un coup d&apos;œil.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="grid grid-cols-3 p-4 sm:p-6 bg-[#F8FAFC] border-b border-[#E2E8F0] font-black text-xs sm:text-sm">
            <div className="text-[#64748B]">Fonctionnalité</div>
            <div className="text-center text-[#64748B]">Plan Gratuit</div>
            <div className="text-center text-[#1E60F8]">Plan Juula Pro (6 000 F)</div>
          </div>

          <div className="divide-y divide-[#F1F5F9] text-xs sm:text-sm">
            {/* Feature 1 */}
            <div className="grid grid-cols-3 p-4 sm:p-5 items-center hover:bg-[#F8FAFC] transition-colors">
              <div className="font-bold text-[#0F172A] flex items-center gap-2">
                <Package className="w-4 h-4 text-[#1E60F8] shrink-0" />
                <span>Nombre de produits actifs</span>
              </div>
              <div className="text-center text-[#64748B]">1 produit max</div>
              <div className="text-center font-black text-emerald-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Produits Illimités</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="grid grid-cols-3 p-4 sm:p-5 items-center hover:bg-[#F8FAFC] transition-colors bg-emerald-50/30">
              <div className="font-bold text-[#0F172A] flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Paiement à la livraison (COD)</span>
              </div>
              <div className="text-center text-[#94A3B8] flex items-center justify-center gap-1">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="hidden sm:inline">Bloqué</span>
              </div>
              <div className="text-center font-black text-emerald-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Débloqué (0% frais)</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid grid-cols-3 p-4 sm:p-5 items-center hover:bg-[#F8FAFC] transition-colors">
              <div className="font-bold text-[#0F172A] flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#1E60F8] shrink-0" />
                <span>Commission plateforme Juula</span>
              </div>
              <div className="text-center text-[#64748B]">2.5% prélevés</div>
              <div className="text-center font-black text-emerald-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>0% Commission Juula</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="grid grid-cols-3 p-4 sm:p-5 items-center hover:bg-[#F8FAFC] transition-colors">
              <div className="font-bold text-[#0F172A] flex items-center gap-2">
                <Target className="w-4 h-4 text-[#1E60F8] shrink-0" />
                <span>Pixels Meta (Facebook) & TikTok</span>
              </div>
              <div className="text-center text-[#94A3B8] flex items-center justify-center gap-1">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="hidden sm:inline">Bloqué</span>
              </div>
              <div className="text-center font-black text-emerald-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Débloqués (Trackez vos pubs)</span>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="grid grid-cols-3 p-4 sm:p-5 items-center hover:bg-[#F8FAFC] transition-colors">
              <div className="font-bold text-[#0F172A] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#1E60F8] shrink-0" />
                <span>Sous-domaine personnalisé</span>
              </div>
              <div className="text-center text-[#64748B]">Standard</div>
              <div className="text-center font-black text-emerald-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>boutique.juula.store</span>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="grid grid-cols-3 p-4 sm:p-5 items-center hover:bg-[#F8FAFC] transition-colors">
              <div className="font-bold text-[#0F172A] flex items-center gap-2">
                <Headphones className="w-4 h-4 text-[#1E60F8] shrink-0" />
                <span>Support client & Accompagnement</span>
              </div>
              <div className="text-center text-[#64748B]">Email</div>
              <div className="text-center font-black text-emerald-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ligne VIP WhatsApp 7j/7</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handleSubscribe}
            disabled={isProcessing || isPro}
            className="px-8 py-4 rounded-2xl bg-[#1E60F8] hover:bg-[#164ED0] text-white font-black text-sm tracking-tight inline-flex items-center gap-2 shadow-[0_4px_20px_rgba(30,96,248,0.4)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Zap className="w-4 h-4 fill-white text-white" />
            <span>
              {isPro
                ? 'Vous êtes déjà sur le Plan Pro'
                : 'Activer Juula Pro maintenant (6 000 FCFA / mois)'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 5 GROWTH PILLARS */}
      <section className="py-16 bg-[#F1F5F9] border-t border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
              Tout ce dont vous avez besoin pour exploser votre chiffre d&apos;affaires
            </h2>
            <p className="mt-3 text-sm text-[#64748B]">
              Conçu spécifiquement pour le e-commerce et le business en Afrique de l&apos;Ouest.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-[#EFF4FF] flex items-center justify-center text-[#1E60F8] mb-4">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#0F172A] mb-2">
                Paiement à la livraison (COD)
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Plus de 75% des acheteurs en ligne au Sénégal et en Côte d&apos;Ivoire préfèrent
                payer en cash à la réception. Débloquez ce mode de paiement pour multiplier
                instantanément vos conversions.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#0F172A] mb-2">
                Pixels Meta & TikTok Débloqués
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Connectez vos pixels de suivi en un clic. Suivez les ajouts au panier et les
                commandes pour laisser l&apos;algorithme de Facebook & TikTok cibler les meilleurs
                acheteurs au coût le plus bas.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-4">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#0F172A] mb-2">Produits & Pages Illimités</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Fini d&apos;être limité à 1 seul produit. Lancez 5, 20 ou 100 pages de vente pour
                tester autant de niches que vous voulez et trouver vos prochains produits winners.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
                <Coins className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#0F172A] mb-2">0% Commission Juula</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Sur le plan gratuit, Juula prélève 2.5% sur chaque vente. Avec Juula Pro, la
                commission plateforme tombe à 0% : vous ne payez qu&apos;un forfait fixe de 6 000
                F/mois, rien de plus.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#0F172A] mb-2">Sous-domaine Personnalisé</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Offrez une image de marque irréprochable avec votre adresse dédiée du type{' '}
                <code>boutique.juula.store</code> pour instaurer une confiance absolue chez vos
                clients.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-4">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#0F172A] mb-2">Support VIP WhatsApp</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Un contact direct avec notre équipe technique et commerciale sur WhatsApp pour
                résoudre vos requêtes en priorité et vous conseiller sur vos boutiques.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 bg-white border-t border-[#E2E8F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
              Questions Fréquentes sur Juula Pro
            </h2>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <h4 className="text-sm font-black text-[#0F172A] mb-1">
                Comment s&apos;effectue le paiement des 6 000 FCFA ?
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Le règlement s&apos;effectue directement par Wave ou Orange Money via notre
                passerelle sécurisée. L&apos;activation de votre boutique en Juula Pro est
                instantanée dès validation sur votre téléphone.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <h4 className="text-sm font-black text-[#0F172A] mb-1">
                Que se passe-t-il si un client paie en ligne ?
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Sur un paiement en ligne (Wave / Orange Money), 5% sont déduits par les opérateurs
                télécoms pour les frais de passerelle. Juula prend 0%. Par exemple, pour 10 000 FCFA
                payés en ligne, vous recevez 9 500 FCFA net dans votre solde Juula Pay.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <h4 className="text-sm font-black text-[#0F172A] mb-1">
                Puis-je désactiver le paiement en ligne et ne faire que de la livraison ?
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Absolument ! C&apos;est le secret des meilleurs marchands : avec Juula Pro, vous
                pouvez activer exclusivement le paiement à la livraison. Vos clients paient en
                espèces lors de la remise du colis, ce qui donne 0% de frais et 100% du montant net
                pour vous.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <h4 className="text-sm font-black text-[#0F172A] mb-1">
                Y a-t-il un engagement de durée ?
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Non, aucun engagement. L&apos;abonnement est valable 30 jours à compter de la date
                de paiement. Vous êtes libre de renouveler ou non le mois suivant.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-16 bg-[#0F172A] text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-4">
            Prêt à faire passer votre boutique au niveau supérieur ?
          </h2>
          <p className="text-sm text-white/70 max-w-xl mx-auto mb-8">
            Rejoignez les marchands Pro qui vendent sans limites et encaissent avec 0% de commission
            Juula.
          </p>

          {isPro ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-sm font-black">
              <CheckCircle2 className="w-5 h-5" />
              <span>Vous profitez déjà du Plan Juula Pro</span>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="px-8 py-4 rounded-2xl bg-[#1E60F8] hover:bg-[#164ED0] text-white font-black text-sm sm:text-base tracking-tight inline-flex items-center gap-3 shadow-[0_4px_25px_rgba(30,96,248,0.5)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Initialisation de votre paiement...</span>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-white text-white" />
                  <span>Activer Juula Pro maintenant (6 000 FCFA / mois)</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          )}

          <p className="mt-4 text-xs text-white/50">
            Activation immédiate par Wave & Orange Money · Aucun frais caché
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#090D16] text-[#64748B] text-xs text-center border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <JuulaLogo height={24} />
            <span>© {new Date().getFullYear()} Juula Store. Tous droits réservés.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/conditions" className="hover:text-white transition-colors">
              Conditions générales
            </Link>
            <Link href="/confidentialite" className="hover:text-white transition-colors">
              Confidentialité
            </Link>
            <a
              href="https://wa.me/221774128930"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Support WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
