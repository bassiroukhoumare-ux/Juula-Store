'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  Handshake,
  Loader2,
  Megaphone,
  Pencil,
  Percent,
  Plus,
  Radar,
  ShoppingBag,
  Tag,
  Timer,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { formatFCFA } from '@/lib/orderUtils';
import {
  DEFAULT_ANNOUNCEMENT,
  parseCrossSell,
  promoLabel,
  promoStatus,
  type AnnouncementBar as Bar,
  type AnnouncementStyle,
  type CrossSell,
  type PromoCodeDTO,
  type PromoStatus,
  type PromoType,
} from '@/lib/store/marketing';
import type { StorefrontSettings } from '@/lib/store/storefront-types';
import type { FunnelPageConfig, FunnelPageItem } from '@/types/juula';
import { SectionLayout, type SectionItem } from './SectionLayout';
import { ProductPicker } from './ProductPicker';
import { TrackingPixelsCard } from './TrackingPixelsCard';
import { PartnersPanel } from './PartnersPanel';
import { Dropdown } from '@/components/ui/Dropdown';
import { AnnouncementBar } from '@/components/storefront/AnnouncementBar';
import { SkeletonList } from '@/components/ui/Skeleton';
import { PriceAbTestingCard } from './marketing/PriceAbTestingCard';
import { Split } from 'lucide-react';

export type MarketingSection =
  | 'promos'
  | 'abtest'
  | 'partners'
  | 'pixels'
  | 'annonce'
  | 'crosssell';

const SECTIONS: SectionItem<MarketingSection>[] = [
  { id: 'promos', label: 'Codes promo', icon: <Tag /> },
  { id: 'abtest', label: 'A/B Testing Prix', icon: <Split /> },
  { id: 'partners', label: 'Liens & partenaires', icon: <Handshake /> },
  { id: 'pixels', label: 'Pixels & tracking', icon: <Radar /> },
  { id: 'annonce', label: 'Barre d’annonce', icon: <Megaphone /> },
  { id: 'crosssell', label: 'Produits complémentaires', icon: <ShoppingBag /> },
];

interface MarketingViewProps {
  pages: FunnelPageItem[];
  /** Saves product-level fields (used for cross-sell). */
  onUpdateProduct: (id: string, patch: Partial<FunnelPageConfig>) => void;
  accent?: string | undefined;
}

const INPUT =
  'w-full min-w-0 h-11 px-3.5 rounded-xl border border-[#E3E7EE] bg-[#F6F7F9] text-[15px] text-[#201D1D] placeholder:text-[#9AA0AB] focus:outline-none focus:border-[#235BF7] focus:bg-white';

const errorText = (err: unknown, fallback: string) =>
  err instanceof ApiError && typeof err.body.message === 'string' ? err.body.message : fallback;

const Panel: React.FC<{
  title: string;
  hint?: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, hint, icon, action, children }) => (
  <section className="p-5 sm:p-6 rounded-[28px] bg-white border border-[#ECEFF4] space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <span className="w-10 h-10 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-[17px] font-extrabold text-[#201D1D]">{title}</h3>
          {hint && <p className="text-[14px] text-[#7A808C]">{hint}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const Toggle: React.FC<{ on: boolean; onClick: () => void; label: string; disabled?: boolean }> = ({
  on,
  onClick,
  label,
  disabled = false,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer disabled:opacity-50 ${on ? 'bg-[#235BF7]' : 'bg-[#D5DAE2]'}`}
  >
    <span
      className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : ''}`}
    />
  </button>
);

// ─────────────────────────────────────────────────────────────────────────
// A. Codes promo
// ─────────────────────────────────────────────────────────────────────────
const STATUS_META: Record<PromoStatus, { label: string; cls: string }> = {
  active: { label: 'Actif', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expired: { label: 'Expiré', cls: 'bg-[#F1F3F6] text-[#7A808C] border-[#E3E7EE]' },
  exhausted: { label: 'Épuisé', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  disabled: { label: 'Désactivé', cls: 'bg-[#F1F3F6] text-[#7A808C] border-[#E3E7EE]' },
};

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

interface PromoForm {
  code: string;
  type: PromoType;
  value: string;
  minAmount: string;
  maxUses: string;
  expiresAt: string; // datetime-local
  active: boolean;
}

const EMPTY_FORM: PromoForm = {
  code: '',
  type: 'percent',
  value: '10',
  minAmount: '',
  maxUses: '',
  expiresAt: '',
  active: true,
};

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const PromoEditor: React.FC<{
  initial: PromoCodeDTO | null;
  onClose: () => void;
  onSaved: (code: PromoCodeDTO) => void;
}> = ({ initial, onClose, onSaved }) => {
  const [form, setForm] = useState<PromoForm>(
    initial
      ? {
          code: initial.code,
          type: initial.type,
          value: String(initial.value || ''),
          minAmount: initial.minAmount ? String(initial.minAmount) : '',
          maxUses: initial.maxUses ? String(initial.maxUses) : '',
          expiresAt: toLocalInput(initial.expiresAt),
          active: initial.active,
        }
      : EMPTY_FORM,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<PromoForm>) => setForm((f) => ({ ...f, ...p }));
  const num = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v))));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        code: form.code,
        type: form.type,
        value: form.type === 'free_shipping' ? 0 : (num(form.value) ?? 0),
        minAmount: num(form.minAmount),
        maxUses: num(form.maxUses) || null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        active: form.active,
      };
      const { code } = await api<{ code: PromoCodeDTO }>(
        initial ? `/api/store/promo-codes/${initial.id}` : '/api/store/promo-codes',
        { method: initial ? 'PATCH' : 'POST', body },
      );
      onSaved(code);
    } catch (err) {
      setError(errorText(err, 'L’enregistrement a échoué. Réessayez.'));
    } finally {
      setBusy(false);
    }
  };

  const types: { id: PromoType; label: string; icon: React.ReactNode }[] = [
    { id: 'percent', label: 'Pourcentage', icon: <Percent className="w-4 h-4" /> },
    { id: 'fixed', label: 'Montant fixe', icon: <Tag className="w-4 h-4" /> },
    { id: 'free_shipping', label: 'Livraison offerte', icon: <Truck className="w-4 h-4" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-[80] bg-[#201D1D]/40 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={initial ? 'Modifier le code promo' : 'Nouveau code promo'}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-7 space-y-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-[#201D1D]">
            {initial ? 'Modifier le code promo' : 'Nouveau code promo'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#7A808C] hover:bg-[#F6F7F9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[14px] font-semibold text-[#201D1D]">Code promotionnel *</span>
          <input
            required
            value={form.code}
            onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
            maxLength={30}
            placeholder="Ex : WELCOME10"
            className={`${INPUT} font-bold tracking-wide`}
          />
          <span className="block text-[13px] text-[#7A808C]">
            Lettres et chiffres. Vos clients le saisissent au moment de commander.
          </span>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-[14px] font-semibold text-[#201D1D] mb-2">
            Type de réduction
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {types.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => set({ type: t.id })}
                aria-pressed={form.type === t.id}
                className={`flex flex-col items-center justify-center gap-1 min-h-16 px-2 rounded-2xl border-2 text-[13px] font-semibold text-center cursor-pointer transition-colors ${
                  form.type === t.id
                    ? 'border-[#235BF7] bg-[#F5F8FF] text-[#235BF7]'
                    : 'border-[#E3E7EE] text-[#3F4654] hover:bg-[#F6F7F9]'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          {form.type !== 'free_shipping' && (
            <div className="relative">
              <input
                required
                type="number"
                inputMode="numeric"
                min={1}
                max={form.type === 'percent' ? 100 : undefined}
                value={form.value}
                onChange={(e) => set({ value: e.target.value })}
                aria-label={
                  form.type === 'percent' ? 'Pourcentage de réduction' : 'Montant de la réduction'
                }
                className={`${INPUT} pr-16`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-[#7A808C]">
                {form.type === 'percent' ? '%' : 'FCFA'}
              </span>
            </div>
          )}
          {form.type === 'free_shipping' && (
            <p className="text-[13px] text-[#7A808C]">
              Les frais de livraison de la commande sont offerts.
            </p>
          )}
        </fieldset>

        <fieldset className="space-y-3 p-4 rounded-2xl bg-[#F6F7F9]">
          <legend className="sr-only">Conditions et limites</legend>
          <p className="text-[14px] font-semibold text-[#201D1D]">
            Conditions & limites <span className="font-normal text-[#7A808C]">(optionnelles)</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1 min-w-0">
              <span className="text-[13px] text-[#3F4654]">Minimum d’achat (FCFA)</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={form.minAmount}
                onChange={(e) => set({ minAmount: e.target.value })}
                placeholder="Ex : 15000"
                className={`${INPUT} bg-white`}
              />
            </label>
            <label className="block space-y-1 min-w-0">
              <span className="text-[13px] text-[#3F4654]">Utilisations maximum</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.maxUses}
                onChange={(e) => set({ maxUses: e.target.value })}
                placeholder="Ex : 50"
                className={`${INPUT} bg-white`}
              />
            </label>
            <label className="block space-y-1 min-w-0 sm:col-span-2">
              <span className="text-[13px] text-[#3F4654]">Date et heure d’expiration</span>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => set({ expiresAt: e.target.value })}
                className={`${INPUT} bg-white`}
              />
            </label>
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-[#E3E7EE]">
          <span>
            <span className="block text-[15px] font-semibold text-[#201D1D]">Code actif</span>
            <span className="block text-[13px] text-[#7A808C]">
              Désactivez-le à tout moment sans le supprimer.
            </span>
          </span>
          <Toggle
            on={form.active}
            onClick={() => set({ active: !form.active })}
            label="Code actif"
          />
        </div>

        {error && <p className="text-[14px] font-semibold text-[#DC2626]">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl border border-[#E3E7EE] text-[15px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] disabled:opacity-60 text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {initial ? 'Enregistrer' : 'Créer le code'}
          </button>
        </div>
      </form>
    </div>
  );
};

const PromoCodesPanel: React.FC = () => {
  const [codes, setCodes] = useState<PromoCodeDTO[] | null>(null);
  const [editing, setEditing] = useState<PromoCodeDTO | 'new' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ codes: PromoCodeDTO[] }>('/api/store/promo-codes')
      .then(({ codes }) => setCodes(codes))
      .catch(() => setError('Impossible de charger vos codes promo.'));
  }, []);

  const replace = (c: PromoCodeDTO) =>
    setCodes((cur) => {
      const list = cur ?? [];
      return list.some((x) => x.id === c.id)
        ? list.map((x) => (x.id === c.id ? c : x))
        : [c, ...list];
    });

  const toggle = async (c: PromoCodeDTO) => {
    try {
      const { code } = await api<{ code: PromoCodeDTO }>(`/api/store/promo-codes/${c.id}`, {
        method: 'PATCH',
        body: { active: !c.active },
      });
      replace(code);
    } catch (err) {
      setError(errorText(err, 'La modification a échoué.'));
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/api/store/promo-codes/${id}`, { method: 'DELETE' });
      setCodes((cur) => (cur ?? []).filter((x) => x.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      setError(errorText(err, 'La suppression a échoué.'));
    }
  };

  return (
    <Panel
      title="Codes promo & réductions"
      hint="Pourcentage, montant fixe ou livraison offerte, avec minimum d’achat, nombre d’utilisations et date de fin."
      icon={<Tag className="w-5 h-5" />}
      action={
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nouveau code
        </button>
      }
    >
      {error && <p className="text-[14px] font-semibold text-[#DC2626]">{error}</p>}
      {!codes ? (
        <SkeletonList rows={3} />
      ) : codes.length === 0 ? (
        <div className="py-10 px-4 rounded-2xl border-2 border-dashed border-[#E3E7EE] text-center">
          <Tag className="mx-auto w-8 h-8 text-[#C9D3EA]" />
          <p className="mt-3 text-[16px] font-bold text-[#201D1D]">Aucun code promo</p>
          <p className="mt-1 text-[14px] text-[#7A808C]">
            Créez votre premier code, par exemple WELCOME10 pour -10 % sur la première commande.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {codes.map((c) => {
            const status = promoStatus(c);
            const meta = STATUS_META[status];
            return (
              <li
                key={c.id}
                className="p-4 rounded-2xl border border-[#ECEFF4] grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(c.code);
                        setCopied(c.id);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                      title="Copier le code"
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#201D1D] text-white text-[14px] font-bold tracking-wide cursor-pointer"
                    >
                      {c.code}
                      {copied === c.id ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-white/60" />
                      )}
                    </button>
                    <span className="text-[15px] font-extrabold text-[#235BF7]">
                      {promoLabel(c)}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] text-[#7A808C]">
                    {c.usedCount} utilisation{c.usedCount > 1 ? 's' : ''}
                    {c.maxUses ? ` / ${c.maxUses}` : ''}
                    {c.minAmount ? ` · dès ${formatFCFA(c.minAmount)}` : ''}
                    {c.expiresAt
                      ? ` · jusqu’au ${dateFmt.format(new Date(c.expiresAt))}`
                      : ' · sans date de fin'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Toggle
                    on={c.active}
                    onClick={() => void toggle(c)}
                    label={c.active ? `Désactiver ${c.code}` : `Activer ${c.code}`}
                  />
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    aria-label={`Modifier ${c.code}`}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[#3F4654] hover:bg-[#F1F3F6] cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {confirmDelete === c.id ? (
                    <button
                      type="button"
                      onClick={() => void remove(c.id)}
                      className="h-10 px-3 rounded-xl bg-[#DC2626] text-white text-[13px] font-semibold cursor-pointer"
                    >
                      Supprimer ?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(c.id)}
                      aria-label={`Supprimer ${c.code}`}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <PromoEditor
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(c) => {
            replace(c);
            setEditing(null);
          }}
        />
      )}
    </Panel>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// C. Barre d'annonce
// ─────────────────────────────────────────────────────────────────────────
const STYLES: { id: AnnouncementStyle; label: string; swatch: (accent: string) => string }[] = [
  { id: 'dark', label: 'Noir sobre', swatch: () => '#201D1D' },
  { id: 'accent', label: 'Couleur de la boutique', swatch: (a) => a },
  { id: 'red', label: 'Rouge alerte', swatch: () => '#DC2626' },
];

const AnnouncementPanel: React.FC<{ pages: FunnelPageItem[] }> = ({ pages }) => {
  const [bar, setBar] = useState<Bar | null>(null);
  const [saved, setSaved] = useState<Bar | null>(null);
  const [accent, setAccent] = useState('#235BF7');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ settings: StorefrontSettings }>('/api/store/storefront')
      .then(({ settings }) => {
        setBar(settings.announcement ?? DEFAULT_ANNOUNCEMENT);
        setSaved(settings.announcement ?? DEFAULT_ANNOUNCEMENT);
        setAccent(settings.accent);
      })
      .catch(() => setError('Impossible de charger la barre d’annonce.'));
  }, []);

  const categories = useMemo(
    () =>
      [...new Set(pages.map((p) => p.config.category?.trim()).filter(Boolean) as string[])].sort(),
    [pages],
  );
  const products = pages.filter((p) => p.status === 'published');

  if (!bar) {
    return (
      <Panel title="Barre d’annonce" icon={<Megaphone className="w-5 h-5" />}>
        {error ? <p className="text-[14px] text-[#DC2626]">{error}</p> : <SkeletonList rows={2} />}
      </Panel>
    );
  }
  const set = (p: Partial<Bar>) => setBar({ ...bar, ...p });
  const setCountdown = (p: Partial<Bar['countdown']>) =>
    setBar({ ...bar, countdown: { ...bar.countdown, ...p } });
  const dirty = JSON.stringify(bar) !== JSON.stringify(saved);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { settings } = await api<{ settings: StorefrontSettings }>('/api/store/storefront', {
        method: 'PATCH',
        body: { announcement: bar },
      });
      setBar(settings.announcement);
      setSaved(settings.announcement);
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch (err) {
      setError(errorText(err, 'L’enregistrement a échoué.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Barre d’annonce & urgence"
      hint="Un bandeau fin tout en haut de votre boutique et de vos pages produits, avec un compte à rebours si vous le souhaitez."
      icon={<Megaphone className="w-5 h-5" />}
    >
      {/* Preview */}
      <div className="rounded-2xl overflow-hidden border border-[#ECEFF4]">
        <p className="px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#9AA0AB] bg-[#F6F7F9]">
          Aperçu
        </p>
        {bar.enabled && bar.text.trim() ? (
          <AnnouncementBar bar={{ ...bar }} accent={accent} base="" key={JSON.stringify(bar)} />
        ) : (
          <p className="px-4 py-3 text-[14px] text-[#9AA0AB]">
            Activez la barre et écrivez votre message pour la voir ici.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-[#E3E7EE]">
        <span className="text-[15px] font-semibold text-[#201D1D]">
          Afficher la barre d’annonce en haut du site
        </span>
        <Toggle
          on={bar.enabled}
          onClick={() => set({ enabled: !bar.enabled })}
          label="Afficher la barre"
        />
      </div>

      <label className="block space-y-1.5">
        <span className="text-[14px] font-semibold text-[#201D1D]">Message</span>
        <input
          value={bar.text}
          maxLength={160}
          onChange={(e) => set({ text: e.target.value })}
          placeholder="Ex : ⚡ VENTE FLASH : livraison offerte aujourd’hui dès 20 000 FCFA !"
          className={INPUT}
        />
        <span className="block text-right text-[12px] text-[#9AA0AB]">{bar.text.length} / 160</span>
      </label>

      <div className="space-y-1.5">
        <span className="text-[14px] font-semibold text-[#201D1D]">
          Lien au clic <span className="font-normal text-[#7A808C]">(optionnel)</span>
        </span>
        <Dropdown
          label="Lien de la barre d’annonce"
          value={bar.link}
          onChange={(link) => set({ link })}
          options={[
            { value: '', label: 'Aucun lien' },
            ...categories.map((c) => ({ value: `cat:${c}`, label: `Catégorie : ${c}` })),
            ...products.map((p) => ({
              value: `product:${p.config.slug}`,
              label: `Produit : ${p.config.productTitle || p.internalName}`,
            })),
          ]}
        />
      </div>

      <div className="space-y-3 p-4 rounded-2xl bg-[#F6F7F9]">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-[#201D1D]">
            <Timer className="w-4 h-4 text-[#235BF7]" /> Activer un compte à rebours
          </span>
          <Toggle
            on={bar.countdown.enabled}
            onClick={() => setCountdown({ enabled: !bar.countdown.enabled })}
            label="Compte à rebours"
          />
        </div>
        {bar.countdown.enabled && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { daily: false, label: 'Date de fin fixe' },
                { daily: true, label: 'Chaque jour (jusqu’à minuit)' },
              ].map((o) => (
                <button
                  key={String(o.daily)}
                  type="button"
                  onClick={() => setCountdown({ daily: o.daily })}
                  aria-pressed={bar.countdown.daily === o.daily}
                  className={`min-h-11 px-3 rounded-xl border-2 text-[13px] font-semibold cursor-pointer ${
                    bar.countdown.daily === o.daily
                      ? 'border-[#235BF7] bg-white text-[#235BF7]'
                      : 'border-transparent bg-white text-[#3F4654]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {!bar.countdown.daily && (
              <label className="block space-y-1">
                <span className="text-[13px] text-[#3F4654]">Fin de la promotion</span>
                <input
                  type="datetime-local"
                  value={toLocalInput(bar.countdown.endsAt)}
                  onChange={(e) =>
                    setCountdown({
                      endsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                  className={`${INPUT} bg-white`}
                />
                <span className="block text-[12px] text-[#7A808C]">
                  La barre disparaît automatiquement à la fin du compte à rebours.
                </span>
              </label>
            )}
          </div>
        )}
      </div>

      <fieldset>
        <legend className="text-[14px] font-semibold text-[#201D1D] mb-2">Couleur</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {STYLES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => set({ style: st.id })}
              aria-pressed={bar.style === st.id}
              className={`flex items-center gap-2.5 min-h-12 px-3 rounded-xl border-2 text-[14px] font-semibold text-left cursor-pointer ${
                bar.style === st.id ? 'border-[#235BF7] bg-[#F5F8FF]' : 'border-[#E3E7EE]'
              }`}
            >
              <span
                className="w-6 h-6 rounded-full shrink-0"
                style={{ background: st.swatch(accent) }}
              />
              {st.label}
            </button>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-[14px] font-semibold text-[#DC2626]">{error}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || !dirty}
          className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] disabled:opacity-50 text-white text-[15px] font-semibold cursor-pointer"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : ok ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : null}
          {ok ? 'Enregistré' : 'Enregistrer'}
        </button>
      </div>
    </Panel>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// D. Produits complémentaires (cross-sell)
// ─────────────────────────────────────────────────────────────────────────
const DISCOUNTS = [0, 5, 10, 15, 20];

const CrossSellPanel: React.FC<{
  pages: FunnelPageItem[];
  onUpdateProduct: MarketingViewProps['onUpdateProduct'];
}> = ({ pages, onUpdateProduct }) => {
  const products = pages.filter((p) => p.status !== 'inactive');
  const [open, setOpen] = useState<string | null>(null);

  const save = (page: FunnelPageItem, patch: Partial<CrossSell>) => {
    const current = parseCrossSell(page.config.crossSell);
    onUpdateProduct(page.id, { crossSell: { ...current, ...patch } });
  };

  return (
    <Panel
      title="Produits complémentaires"
      hint="Pour chaque produit, proposez 1 à 3 articles « souvent achetés avec », avec un prix spécial s’ils sont achetés ensemble."
      icon={<ShoppingBag className="w-5 h-5" />}
    >
      {products.length < 2 ? (
        <p className="py-8 text-center text-[14px] text-[#7A808C]">
          Il faut au moins deux produits pour en suggérer un avec l’autre.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {products.map((page) => {
            const cs = parseCrossSell(page.config.crossSell);
            const image = page.config.mediaItems.find((m) => m.type === 'image')?.url;
            const isOpen = open === page.id;
            return (
              <li key={page.id} className="rounded-2xl border border-[#ECEFF4] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : page.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#FAFBFC] cursor-pointer"
                >
                  <span className="w-12 h-12 rounded-xl overflow-hidden bg-[#F1F3F6] shrink-0">
                    {image && <img src={image} alt="" className="w-full h-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-[#201D1D] truncate">
                      {page.config.productTitle || page.internalName}
                    </span>
                    <span className="block text-[13px] text-[#7A808C]">
                      {cs.slugs.length === 0
                        ? 'Aucune suggestion'
                        : `${cs.slugs.length} suggestion${cs.slugs.length > 1 ? 's' : ''}${cs.discountPercent ? ` · -${cs.discountPercent} % ensemble` : ''}`}
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 text-[#9AA0AB] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="p-4 pt-1 space-y-4 border-t border-[#F1F3F6]">
                    <div className="space-y-2">
                      <p className="text-[14px] font-semibold text-[#201D1D]">
                        Produits suggérés ({cs.slugs.length} / 3)
                      </p>
                      <ProductPicker
                        pages={pages.filter((p) => p.id !== page.id)}
                        selected={cs.slugs}
                        max={3}
                        onChange={(slugs) => save(page, { slugs: slugs.slice(0, 3) })}
                        createLabel=""
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[14px] font-semibold text-[#201D1D]">
                        Remise si achetés ensemble
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {DISCOUNTS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => save(page, { discountPercent: d })}
                            aria-pressed={cs.discountPercent === d}
                            className={`h-10 px-4 rounded-xl text-[14px] font-semibold cursor-pointer ${
                              cs.discountPercent === d
                                ? 'bg-[#235BF7] text-white'
                                : 'bg-[#F6F7F9] text-[#3F4654] hover:bg-[#EEF1F5]'
                            }`}
                          >
                            {d === 0 ? 'Aucune' : `-${d} %`}
                          </button>
                        ))}
                      </div>
                      <p className="text-[13px] text-[#7A808C]">
                        Le prix réduit s’applique aux articles suggérés quand le client les prend
                        avec ce produit.
                      </p>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
};

/** Marketing: promo codes, pixels, announcement bar, cross-sell. */
export const MarketingView: React.FC<MarketingViewProps> = ({ pages, onUpdateProduct }) => {
  const [section, setSection] = useState<MarketingSection>('promos');
  return (
    <SectionLayout sections={SECTIONS} active={section} onChange={setSection}>
      {section === 'promos' && <PromoCodesPanel />}
      {section === 'abtest' && (
        <PriceAbTestingCard pages={pages} onUpdateProduct={onUpdateProduct} />
      )}
      {section === 'partners' && <PartnersPanel pages={pages} />}
      {section === 'pixels' && <TrackingPixelsCard />}
      {section === 'annonce' && <AnnouncementPanel pages={pages} />}
      {section === 'crosssell' && (
        <CrossSellPanel pages={pages} onUpdateProduct={onUpdateProduct} />
      )}
    </SectionLayout>
  );
};
