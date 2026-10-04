'use client';

import React, { useState } from 'react';
import { X, Zap, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { PRO_PLAN_PRICE_FCFA } from '@/lib/store/plans';
import { formatNumber } from '@/lib/orderUtils';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecharged?: (creditsAdded: number) => void;
  currentPlan?: 'FREE' | 'PRO' | undefined;
  planExpiresAt?: string | null | undefined;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({
  isOpen,
  onClose,
  onRecharged: _onRecharged,
  currentPlan = 'FREE',
  planExpiresAt,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPro = currentPlan === 'PRO';

  const handleSubscribePro = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/store/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.checkoutUrl) {
        setErrorMessage(
          data?.message || 'Impossible d’initialiser le paiement. Veuillez réessayer.',
        );
        setIsProcessing(false);
        return;
      }

      // Redirect merchant to Moneriz secure checkout session (Wave / Orange Money)
      window.location.href = data.checkoutUrl;
    } catch {
      setErrorMessage('Erreur réseau. Vérifiez votre connexion.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-[#E5E9F0] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF4FF] text-[#1E60F8] text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Offre Marchand Juula</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            {isPro ? 'Votre Abonnement Juula Pro' : 'Passez au Plan Juula Pro'}
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-sm mx-auto">
            {isPro
              ? 'Profitez de la puissance maximale de Juula Store sans aucune limite.'
              : 'Débloquez le paiement à la livraison, les pixels publicitaires et vendez sans aucune limite.'}
          </p>
        </div>

        {/* Pricing Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white shadow-xl relative overflow-hidden mb-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#38BDF8] block">
                Formule Tout Inclus
              </span>
              <h3 className="text-xl font-black text-white mt-0.5">Plan Juula Pro</h3>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {formatNumber(PRO_PLAN_PRICE_FCFA)}{' '}
                <span className="text-sm font-semibold text-white/80">FCFA</span>
              </span>
              <span className="block text-[11px] text-white/70">/ mois</span>
            </div>
          </div>

          <div className="my-4 border-t border-white/10" />

          {/* Features Comparison Highlights */}
          <ul className="space-y-2.5 text-xs">
            <li className="flex items-center gap-2.5 text-white/95">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>
                <strong>Produits illimités</strong> (Plan Gratuit limité à 1 produit)
              </span>
            </li>
            <li className="flex items-center gap-2.5 text-white/95">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>
                <strong>Paiement à la livraison (Espèces) débloqué</strong>
              </span>
            </li>
            <li className="flex items-center gap-2.5 text-white/95">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>
                <strong>0% de commission Juula</strong> (0 F sur le cash, seuls 5% télécom sur
                Wave/OM)
              </span>
            </li>
            <li className="flex items-center gap-2.5 text-white/95">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>
                <strong>Pixels Facebook & TikTok débloqués</strong> pour tracker vos pubs
              </span>
            </li>
            <li className="flex items-center gap-2.5 text-white/95">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>
                <strong>Sous-domaine personnalisé</strong> (
                <span className="text-[#38BDF8]">boutique.juula.store</span>)
              </span>
            </li>
          </ul>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/70">
            <span>Paiement sécurisé Wave & OM</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> Sans engagement
            </span>
          </div>
        </div>

        {/* Current Status Box if already Pro */}
        {isPro && planExpiresAt && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-emerald-900">Votre abonnement Pro est actif</p>
              <p className="text-emerald-700">
                Valable jusqu’au{' '}
                {new Intl.DateTimeFormat('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date(planExpiresAt))}
                .
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-3">
          <button
            onClick={handleSubscribePro}
            disabled={isProcessing}
            className="w-full py-4 px-6 rounded-2xl bg-[#1E60F8] hover:bg-[#164ED0] active:scale-[0.98] text-white font-black text-sm tracking-tight flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(30,96,248,0.4)] transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <span>Redirection vers le paiement sécurisé...</span>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white text-white" />
                <span>
                  {isPro
                    ? 'Prolonger mon abonnement Pro (6 000 FCFA)'
                    : 'Activer Juula Pro maintenant (6 000 FCFA)'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-[#64748B]">
            Paiement direct par <strong>Wave</strong> ou <strong>Orange Money</strong>. Activation
            immédiate après règlement.
          </p>
        </div>
      </div>
    </div>
  );
};
