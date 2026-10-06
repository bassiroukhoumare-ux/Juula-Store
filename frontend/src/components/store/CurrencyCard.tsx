'use client';

import React, { useState } from 'react';
import { Check, Coins, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { DISPLAY_CURRENCIES, formatMoney, type DisplayCurrency } from '@/lib/money';
import type { StoreProfile } from '@/components/store/OnboardingScreen';

interface CurrencyCardProps {
  profile: StoreProfile;
  onSaved: (profile: StoreProfile) => void;
}

/** Paramètres → currency used to DISPLAY amounts (dashboard + sales pages). */
export const CurrencyCard: React.FC<CurrencyCardProps> = ({ profile, onSaved }) => {
  const current: DisplayCurrency = profile.displayCurrency ?? 'XOF';
  const [saving, setSaving] = useState<DisplayCurrency | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (currency: DisplayCurrency) => {
    if (currency === current || saving) return;
    setSaving(currency);
    setError(null);
    try {
      const { store } = await api<{ store: StoreProfile }>('/api/store/profile', {
        method: 'PATCH',
        body: { displayCurrency: currency },
      });
      onSaved(store);
    } catch (err) {
      setError(
        err instanceof ApiError && typeof err.body.message === 'string'
          ? err.body.message
          : 'Le changement de devise a échoué. Réessayez.',
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-[#F1F5F9]">
        <div className="w-10 h-10 rounded-2xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center">
          <Coins className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#201D1D]">Devise d’affichage</h3>
          <p className="text-sm text-[#7A808C]">
            Les montants du tableau de bord et de vos pages de vente s’affichent dans cette devise.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {DISPLAY_CURRENCIES.map((c) => {
          const active = c.id === current;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => void choose(c.id)}
              disabled={saving !== null}
              className={`relative text-left p-4 rounded-2xl border-2 transition-all cursor-pointer disabled:cursor-wait ${
                active
                  ? 'border-[#235BF7] bg-[#EEF3FF]'
                  : 'border-[#E3E7EE] hover:border-[#235BF7]/50 hover:bg-[#F6F7F9]'
              }`}
            >
              <span className="block text-2xl font-extrabold text-[#201D1D]">{c.symbol}</span>
              <span className="block mt-1 text-[15px] font-semibold text-[#3F4654]">{c.label}</span>
              <span className="block mt-1 text-[13px] text-[#7A808C]">
                ex : {formatMoney(15000, c.id)}
              </span>
              {active && (
                <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#235BF7] text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
              {saving === c.id && (
                <Loader2 className="absolute top-3 right-3 w-5 h-5 animate-spin text-[#235BF7]" />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[13px] text-[#7A808C] leading-relaxed">
        Vos prix restent enregistrés en FCFA et vos clients sont toujours débités en FCFA : seule
        l’affichage change. Euro : parité fixe (1 € = 655,957 FCFA) · Dollar : taux du jour.
      </p>
      {error && <p className="text-[15px] font-semibold text-[#DC2626]">{error}</p>}
    </div>
  );
};
