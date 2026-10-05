'use client';

import React, { useEffect, useState } from 'react';
import { Check, IdCard, Loader2, Wallet } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { formatSenegalPhone } from '@/lib/store/sn-phone';

interface PayoutAccounts {
  legalName: string | null;
  wavePhone: string | null;
  orangePhone: string | null;
}

interface PayoutAccountsCardProps {
  /** A withdrawal PIN exists: it is required to change the accounts. */
  pinRequired: boolean;
}

const METHODS = [
  { id: 'wave' as const, label: 'Wave', logo: '/brands/wave.png' },
  { id: 'orange' as const, label: 'Orange Money', logo: '/brands/orange-money.png' },
];

/** Paramètres → Moyens de retrait: Wave and/or Orange Money + legal name. */
export const PayoutAccountsCard: React.FC<PayoutAccountsCardProps> = ({ pinRequired }) => {
  const [loading, setLoading] = useState(true);
  const [legalName, setLegalName] = useState('');
  const [enabled, setEnabled] = useState({ wave: false, orange: false });
  const [phones, setPhones] = useState({ wave: '', orange: '' });
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<{ accounts: PayoutAccounts }>('/api/store/payout-accounts')
      .then(({ accounts }) => {
        setLegalName(accounts.legalName ?? '');
        setEnabled({ wave: Boolean(accounts.wavePhone), orange: Boolean(accounts.orangePhone) });
        setPhones({
          wave: formatSenegalPhone(accounts.wavePhone),
          orange: formatSenegalPhone(accounts.orangePhone),
        });
      })
      .catch(() => setError('Impossible de charger vos moyens de retrait.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { accounts } = await api<{ accounts: PayoutAccounts }>('/api/store/payout-accounts', {
        method: 'PUT',
        body: {
          legalName,
          wavePhone: enabled.wave ? phones.wave : null,
          orangePhone: enabled.orange ? phones.orange : null,
          ...(pinRequired ? { pin } : {}),
        },
      });
      setPhones({
        wave: formatSenegalPhone(accounts.wavePhone),
        orange: formatSenegalPhone(accounts.orangePhone),
      });
      setLegalName(accounts.legalName ?? '');
      setPin('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(
        err instanceof ApiError && typeof err.body.message === 'string'
          ? err.body.message
          : 'L’enregistrement a échoué. Réessayez.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={save}
      className="p-5 sm:p-6 rounded-[28px] bg-white border border-[#ECEFF4] space-y-5"
    >
      <div className="flex items-center gap-3 pb-3 border-b border-[#F1F5F9]">
        <div className="w-10 h-10 rounded-2xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#201D1D]">Moyens de retrait</h3>
          <p className="text-[13px] text-[#7A808C]">
            Vos retraits sont envoyés uniquement sur ces numéros, à votre nom.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[#235BF7]" />
        </div>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[#201D1D]">
              <IdCard className="w-4 h-4 text-[#235BF7]" />
              Nom complet (comme sur votre pièce d’identité) *
            </span>
            <input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              maxLength={100}
              autoComplete="name"
              placeholder="Ex : Awa Ndiaye"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E7EE] bg-[#F6F7F9] text-[14px] text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white"
            />
            <span className="block text-[13px] text-[#7A808C]">
              Obligatoire pour retirer : il doit correspondre au titulaire du compte Mobile Money.
            </span>
          </label>

          <div className="space-y-2.5">
            <p className="text-[14px] font-semibold text-[#201D1D]">
              Où recevoir vos retraits ? (un ou les deux)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {METHODS.map((m) => {
                const on = enabled[m.id];
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border-2 p-3.5 transition-colors ${
                      on ? 'border-[#235BF7] bg-[#F7F9FF]' : 'border-[#E3E7EE] bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setEnabled((cur) => ({ ...cur, [m.id]: !cur[m.id] }))}
                      aria-pressed={on}
                      className="w-full flex items-center gap-3 cursor-pointer text-left"
                    >
                      <img
                        src={m.logo}
                        alt=""
                        className="w-10 h-10 rounded-xl object-contain bg-white border border-[#ECEFF4] p-1"
                      />
                      <span className="flex-1 font-bold text-[15px] text-[#201D1D]">{m.label}</span>
                      <span
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          on ? 'bg-[#235BF7] border-[#235BF7] text-white' : 'border-[#D5DAE2]'
                        }`}
                      >
                        {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                    {on && (
                      <input
                        type="tel"
                        inputMode="tel"
                        value={phones[m.id]}
                        onChange={(e) => setPhones((cur) => ({ ...cur, [m.id]: e.target.value }))}
                        placeholder={`Numéro ${m.label} (ex : 77 123 45 67)`}
                        className="mt-3 w-full px-3.5 py-2.5 rounded-xl border border-[#E3E7EE] bg-white text-[14px] text-[#201D1D] focus:outline-none focus:border-[#235BF7]"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {pinRequired && (
            <label className="block space-y-1.5 max-w-xs">
              <span className="text-[14px] font-semibold text-[#201D1D]">
                Code PIN de retrait (pour confirmer)
              </span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E7EE] bg-[#F6F7F9] text-[14px] tracking-[0.3em] text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white"
              />
            </label>
          )}

          {error && <p className="text-[14px] font-semibold text-[#DC2626]">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] disabled:opacity-60 text-white text-[14px] font-semibold cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saved ? 'Enregistré' : 'Enregistrer mes moyens de retrait'}
          </button>
        </>
      )}
    </form>
  );
};
