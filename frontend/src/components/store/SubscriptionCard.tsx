'use client';

import React from 'react';
import { CalendarClock, Check, Crown, ShieldCheck, Smartphone } from 'lucide-react';
import { PRO_PLAN_PRICE_FCFA } from '@/lib/store/plans';

interface SubscriptionCardProps {
  plan: 'FREE' | 'PRO';
  planExpiresAt?: string | null | undefined;
  /** Opens the JuulaPay checkout of the Pro subscription. */
  onSubscribe: () => void;
}

const price = PRO_PLAN_PRICE_FCFA.toLocaleString('fr-FR');

const INCLUDED = [
  'Votre boutique et toutes vos pages produits en ligne',
  'Lien personnalisé : maboutique.juula.store',
  'Paiement à la livraison et bouton « Commander sur WhatsApp »',
  'Vos liens de paiement directs (Wave Business, Orange Money…)',
  'Pixels Facebook & TikTok, statistiques et notifications',
];

const STEPS = [
  {
    title: 'Vous payez en ligne',
    text: `${price} FCFA par Wave, Orange Money ou carte, sur la page de paiement sécurisée JuulaPay.`,
  },
  {
    title: 'Vos pages passent en ligne',
    text: 'Pour 30 jours, dès la confirmation du paiement. Vous recevez un email de confirmation.',
  },
  {
    title: 'Aucun prélèvement automatique',
    text: 'Vous prolongez quand vous voulez : 30 jours sont ajoutés à vos jours restants, rien n’est perdu.',
  },
  {
    title: 'À l’échéance sans prolongation',
    text: 'Votre boutique et vos pages passent hors ligne. Produits, commandes et solde sont conservés : tout revient dès le renouvellement.',
  },
];

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Paramètres → Abonnement: online status, what the subscription includes, how billing works. */
export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  plan,
  planExpiresAt,
  onSubscribe,
}) => {
  const isPro = plan === 'PRO';
  const expires = planExpiresAt ? new Date(planExpiresAt) : null;
  const daysLeft = expires
    ? Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="space-y-5">
      {/* Current plan */}
      <div
        className={`p-5 sm:p-6 rounded-[28px] border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isPro ? 'bg-[#201D1D] text-white border-[#201D1D]' : 'bg-white border-[#ECEFF4]'
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isPro ? 'bg-white/10 text-amber-300' : 'bg-[#EEF3FF] text-[#235BF7]'
            }`}
          >
            {isPro ? <Crown className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </span>
          <div>
            <p
              className={`text-[13px] font-semibold ${isPro ? 'text-white/70' : 'text-[#7A808C]'}`}
            >
              Abonnement Juula
            </p>
            <p className="text-xl font-extrabold">
              {isPro ? 'Actif · vos pages sont en ligne' : 'Inactif · vos pages sont hors ligne'}
            </p>
            <p className={`text-[14px] ${isPro ? 'text-white/80' : 'text-[#7A808C]'}`}>
              {isPro
                ? expires
                  ? `Active jusqu’au ${dateFmt.format(expires)} · ${daysLeft} jour${daysLeft === 1 ? '' : 's'} restant${daysLeft === 1 ? '' : 's'}`
                  : 'Active, sans date d’échéance.'
                : `Abonnez-vous pour mettre votre boutique et vos pages produits en ligne : ${price} FCFA / mois.`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSubscribe}
          className={`shrink-0 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full text-[15px] font-semibold cursor-pointer ${
            isPro
              ? 'bg-white text-[#201D1D] hover:bg-white/90'
              : 'bg-[#235BF7] text-white hover:bg-[#1B4AD6]'
          }`}
        >
          {isPro ? <CalendarClock className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
          {isPro ? `Prolonger de 30 jours · ${price} FCFA` : `M’abonner · ${price} FCFA / mois`}
        </button>
      </div>

      {/* Included */}
      <div className="p-5 sm:p-6 rounded-[28px] bg-white border border-[#ECEFF4]">
        <h3 className="text-[16px] font-extrabold text-[#201D1D]">
          Ce que comprend l’abonnement · {price} FCFA / mois
        </h3>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {INCLUDED.map((item) => (
            <li key={item} className="flex gap-2.5 text-[14px] text-[#3F4654]">
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" strokeWidth={3} />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-5 p-4 rounded-2xl bg-[#F7F9FF] border border-[#DFE8FF] flex gap-3">
          <Smartphone className="w-5 h-5 shrink-0 text-[#235BF7]" />
          <p className="text-[14px] text-[#3F4654]">
            <strong className="text-[#201D1D]">Option paiement en ligne (JuulaPay)</strong> : vos
            clients paient par Mobile Money ou carte. 7,5 % sont prélevés sur chaque paiement en
            ligne, retrait vers Wave / Orange Money 72 h après la commande. À activer ou désactiver
            dans Boutique → Paiements. Paiement à la livraison et WhatsApp : aucune commission.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="p-5 sm:p-6 rounded-[28px] bg-white border border-[#ECEFF4]">
        <h3 className="text-[16px] font-extrabold text-[#201D1D]">
          Comment fonctionne l’abonnement
        </h3>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <li key={step.title} className="p-4 rounded-2xl bg-[#F6F7F9] flex gap-3">
              <span className="w-8 h-8 rounded-full bg-[#235BF7] text-white text-[14px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span>
                <span className="block text-[15px] font-bold text-[#201D1D]">{step.title}</span>
                <span className="block mt-0.5 text-[14px] text-[#3F4654]">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
