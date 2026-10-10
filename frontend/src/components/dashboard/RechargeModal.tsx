'use client';

// Subscription checkout: one plan card, a term picker (1 / 3 / 6 / 12 months)
// and a currency picker (FCFA / € / $). The amount sent to the server is only
// the term — the server prices it — and the payment is always charged in FCFA.
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, Sparkles, X, Zap } from 'lucide-react';
import {
  SUBSCRIPTION_TERMS,
  displayPrice,
  termMonthlyXof,
  termSavingsPercent,
  type PriceCurrency,
  type SubscriptionMonths,
} from '@/lib/store/plans';
import { formatNumber } from '@/lib/orderUtils';
import { api, ApiError } from '@/lib/api';
import { MonerizCheckoutModal } from '@/components/payments/MonerizCheckoutModal';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecharged?: (creditsAdded: number) => void;
  currentPlan?: 'FREE' | 'PRO' | undefined;
  planExpiresAt?: string | null | undefined;
  /** Currency the merchant displays amounts in (Paramètres → Devise). */
  defaultCurrency?: PriceCurrency | undefined;
}

const CURRENCIES: { id: PriceCurrency; label: string }[] = [
  { id: 'XOF', label: 'FCFA' },
  { id: 'EUR', label: '€ EUR' },
  { id: 'USD', label: '$ USD' },
];

const FEATURES: { strong: string; rest: string }[] = [
  { strong: 'Boutique et pages produits illimitées', rest: 'en ligne sur maboutique.juula.store' },
  { strong: 'Gestion des commandes', rest: 'suivi, statuts et notifications en temps réel' },
  { strong: 'Paiement à la livraison', rest: 'sans commission' },
  { strong: 'Liens de paiement directs', rest: '(Wave Business, Orange Money…)' },
  { strong: 'Bouton « Commander sur WhatsApp »', rest: 'et support WhatsApp' },
  { strong: 'Pixels Facebook & TikTok', rest: 'pour suivre vos publicités' },
];

/** Fallback FCFA per US dollar until /api/fx answers. */
const USD_FALLBACK = 600;

export function formatPrice(value: number, currency: PriceCurrency): string {
  if (currency === 'XOF') return `${formatNumber(value)} FCFA`;
  const n = value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'EUR' ? `${n} €` : `${n} $`;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({
  isOpen,
  onClose,
  onRecharged: _onRecharged,
  currentPlan = 'FREE',
  planExpiresAt,
  defaultCurrency = 'XOF',
}) => {
  const [months, setMonths] = useState<SubscriptionMonths>(1);
  const [currency, setCurrency] = useState<PriceCurrency>(defaultCurrency);
  const [xofPerUsd, setXofPerUsd] = useState(USD_FALLBACK);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [monerizSession, setMonerizSession] =
    useState<React.ComponentProps<typeof MonerizCheckoutModal>['session']>(null);
  const [isMonerizModalOpen, setIsMonerizModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) setCurrency(defaultCurrency);
  }, [isOpen, defaultCurrency]);

  // Live USD rate (EUR is a fixed peg); cached an hour by the API.
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    fetch('/api/fx')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { xofPerUsd?: number } | null) => {
        if (alive && d?.xofPerUsd && d.xofPerUsd > 0) setXofPerUsd(d.xofPerUsd);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [isOpen]);

  const term = useMemo(
    () => SUBSCRIPTION_TERMS.find((t) => t.months === months) ?? SUBSCRIPTION_TERMS[0]!,
    [months],
  );

  if (!isOpen) return null;

  const isPro = currentPlan === 'PRO';
  const savings = termSavingsPercent(term);
  const price = displayPrice(term.priceXof, currency, xofPerUsd);
  const fullPrice = displayPrice(
    SUBSCRIPTION_TERMS[0]!.priceXof * term.months,
    currency,
    xofPerUsd,
  );
  const perMonth =
    currency === 'XOF' ? termMonthlyXof(term) : Math.round((price / term.months) * 100) / 100;
  const xofLabel = formatPrice(term.priceXof, 'XOF');

  const handleSubscribe = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const data = await api<{
        checkoutUrl?: string;
        embedUrl?: string | null;
        integrationMode?: 'iframe' | 'redirect';
        sessionId?: string;
        subscriptionId?: string;
      }>('/api/store/subscription', {
        method: 'POST',
        body: { months, displayCurrency: currency },
      });
      if (!data?.checkoutUrl) {
        setErrorMessage('Impossible d’initialiser le paiement. Veuillez réessayer.');
        setIsProcessing(false);
        return;
      }

      if (data.integrationMode === 'redirect' || !data.embedUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setMonerizSession({
        id: data.sessionId || `sub-${Date.now()}`,
        checkoutUrl: data.checkoutUrl,
        embedUrl: data.embedUrl,
        status: 'open',
        amount: term.priceXof,
        currency: 'XOF',
        reference: data.subscriptionId || 'Abonnement Juula PRO',
      });
      setIsMonerizModalOpen(true);
      setIsProcessing(false);
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError
          ? (err.body?.message as string) || err.message || 'Impossible d’initialiser le paiement.'
          : 'Erreur réseau. Vérifiez votre connexion.',
      );
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sub-title"
        className="relative w-full max-w-lg bg-white border border-[#ECEFF4] rounded-[28px] p-5 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 w-10 h-10 rounded-full text-[#7A808C] hover:text-[#201D1D] hover:bg-[#F1F5F9] flex items-center justify-center transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3FF] text-[#235BF7] text-[13px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Abonnement Juula</span>
          </div>
          <h2
            id="sub-title"
            className="text-2xl sm:text-3xl font-black text-[#201D1D] tracking-tight"
          >
            {isPro ? 'Prolongez votre abonnement' : 'Mettez votre boutique en ligne'}
          </h2>
          <p className="text-[14px] sm:text-[15px] text-[#7A808C] max-w-sm mx-auto">
            Choisissez votre durée : plus elle est longue, plus vous économisez.
          </p>
        </div>

        {/* Term picker */}
        <div role="radiogroup" aria-label="Durée" className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {SUBSCRIPTION_TERMS.map((t) => {
            const active = t.months === months;
            const off = termSavingsPercent(t);
            return (
              <button
                key={t.months}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMonths(t.months)}
                className={`relative min-h-14 px-1 rounded-2xl border-2 text-center transition-colors cursor-pointer ${
                  active
                    ? 'border-[#235BF7] bg-[#EEF3FF] text-[#235BF7]'
                    : 'border-[#ECEFF4] bg-white text-[#201D1D] hover:border-[#BFD0FD]'
                }`}
              >
                <span className="block text-[14px] sm:text-[15px] font-extrabold">{t.label}</span>
                {off > 0 ? (
                  <span className="mt-0.5 inline-block px-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                    -{off}%
                  </span>
                ) : (
                  <span className="mt-0.5 block text-[11px] text-[#7A808C]">mensuel</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Currency picker */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <span id="cur-label" className="text-[13px] font-semibold text-[#7A808C]">
            Devise d’affichage
          </span>
          <div
            role="radiogroup"
            aria-labelledby="cur-label"
            className="inline-flex p-1 rounded-xl bg-[#F1F3F6]"
          >
            {CURRENCIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={currency === c.id}
                onClick={() => setCurrency(c.id)}
                className={`min-h-9 px-3 rounded-lg text-[13px] font-bold transition-colors cursor-pointer ${
                  currency === c.id
                    ? 'bg-white text-[#201D1D] shadow-sm'
                    : 'text-[#7A808C] hover:text-[#201D1D]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plan card */}
        <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-[#201D1D] via-[#1E293B] to-[#201D1D] text-white shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#38BDF8] block">
                {term.label}
              </span>
              <h3 className="text-xl font-black text-white mt-0.5">Abonnement Juula</h3>
            </div>
            <div className="text-right" aria-live="polite">
              {savings > 0 && (
                <span className="block text-[13px] text-white/50 line-through">
                  {currency === 'XOF' ? '' : '≈ '}
                  {formatPrice(fullPrice, currency)}
                </span>
              )}
              <span className="block text-2xl sm:text-3xl font-black text-white">
                {currency === 'XOF' ? '' : '≈ '}
                {formatPrice(price, currency)}
              </span>
              <span className="block text-[13px] text-white/70">
                {term.months === 1 ? 'pour 1 mois' : `soit ${formatPrice(perMonth, currency)}/mois`}
              </span>
            </div>
          </div>

          <div className="my-4 border-t border-white/10" />

          <ul className="space-y-2.5 text-[13px]">
            {FEATURES.map((f) => (
              <li key={f.strong} className="flex items-start gap-2.5 text-white/95">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#10B981] shrink-0" />
                <span>
                  <strong>{f.strong}</strong> {f.rest}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[13px] text-white/70">
            <span>Wave, Orange Money ou carte</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> Sans prélèvement automatique
            </span>
          </div>
        </div>

        {currency !== 'XOF' && (
          <p className="mt-3 text-[13px] text-[#3F4654]">
            Le paiement est débité en FCFA : <strong>{xofLabel}</strong>. Le montant en{' '}
            {currency === 'EUR' ? 'euros' : 'dollars'} est indicatif et peut varier selon votre
            banque.
          </p>
        )}

        {isPro && planExpiresAt && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-[13px] text-emerald-800">
              <strong>Abonnement actif</strong> jusqu’au{' '}
              {new Intl.DateTimeFormat('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date(planExpiresAt))}
              . La durée choisie s’ajoute à ce qu’il vous reste.
            </p>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700"
          >
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleSubscribe()}
          disabled={isProcessing}
          className="mt-5 w-full min-h-14 py-3 px-6 rounded-2xl bg-[#235BF7] hover:bg-[#1B4AD6] active:scale-[0.98] text-white font-black text-[15px] tracking-tight flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(30,96,248,0.4)] transition-all cursor-pointer disabled:opacity-60"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Redirection vers le paiement sécurisé…</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-white text-white" />
              <span>
                {isPro ? `Prolonger de ${term.label}` : 'S’abonner maintenant'} · {xofLabel}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="mt-3 text-center text-[13px] text-[#7A808C]">
          Paiement unique, sans renouvellement automatique. À la fin de la période, vos pages
          passent hors ligne : rien n’est supprimé.
        </p>
      </div>

      <MonerizCheckoutModal
        isOpen={isMonerizModalOpen}
        onClose={() => setIsMonerizModalOpen(false)}
        session={monerizSession}
        onPaymentSuccess={() => {
          setIsMonerizModalOpen(false);
          window.location.href = '/dashboard?sub_status=success';
        }}
      />
    </div>
  );
};
