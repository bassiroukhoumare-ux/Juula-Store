'use client';

import React, { useCallback, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Loader2,
  MapPin,
  MessageCircle,
  Sparkles,
  Store,
  Users,
} from 'lucide-react';
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
  acquisitionSource?: string | null;
}

export interface AiBrandingResult {
  nom_boutique_propose: string;
  slogan_accrocheur: string;
  couleur_hexadecimale: string;
  description_a_propos: string;
  categories_produits_suggerees: string[];
}

export const EMPTY_PROFILE: StoreProfile = {
  name: null,
  subdomain: null,
  logoUrl: null,
  whatsapp: null,
  onlineOnly: false,
  address: null,
  city: null,
  acquisitionSource: null,
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

const ACQUISITION_OPTIONS = [
  {
    id: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    id: 'youtube',
    label: 'YouTube',
    color: '#FF0000',
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    color: '#000000',
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#E4405F',
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    id: 'bouche_a_oreille',
    label: 'Bouche à oreille',
    color: '#16A34A',
    icon: <Users className="w-5 h-5 text-[#16A34A]" />,
  },
  {
    id: 'autre',
    label: 'Autre',
    color: '#6B7280',
    icon: <Sparkles className="w-5 h-5 text-[#6B7280]" />,
  },
] as const;

type Step = 1 | 2 | 3 | 4;

/** Multi-step onboarding: Identity -> Web Address -> Contact & Location -> How did you know us? */
export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  email: _email,
  initial = EMPTY_PROFILE,
  onDone,
}) => {
  const [step, setStep] = useState<Step>(1);

  // Step 1: Identité
  const [name, setName] = useState(initial.name ?? '');
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);

  // Step 2: Adresse web
  const [subdomain, setSubdomain] = useState(initial.subdomain ?? '');
  const [subEdited, setSubEdited] = useState(Boolean(initial.subdomain));
  const [status, setStatus] = useState<SubdomainStatus>('idle');

  // Step 3: Contact & localisation
  const [whatsapp, setWhatsapp] = useState(
    initial.whatsapp ? formatWhatsapp(initial.whatsapp) : '',
  );
  const [onlineOnly, setOnlineOnly] = useState(initial.onlineOnly);
  const [address, setAddress] = useState(initial.address ?? '');
  const [city, setCity] = useState(initial.city ?? 'Dakar');

  // Step 4: Comment nous avez-vous connu ?
  const [acquisitionOption, setAcquisitionOption] = useState<string>('');
  const [customAcquisition, setCustomAcquisition] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assistant IA Branding
  const [aiIdea, setAiIdea] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [brandingResult, setBrandingResult] = useState<AiBrandingResult | null>(null);
  const [showAiAssistant, setShowAiAssistant] = useState(false);

  const handleGenerateBranding = async () => {
    if (!aiIdea.trim()) return;
    setAiGenerating(true);
    try {
      const res = await fetch('/api/store/ai/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIdea: aiIdea.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.branding) {
        setBrandingResult(data.branding);
      }
    } catch {
      // Ignorer l'erreur réseau silencieusement
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyBranding = (b: AiBrandingResult) => {
    handleName(b.nom_boutique_propose);
    setShowAiAssistant(false);
  };

  const onStatusChange = useCallback((s: SubdomainStatus) => setStatus(s), []);
  const sub = normalizeSubdomain(subdomain);
  const whatsappOk = normalizeWhatsapp(whatsapp) !== null;

  // Validation par étape
  const isStep1Valid = Boolean(logoUrl && name.trim().length >= 2);
  const isStep2Valid =
    (status === 'available' || (Boolean(initial.subdomain) && sub === initial.subdomain)) &&
    sub.length >= 1;
  const isStep3Valid = Boolean(whatsappOk && (onlineOnly || address.trim().length >= 3));
  const isStep4Valid = Boolean(
    acquisitionOption && (acquisitionOption !== 'autre' || customAcquisition.trim().length >= 2),
  );

  const isCurrentStepValid =
    step === 1
      ? isStep1Valid
      : step === 2
        ? isStep2Valid
        : step === 3
          ? isStep3Valid
          : isStep4Valid;

  const handleName = (value: string) => {
    setName(value);
    // Suggérer l'adresse web à partir du nom tant que le marchand ne l'a pas modifiée manuellement
    if (!subEdited) setSubdomain(normalizeSubdomain(value));
  };

  const handleNext = () => {
    setError(null);
    if (!isCurrentStepValid) return;
    if (step < 4) {
      setStep((s) => (s + 1) as Step);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep1Valid || !isStep2Valid || !isStep3Valid || !isStep4Valid || saving) return;

    setSaving(true);
    setError(null);

    const finalSource =
      acquisitionOption === 'autre' ? `autre: ${customAcquisition.trim()}` : acquisitionOption;

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
          acquisitionSource: finalSource,
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

  const isFinishing = Boolean(initial.subdomain);

  return (
    <div
      className={`${displayFont.className} min-h-screen bg-[#EDEFF3] flex items-start sm:items-center justify-center px-4 py-8 sm:py-12`}
    >
      <div className="w-full max-w-xl">
        {/* Logo de la plateforme */}
        <div className="flex justify-center mb-6">
          <JuulaLogo height={44} />
        </div>

        <div className="rounded-[28px] bg-white border border-[#E6EAF2] shadow-[0_30px_60px_-30px_rgba(32,29,29,0.25)] overflow-hidden">
          {/* Barre de progression continue */}
          <div className="w-full bg-[#E2E8F0] h-1.5">
            <div
              className="h-full bg-[#235BF7] transition-all duration-300 ease-out"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>

          <div className="p-5 sm:p-8 space-y-7">
            {/* Stepper & Header */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#235BF7] bg-[#EEF3FF] px-3 py-1 rounded-full">
                  Étape {step} sur 4
                </span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((s) => (
                    <span
                      key={s}
                      className={`h-2 rounded-full transition-all ${
                        s === step
                          ? 'w-6 bg-[#235BF7]'
                          : s < step
                            ? 'w-2 bg-[#16A34A]'
                            : 'w-2 bg-[#E2E8F0]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <h1 className="mt-3 text-2xl sm:text-[28px] font-black tracking-tight text-[#201D1D]">
                {step === 1 && 'Identité de votre marque'}
                {step === 2 && 'Adresse de votre boutique'}
                {step === 3 && 'Contact & Localisation'}
                {step === 4 && 'Comment nous avez-vous connu ?'}
              </h1>
              <p className="text-sm text-[#6B7280] mt-1.5">
                {step === 1 &&
                  'Ajoutez le logo et le nom sous lequel vos clients vous reconnaissent.'}
                {step === 2 &&
                  'Définissez le lien unique que vous partagerez sur WhatsApp, TikTok et Instagram.'}
                {step === 3 &&
                  'Où et comment vos acheteurs peuvent vous joindre et recevoir leurs colis.'}
                {step === 4 &&
                  'Dites-nous où vous avez découvert Juula Store pour la première fois.'}
              </p>
            </div>

            <form
              onSubmit={
                step === 4
                  ? handleSubmit
                  : (e) => {
                      e.preventDefault();
                      handleNext();
                    }
              }
            >
              {/* ────────────────── ÉTAPE 1 : IDENTITÉ ────────────────── */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in duration-200">
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
                      autoFocus
                      value={name}
                      maxLength={60}
                      onChange={(e) => handleName(e.target.value)}
                      placeholder="Ex : Awa Shop Dakar"
                      className={inputClass}
                    />
                    <p className="mt-1.5 text-xs text-[#6B7280]">
                      Ce nom apparaîtra sur toutes vos factures, reçus et pages produits.
                    </p>
                  </div>

                  {/* Assistant IA Branding */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-blue-50/70 border border-blue-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#235BF7] text-white flex items-center justify-center shadow-xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        </div>
                        <span className="text-[13px] font-black text-slate-900">
                          Trouvez un nom et une marque avec l'IA
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAiAssistant(!showAiAssistant)}
                        className="text-xs font-bold text-[#235BF7] hover:underline cursor-pointer"
                      >
                        {showAiAssistant ? 'Fermer' : 'Générer avec l’IA'}
                      </button>
                    </div>

                    {showAiAssistant && (
                      <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={aiIdea}
                            onChange={(e) => setAiIdea(e.target.value)}
                            placeholder="Ex : Vente de cosmétiques et sérums à Dakar"
                            className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#235BF7]"
                          />
                          <button
                            type="button"
                            disabled={aiGenerating || !aiIdea.trim()}
                            onClick={handleGenerateBranding}
                            className="px-4 py-2.5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[13px] font-black transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                          >
                            {aiGenerating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            <span>Générer</span>
                          </button>
                        </div>

                        {brandingResult && (
                          <div className="p-3.5 rounded-xl bg-white border border-blue-200/80 space-y-2 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-[#235BF7] block">
                                  Nom suggéré
                                </span>
                                <span className="text-base font-black text-slate-900">
                                  {brandingResult.nom_boutique_propose}
                                </span>
                                <span className="text-xs text-slate-500 italic block mt-0.5">
                                  « {brandingResult.slogan_accrocheur} »
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApplyBranding(brandingResult)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-2xs"
                              >
                                Utiliser ce nom
                              </button>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="font-bold text-slate-400">Couleur :</span>
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block align-middle"
                                style={{ backgroundColor: brandingResult.couleur_hexadecimale }}
                              />
                              <span className="font-mono text-slate-600 font-bold mr-2">
                                {brandingResult.couleur_hexadecimale}
                              </span>
                              <span className="font-bold text-slate-400">Catégories :</span>
                              {brandingResult.categories_produits_suggerees.map((c, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ────────────────── ÉTAPE 2 : ADRESSE WEB ────────────────── */}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div>
                    <label
                      htmlFor="store-subdomain"
                      className="flex items-center gap-2 text-sm font-black text-[#201D1D] mb-2"
                    >
                      <Globe className="w-4 h-4 text-[#235BF7]" /> Adresse de votre boutique en
                      ligne
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
                  </div>

                  <div className="rounded-2xl bg-[#F4F6FB] border border-[#E6EAF2] px-5 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                      Aperçu de votre lien public
                    </p>
                    <p className="mt-1 text-lg font-black text-[#201D1D] break-all">
                      https://{sub || 'ma-boutique'}
                      <span className="text-[#235BF7]">.{ROOT_DOMAIN}</span>
                    </p>
                    <p className="mt-1 text-xs text-[#6B7280]">
                      Accessible 24h/24 pour tous vos clients sur mobile et ordinateur.
                    </p>
                  </div>
                </div>
              )}

              {/* ────────────────── ÉTAPE 3 : CONTACT & LOCALISATION ────────────────── */}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in duration-200">
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
                      autoFocus
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
                        ? 'Format invalide — ex : 77 123 45 67 ou +221 77 123 45 67.'
                        : 'Vos clients vous contactent et reçoivent leurs confirmations sur ce numéro.'}
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
                        Pas de magasin physique : vos clients commandent directement sur votre
                        boutique.
                      </span>
                    </span>
                  </label>

                  {!onlineOnly && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px] pt-1">
                      <div>
                        <label
                          htmlFor="store-address"
                          className="flex items-center gap-2 text-sm font-black text-[#201D1D] mb-2"
                        >
                          <MapPin className="w-4 h-4 text-[#235BF7]" /> Adresse physique
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
                </div>
              )}

              {/* ────────────────── ÉTAPE 4 : COMMENT NOUS AVEZ-VOUS CONNU ? ────────────────── */}
              {step === 4 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    {ACQUISITION_OPTIONS.map((opt) => {
                      const isSelected = acquisitionOption === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setAcquisitionOption(opt.id)}
                          className={`relative flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#235BF7] bg-[#EEF3FF] shadow-sm'
                              : 'border-[#E2E8F0] hover:border-[#CBD5E1] bg-white'
                          }`}
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: isSelected ? 'rgba(35, 91, 247, 0.15)' : '#F4F6FB',
                              color: opt.color,
                            }}
                          >
                            {opt.icon}
                          </div>
                          <span
                            className={`text-sm font-bold ${
                              isSelected ? 'text-[#201D1D]' : 'text-[#374151]'
                            }`}
                          >
                            {opt.label}
                          </span>
                          {isSelected && (
                            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#235BF7] text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {acquisitionOption === 'autre' && (
                    <div className="animate-in fade-in duration-200 pt-1">
                      <label
                        htmlFor="custom-acquisition"
                        className="block text-sm font-black text-[#201D1D] mb-2"
                      >
                        Précisez comment vous nous avez découvert :
                      </label>
                      <input
                        id="custom-acquisition"
                        type="text"
                        autoFocus
                        value={customAcquisition}
                        maxLength={120}
                        onChange={(e) => setCustomAcquisition(e.target.value)}
                        placeholder="Ex : Recherche Google, recommandation d'un ami, podcast..."
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Erreur générale */}
              {error && (
                <p
                  role="alert"
                  className="mt-5 text-sm font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-2.5"
                >
                  {error}
                </p>
              )}

              {/* Boutons d'action (Navigation) */}
              <div className="mt-8 pt-5 border-t border-[#F1F3F6] flex items-center justify-between gap-3">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-[#E2E8F0] hover:border-[#CBD5E1] text-sm font-bold text-[#6B7280] hover:text-[#201D1D] hover:bg-[#F8FAFC] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour</span>
                  </button>
                ) : (
                  <div />
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!isCurrentStepValid}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-sm font-black shadow-[0_10px_24px_-10px_rgba(35,91,247,0.7)] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>Continuer</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!isCurrentStepValid || saving}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-sm font-black shadow-[0_10px_24px_-10px_rgba(35,91,247,0.7)] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{isFinishing ? 'Enregistrer et continuer' : 'Créer ma boutique'}</span>
                    {!saving && <ArrowRight className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Message d'aide si bloqué */}
              {!isCurrentStepValid && !saving && (
                <p className="text-center text-xs text-[#9AA0AB] mt-3">
                  {step === 1 &&
                    (!logoUrl
                      ? 'Ajoutez un logo pour continuer.'
                      : 'Saisissez un nom de boutique.')}
                  {step === 2 && 'Vérifiez la disponibilité de l’adresse pour continuer.'}
                  {step === 3 &&
                    (!whatsappOk
                      ? 'Saisissez un numéro WhatsApp valide.'
                      : 'Indiquez l’adresse physique de votre boutique.')}
                  {step === 4 &&
                    (acquisitionOption === 'autre'
                      ? 'Précisez votre réponse dans le champ texte.'
                      : 'Sélectionnez une option pour finaliser.')}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
