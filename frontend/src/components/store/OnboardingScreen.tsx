'use client';

import React, { useCallback, useState } from 'react';
import { ArrowRight, Globe, Loader2, MapPin, MessageCircle, Store } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import { displayFont } from '@/app/fonts';
import { LogoUploader } from '@/components/store/LogoUploader';
import { SubdomainField, type SubdomainStatus } from '@/components/store/SubdomainField';
import { normalizeSubdomain, ROOT_DOMAIN } from '@/lib/store/subdomain';
import { formatWhatsapp, normalizeWhatsapp } from '@/lib/store/whatsapp';

export interface StoreProfile {
  name: string | null;
  subdomain: string | null;
  logoUrl: string | null;
  whatsapp: string | null;
  onlineOnly: boolean;
  address: string | null;
  city: string | null;
  plan?: 'FREE' | 'PRO';
  displayCurrency?: 'XOF' | 'EUR' | 'USD';
  planExpiresAt?: string | null;
}

export const EMPTY_PROFILE: StoreProfile = {
  name: null,
  subdomain: null,
  logoUrl: null,
  whatsapp: null,
  onlineOnly: false,
  address: null,
  city: null,
};

/** Everything onboarding asks for is filled in. */
export function isProfileComplete(p: StoreProfile): boolean {
  return Boolean(p.subdomain && p.name && p.logoUrl && p.whatsapp && (p.onlineOnly || p.address));
}

interface OnboardingScreenProps {
  email?: string | undefined;
  /** Existing (incomplete) profile to finish, if any. */
  initial?: StoreProfile;
  onDone: (profile: StoreProfile) => void;
}

const inputClass =
  'w-full px-4 py-3.5 rounded-2xl border-2 border-[#E2E8F0] focus:border-[#235BF7] focus:ring-4 focus:ring-[#235BF7]/20 text-[15px] font-bold text-[#201D1D] focus:outline-none transition-all';

/** First sign-in: the merchant sets up the store identity. */
export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  email,
  initial = EMPTY_PROFILE,
  onDone,
}) => {
  const [name, setName] = useState(initial.name ?? '');
  const [subdomain, setSubdomain] = useState(initial.subdomain ?? '');
  const [subEdited, setSubEdited] = useState(Boolean(initial.subdomain));
  const [status, setStatus] = useState<SubdomainStatus>('idle');
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [whatsapp, setWhatsapp] = useState(
    initial.whatsapp ? formatWhatsapp(initial.whatsapp) : '',
  );
  const [onlineOnly, setOnlineOnly] = useState(initial.onlineOnly);
  const [address, setAddress] = useState(initial.address ?? '');
  const [city, setCity] = useState(initial.city ?? 'Dakar');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onStatusChange = useCallback((s: SubdomainStatus) => setStatus(s), []);
  const sub = normalizeSubdomain(subdomain);
  const whatsappOk = normalizeWhatsapp(whatsapp) !== null;
  const missing = [
    !logoUrl && 'le logo',
    name.trim().length < 2 && 'le nom',
    status !== 'available' && 'une adresse web disponible',
    !whatsappOk && 'le numéro WhatsApp',
    !onlineOnly && address.trim().length < 3 && 'l’adresse de la boutique',
  ].filter((x): x is string => Boolean(x));
  const canSubmit = missing.length === 0 && !saving;
  const isFinishing = Boolean(initial.subdomain);

  const handleName = (value: string) => {
    setName(value);
    // Suggest the web address from the name until the merchant edits it.
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
        body: {
          name: name.trim(),
          ...(sub !== initial.subdomain ? { subdomain: sub } : {}),
          logoUrl,
          whatsapp,
          onlineOnly,
          address: onlineOnly ? null : address.trim(),
          city: city.trim() || null,
        },
      });
      onDone(store);
    } catch (err) {
      setError(
        err instanceof ApiError && typeof err.body.message === 'string'
          ? err.body.message
          : 'L’enregistrement a échoué. Réessayez.',
      );
      setSaving(false);
    }
  };

  return (
    <div
      className={`${displayFont.className} min-h-screen bg-[#EDEFF3] flex items-start sm:items-center justify-center px-4 py-8 sm:py-12`}
    >
      <div className="w-full max-w-xl">
        <div className="flex justify-center mb-6">
          <JuulaLogo height={44} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] bg-white border border-[#E6EAF2] shadow-[0_30px_60px_-30px_rgba(32,29,29,0.25)] overflow-hidden"
        >
          <div className="h-1.5 bg-[#235BF7]" />
          <div className="p-5 sm:p-8 space-y-7">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#235BF7] bg-[#EEF3FF] px-2.5 py-1 rounded-full">
                {isFinishing ? 'Profil à compléter' : 'Dernière étape'}
              </span>
              <h1 className="mt-3 text-2xl sm:text-[28px] font-black tracking-tight text-[#201D1D]">
                {isFinishing ? 'Complétez votre boutique' : 'Créons votre boutique'}
              </h1>
              <p className="text-sm text-[#6B7280] mt-1.5">
                {email ? (
                  <>
                    Connecté en tant que <strong className="text-[#201D1D]">{email}</strong>.{' '}
                  </>
                ) : null}
                Vous pourrez tout modifier plus tard dans les Paramètres.
              </p>
            </div>

            {/* 1. Identité */}
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#6B7280]">
                1 · Identité
              </h2>
              <LogoUploader
                value={logoUrl}
                onChange={setLogoUrl}
                fallback={name || 'J'}
                onError={setError}
              />
              <div>
                <label
                  htmlFor="store-name"
                  className="flex items-center gap-2 text-sm font-black text-[#201D1D] mb-2"
                >
                  <Store className="w-4 h-4 text-[#235BF7]" /> Nom de la boutique
                </label>
                <input
                  id="store-name"
                  type="text"
                  value={name}
                  maxLength={60}
                  onChange={(e) => handleName(e.target.value)}
                  placeholder="Ex : Awa Shop Dakar"
                  className={inputClass}
                />
              </div>
            </section>

            {/* 2. Adresse web */}
            <section className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#6B7280]">
                2 · Adresse web
              </h2>
              <label
                htmlFor="store-subdomain"
                className="flex items-center gap-2 text-sm font-black text-[#201D1D]"
              >
                <Globe className="w-4 h-4 text-[#235BF7]" /> Adresse de votre boutique en ligne
              </label>
              <SubdomainField
                id="store-subdomain"
                value={subdomain}
                onChange={(v) => {
                  setSubEdited(true);
                  setSubdomain(v);
                }}
                onStatusChange={onStatusChange}
                current={initial.subdomain}
              />
              <div className="rounded-2xl bg-[#F4F6FB] border border-[#E6EAF2] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                  Vos clients verront
                </p>
                <p className="mt-0.5 text-base font-black text-[#201D1D] break-all">
                  {sub || 'ma-boutique'}
                  <span className="text-[#235BF7]">.{ROOT_DOMAIN}</span>
                </p>
              </div>
            </section>

            {/* 3. Contact & localisation */}
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#6B7280]">
                3 · Contact & localisation
              </h2>
              <div>
                <label
                  htmlFor="store-whatsapp"
                  className="flex items-center gap-2 text-sm font-black text-[#201D1D] mb-2"
                >
                  <MessageCircle className="w-4 h-4 text-[#16A34A]" /> Numéro WhatsApp de la
                  boutique
                </label>
                <input
                  id="store-whatsapp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="77 123 45 67"
                  className={inputClass}
                />
                <p
                  className={`mt-1.5 text-xs ${
                    whatsapp && !whatsappOk ? 'text-[#DC2626] font-semibold' : 'text-[#6B7280]'
                  }`}
                >
                  {whatsapp && !whatsappOk
                    ? 'Numéro invalide — ex : 77 123 45 67 ou +221 77 123 45 67.'
                    : 'Vos clients vous contactent et confirment leurs commandes sur ce numéro.'}
                </p>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-2xl border-2 border-[#E2E8F0] has-[:checked]:border-[#235BF7] has-[:checked]:bg-[#EEF3FF] cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={onlineOnly}
                  onChange={(e) => setOnlineOnly(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-[#235BF7] shrink-0"
                />
                <span>
                  <span className="block text-sm font-black text-[#201D1D]">
                    Je vends uniquement en ligne
                  </span>
                  <span className="block text-xs text-[#6B7280] mt-0.5">
                    Pas de boutique physique : vos clients commandent et sont livrés.
                  </span>
                </span>
              </label>

              {!onlineOnly && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px]">
                  <div>
                    <label
                      htmlFor="store-address"
                      className="flex items-center gap-2 text-sm font-black text-[#201D1D] mb-2"
                    >
                      <MapPin className="w-4 h-4 text-[#235BF7]" /> Adresse de la boutique
                    </label>
                    <input
                      id="store-address"
                      type="text"
                      value={address}
                      maxLength={200}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex : Marché Sandaga, Rue 12"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="store-city"
                      className="block text-sm font-black text-[#201D1D] mb-2"
                    >
                      Ville
                    </label>
                    <input
                      id="store-city"
                      type="text"
                      value={city}
                      maxLength={80}
                      onChange={(e) => setCity(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </section>

            {error && (
              <p
                role="alert"
                className="text-sm font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3 py-2"
              >
                {error}
              </p>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-sm font-black shadow-[0_10px_24px_-10px_rgba(35,91,247,0.7)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isFinishing ? 'Enregistrer et continuer' : 'Créer ma boutique'}
                {!saving && <ArrowRight className="w-4 h-4" />}
              </button>
              {missing.length > 0 && !saving && (
                <p className="text-center text-xs text-[#6B7280]">
                  Il manque : {missing.join(', ')}.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
