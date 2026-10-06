'use client';

import React, { useEffect, useState } from 'react';
import { Check, Crown, X } from 'lucide-react';
import { PRO_PLAN_PRICE_FCFA } from '@/lib/store/plans';

interface PublishPlanModalProps {
  open: boolean;
  /** What is being published, e.g. « votre boutique », « cette page produit ». */
  subject: string;
  onClose: () => void;
  /** Opens the subscription payment; publication happens once it is confirmed. */
  onChoosePro: () => void;
}

const INCLUDED = [
  'Votre boutique et toutes vos pages produits en ligne',
  'Lien personnalisé : maboutique.juula.store',
  'Paiement à la livraison et bouton « Commander sur WhatsApp »',
  'Vos liens de paiement directs (Wave Business, Orange Money…)',
  'Pixels Facebook & TikTok, statistiques et notifications',
];

/** « Mettre en ligne » without an active subscription: subscribe, then publish. */
export const PublishPlanModal: React.FC<PublishPlanModalProps> = ({
  open,
  subject,
  onClose,
  onChoosePro,
}) => {
  const [accepted, setAccepted] = useState(false);
  useEffect(() => {
    if (open) setAccepted(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const price = PRO_PLAN_PRICE_FCFA.toLocaleString('fr-FR');

  return (
    <div
      className="fixed inset-0 z-[80] bg-[#201D1D]/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="publish-title" className="text-xl sm:text-2xl font-extrabold text-[#201D1D]">
              Mettre {subject} en ligne
            </h2>
            <p className="mt-1 text-[14px] text-[#7A808C]">
              La création est gratuite. Pour être visible par vos clients, un abonnement est
              nécessaire.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#7A808C] hover:bg-[#F6F7F9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 p-5 rounded-[22px] bg-[#201D1D] text-white">
          <p className="text-[15px] font-bold flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-300" /> Abonnement Juula
          </p>
          <p className="mt-1 text-3xl font-extrabold">
            {price} <span className="text-[15px] font-semibold text-white/70">FCFA / mois</span>
          </p>
          <ul className="mt-4 space-y-2.5">
            {INCLUDED.map((p) => (
              <li key={p} className="flex gap-2 text-[14px] text-white/85">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-white/60">
            Option : recevez aussi les paiements en ligne par Mobile Money avec JuulaPay (7,5 % par
            paiement), à activer quand vous voulez dans Boutique → Paiements.
          </p>
        </div>

        <label className="mt-4 flex items-start gap-3 p-4 rounded-2xl border border-[#E3E7EE] cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-[#235BF7] shrink-0"
          />
          <span className="text-[14px] text-[#201D1D]">
            J’ai lu et j’accepte les{' '}
            <a
              href="/conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#235BF7] underline underline-offset-2"
            >
              conditions générales d’utilisation
            </a>
            . Sans renouvellement après 30 jours, mes pages passent hors ligne (rien n’est
            supprimé).
          </span>
        </label>

        <button
          type="button"
          disabled={!accepted}
          onClick={onChoosePro}
          className="mt-4 w-full h-12 rounded-full bg-[#235BF7] hover:bg-[#1B4AD6] disabled:bg-[#C9D3EA] text-white text-[15px] font-semibold cursor-pointer disabled:cursor-not-allowed"
        >
          Payer {price} FCFA et mettre en ligne
        </button>
        <p className="mt-2 text-center text-[13px] text-[#7A808C]">
          Paiement sécurisé par Wave, Orange Money ou carte. La mise en ligne se fait dès la
          confirmation du paiement.
        </p>
      </div>
    </div>
  );
};
