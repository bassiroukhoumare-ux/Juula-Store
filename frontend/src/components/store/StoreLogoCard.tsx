'use client';

import React, { useState } from 'react';
import { CheckCircle2, ImageIcon, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { LogoUploader } from '@/components/store/LogoUploader';
import type { StoreProfile } from '@/components/store/OnboardingScreen';

interface StoreLogoCardProps {
  profile: StoreProfile;
  onSaved: (profile: StoreProfile) => void;
}

/** Paramètres → Ma boutique: change the store logo (saved as soon as it is uploaded). */
export const StoreLogoCard: React.FC<StoreLogoCardProps> = ({ profile, onSaved }) => {
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (url: string) => {
    const previous = logoUrl;
    setLogoUrl(url);
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { store } = await api<{ store: StoreProfile }>('/api/store/profile', {
        method: 'PATCH',
        body: { logoUrl: url },
      });
      onSaved(store);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setLogoUrl(previous);
      setError(
        err instanceof ApiError && typeof err.body.message === 'string'
          ? err.body.message
          : 'Le logo n’a pas pu être enregistré. Réessayez.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-5">
      <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
        <div className="w-8 h-8 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center">
          <ImageIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-black text-[#201D1D]">Logo de la boutique</h3>
          <p className="text-[13px] text-[#7A808C]">
            Affiché sur votre boutique, vos pages produits et votre tableau de bord.
          </p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-[#235BF7]" />}
        {saved && (
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Enregistré
          </span>
        )}
      </div>
      <LogoUploader
        value={logoUrl}
        onChange={(url) => void save(url)}
        fallback={profile.name ?? 'J'}
        onError={setError}
      />
      <p className="text-[13px] text-[#7A808C]">
        Image carrée conseillée (au moins 400 × 400 px), JPG ou PNG.
      </p>
      {error && <p className="text-[14px] font-semibold text-[#DC2626]">{error}</p>}
    </div>
  );
};
