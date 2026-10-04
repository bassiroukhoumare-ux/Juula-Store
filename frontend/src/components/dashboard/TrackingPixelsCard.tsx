'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Radar, Save } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import {
  isValidFacebookPixelId,
  isValidTiktokPixelId,
  normalizeFacebookPixelId,
  normalizeTiktokPixelId,
  type StorePixels,
} from '@/lib/store/pixels';

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#1877F2" aria-hidden="true">
    <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
  </svg>
);

const TiktokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#0F172A" aria-hidden="true">
    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

/** Settings card: Meta (Facebook) + TikTok pixel IDs for all product pages. */
export const TrackingPixelsCard: React.FC = () => {
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ store: StorePixels }>('/api/store')
      .then(({ store }) => {
        setFacebook(store.facebookPixelId ?? '');
        setTiktok(store.tiktokPixelId ?? '');
      })
      .catch(() => setError('Impossible de charger vos pixels.'))
      .finally(() => setLoading(false));
  }, []);

  const fbValue = normalizeFacebookPixelId(facebook);
  const ttValue = normalizeTiktokPixelId(tiktok);
  const fbInvalid = fbValue !== '' && !isValidFacebookPixelId(fbValue);
  const ttInvalid = ttValue !== '' && !isValidTiktokPixelId(ttValue);

  const handleSave = async () => {
    if (fbInvalid || ttInvalid) return;
    setSaving(true);
    setError(null);
    try {
      const { store } = await api<{ store: StorePixels }>('/api/store', {
        method: 'PUT',
        body: { facebookPixelId: fbValue, tiktokPixelId: ttValue },
      });
      setFacebook(store.facebookPixelId ?? '');
      setTiktok(store.tiktokPixelId ?? '');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const message =
        err instanceof ApiError ? (err.body.message as string | undefined) : undefined;
      setError(message ?? "L'enregistrement a échoué. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (invalid: boolean) =>
    `w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border text-xs font-mono font-semibold text-[#0F172A] focus:outline-none focus:bg-white ${
      invalid ? 'border-red-400 focus:border-red-500' : 'border-[#E2E8F0] focus:border-[#1E60F8]'
    }`;

  return (
    <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
        <div className="w-8 h-8 rounded-xl bg-[#FDF2F8] text-[#DB2777] flex items-center justify-center">
          <Radar className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-black text-[#0F172A]">Pixels de suivi publicitaire</h3>
          <p className="text-[11px] text-[#64748B]">
            Mesurez vos publicités Facebook / Instagram et TikTok : visites, ouvertures du
            formulaire et commandes sont envoyées automatiquement depuis toutes vos pages produits.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A] mb-1">
              <FacebookIcon /> ID du Pixel Meta (Facebook)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              className={inputClass(fbInvalid)}
              placeholder="Ex : 1234567890123456"
            />
            <p
              className={`text-[10px] mt-1 ${fbInvalid ? 'text-red-600 font-semibold' : 'text-[#94A3B8]'}`}
            >
              {fbInvalid
                ? 'Uniquement des chiffres (15 à 16 en général).'
                : 'Gestionnaire d’événements Meta → Sources de données → votre Pixel.'}
            </p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A] mb-1">
              <TiktokIcon /> ID du Pixel TikTok
            </label>
            <input
              type="text"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              className={inputClass(ttInvalid)}
              placeholder="Ex : C4ABCDEFGH1234567890"
            />
            <p
              className={`text-[10px] mt-1 ${ttInvalid ? 'text-red-600 font-semibold' : 'text-[#94A3B8]'}`}
            >
              {ttInvalid
                ? 'Lettres majuscules et chiffres uniquement.'
                : 'TikTok Ads Manager → Outils → Événements → Web → votre Pixel.'}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <p className="text-[10px] text-[#94A3B8]">
          Événements envoyés : PageView, ViewContent, InitiateCheckout, Purchase (Meta) ·
          PlaceAnOrder, CompletePayment (TikTok). Laissez vide pour désactiver.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving || fbInvalid || ttInvalid}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#1E60F8] hover:bg-[#164ED0] text-white text-xs font-black transition-all cursor-pointer disabled:opacity-50 shrink-0"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Pixels enregistrés !' : 'Enregistrer les pixels'}
        </button>
      </div>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
};
