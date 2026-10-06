'use client';

import React, { useCallback, useState } from 'react';
import { CheckCircle2, ExternalLink, Globe, Loader2, Save } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { SubdomainField, type SubdomainStatus } from '@/components/store/SubdomainField';
import type { StoreProfile } from '@/components/store/OnboardingScreen';
import { normalizeSubdomain, storeOrigin } from '@/lib/store/subdomain';

interface StoreAddressCardProps {
  profile: StoreProfile;
  onSaved: (profile: StoreProfile) => void;
}

/** Paramètres → store name + public address (<shop>.juula.store). */
export const StoreAddressCard: React.FC<StoreAddressCardProps> = ({ profile, onSaved }) => {
  const [name, setName] = useState(profile.name ?? '');
  const [subdomain, setSubdomain] = useState(profile.subdomain ?? '');
  const [status, setStatus] = useState<SubdomainStatus>('idle');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onStatusChange = useCallback((s: SubdomainStatus) => setStatus(s), []);

  const sub = normalizeSubdomain(subdomain);
  const changed = name.trim() !== (profile.name ?? '') || sub !== (profile.subdomain ?? '');
  const subChanged = sub !== (profile.subdomain ?? '');
  const canSave = changed && name.trim().length >= 2 && status === 'available' && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const { store } = await api<{ store: StoreProfile }>('/api/store/profile', {
        method: 'PATCH',
        body: { name: name.trim(), ...(subChanged ? { subdomain: sub } : {}) },
      });
      onSaved(store);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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
    <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-5">
      <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
        <div className="w-8 h-8 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center">
          <Globe className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-black text-[#201D1D]">Ma boutique en ligne</h3>
          <p className="text-[13px] text-[#7A808C]">Le nom et l’adresse que voient vos clients.</p>
        </div>
        {profile.subdomain && (
          <a
            href={storeOrigin(profile.subdomain)}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[13px] font-bold text-[#201D1D]"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Voir ma boutique
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        <div>
          <label
            htmlFor="settings-store-name"
            className="block text-[13px] font-bold text-[#201D1D] mb-1.5"
          >
            Nom de la boutique
          </label>
          <input
            id="settings-store-name"
            type="text"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-[#E2E8F0] focus:border-[#235BF7] focus:ring-4 focus:ring-[#235BF7]/20 text-[15px] font-bold text-[#201D1D] focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="settings-store-sub"
            className="block text-[13px] font-bold text-[#201D1D] mb-1.5"
          >
            Adresse de la boutique
          </label>
          <SubdomainField
            id="settings-store-sub"
            value={subdomain}
            onChange={setSubdomain}
            onStatusChange={onStatusChange}
            current={profile.subdomain}
          />
        </div>
      </div>

      {subChanged && profile.subdomain && sub && (
        <p className="text-[13px] text-[#B45309] bg-[#FFF7E6] border border-[#FDE7C2] rounded-xl px-3 py-2">
          Les liens déjà partagés avec <strong>{profile.subdomain}</strong> redirigeront
          automatiquement vers <strong>{sub}</strong>.
        </p>
      )}
      {error && <p className="text-[13px] font-semibold text-[#DC2626]">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[13px] font-black disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
};
