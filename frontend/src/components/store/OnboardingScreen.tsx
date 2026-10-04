'use client';

import React, { useCallback, useState } from 'react';
import { ArrowRight, Globe, Loader2, Store } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import { SubdomainField, type SubdomainStatus } from '@/components/store/SubdomainField';
import { normalizeSubdomain, ROOT_DOMAIN } from '@/lib/store/subdomain';

export interface StoreProfile {
  name: string | null;
  subdomain: string | null;
  plan?: 'FREE' | 'PRO';
  planExpiresAt?: string | null;
}

interface OnboardingScreenProps {
  email?: string | undefined;
  onDone: (profile: StoreProfile) => void;
}

/** First sign-in: the merchant names the store and picks <shop>.juula.store. */
export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ email, onDone }) => {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subEdited, setSubEdited] = useState(false);
  const [status, setStatus] = useState<SubdomainStatus>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onStatusChange = useCallback((s: SubdomainStatus) => setStatus(s), []);
  const sub = normalizeSubdomain(subdomain);
  const canSubmit = name.trim().length >= 2 && status === 'available' && !saving;

  const handleName = (value: string) => {
    setName(value);
    // Suggest the address from the name until the merchant edits it.
    if (!subEdited) setSubdomain(normalizeSubdomain(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const { store } = await api<{ store: StoreProfile }>('/api/store/profile', {
        method: 'PATCH',
        body: { name: name.trim(), subdomain: sub },
      });
      onDone(store);
    } catch (err) {
      setError(
        err instanceof ApiError && typeof err.body.message === 'string'
          ? err.body.message
          : 'La création de la boutique a échoué. Réessayez.',
      );
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-7">
          <JuulaLogo height={44} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] bg-white border border-[#E6EAF2] shadow-[0_30px_60px_-30px_rgba(32,29,29,0.25)] overflow-hidden"
        >
          <div className="h-1.5 bg-[#235BF7]" />
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#235BF7] bg-[#EEF3FF] px-2.5 py-1 rounded-full">
                Étape finale
              </span>
              <h1 className="mt-3 text-2xl sm:text-[28px] font-black tracking-tight text-[#201D1D]">
                Créons votre boutique
              </h1>
              <p className="text-sm text-[#6B7280] mt-1.5">
                {email ? (
                  <>
                    Connecté en tant que <strong className="text-[#201D1D]">{email}</strong>.{' '}
                  </>
                ) : null}
                Vous pourrez modifier ces informations plus tard dans les Paramètres.
              </p>
            </div>

            <div>
              <label
                htmlFor="store-name"
                className="flex items-center gap-2 text-sm font-black text-[#201D1D] mb-2"
              >
                <Store className="w-4 h-4 text-[#235BF7]" /> Nom de votre boutique
              </label>
              <input
                id="store-name"
                type="text"
                value={name}
                maxLength={60}
                autoFocus
                onChange={(e) => handleName(e.target.value)}
                placeholder="Ex : Awa Shop Dakar"
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-[#E2E8F0] focus:border-[#235BF7] focus:ring-4 focus:ring-[#235BF7]/20 text-[15px] font-bold text-[#201D1D] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="store-subdomain"
                className="flex items-center gap-2 text-sm font-black text-[#201D1D] mb-2"
              >
                <Globe className="w-4 h-4 text-[#235BF7]" /> Adresse de votre boutique
              </label>
              <SubdomainField
                id="store-subdomain"
                value={subdomain}
                onChange={(v) => {
                  setSubEdited(true);
                  setSubdomain(v);
                }}
                onStatusChange={onStatusChange}
              />
            </div>

            <div className="rounded-2xl bg-[#F4F6FB] border border-[#E6EAF2] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                Vos clients verront
              </p>
              <p className="mt-1 text-base sm:text-lg font-black text-[#201D1D] break-all">
                {sub || 'ma-boutique'}
                <span className="text-[#235BF7]">.{ROOT_DOMAIN}</span>
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="text-sm font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3 py-2"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-sm font-black shadow-[0_10px_24px_-10px_rgba(35,91,247,0.7)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Créer ma boutique
              {!saving && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
