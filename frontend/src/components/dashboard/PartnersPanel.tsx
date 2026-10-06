'use client';

import React, { useEffect, useState } from 'react';
import {
  CalendarPlus,
  CheckCircle2,
  Copy,
  Handshake,
  Link2,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { formatFCFA } from '@/lib/orderUtils';
import { storeOrigin } from '@/lib/store/subdomain';
import {
  commissionLabel,
  daysLeft,
  normalizePartnerSlug,
  partnerStatus,
  type CommissionType,
  type PartnerDTO,
  type PartnerStatus,
} from '@/lib/store/partners';
import type { FunnelPageItem } from '@/types/juula';
import { Dropdown } from '@/components/ui/Dropdown';
import { SkeletonList } from '@/components/ui/Skeleton';

const INPUT =
  'w-full min-w-0 h-11 px-3.5 rounded-xl border border-[#E3E7EE] bg-[#F6F7F9] text-[15px] text-[#201D1D] placeholder:text-[#9AA0AB] focus:outline-none focus:border-[#235BF7] focus:bg-white';

const errorText = (err: unknown, fallback: string) =>
  err instanceof ApiError && typeof err.body.message === 'string' ? err.body.message : fallback;

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function badge(p: PartnerDTO): { label: string; cls: string } {
  const s: PartnerStatus = partnerStatus(p);
  if (s === 'active') {
    const d = daysLeft(p.expiresAt);
    return {
      label: `Actif · ${d} jour${d > 1 ? 's' : ''} restant${d > 1 ? 's' : ''}`,
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
  if (s === 'scheduled')
    return { label: 'Programmé', cls: 'bg-sky-50 text-sky-700 border-sky-200' };
  if (s === 'suspended')
    return { label: 'Suspendu', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Expiré', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
}

// ─────────────────────────────────────────────────────────────────────────
// Create / edit
// ─────────────────────────────────────────────────────────────────────────
interface Form {
  name: string;
  slug: string;
  slugTouched: boolean;
  startsAt: string;
  expiresAt: string;
  commissionType: CommissionType;
  commissionValue: string;
  productSlug: string; // '' = every product
}

const PartnerEditor: React.FC<{
  initial: PartnerDTO | null;
  pages: FunnelPageItem[];
  subdomain: string | null;
  onClose: () => void;
  onSaved: (p: PartnerDTO) => void;
}> = ({ initial, pages, subdomain, onClose, onSaved }) => {
  const [form, setForm] = useState<Form>(() =>
    initial
      ? {
          name: initial.name,
          slug: initial.slug,
          slugTouched: true,
          startsAt: toLocalInput(initial.startsAt),
          expiresAt: toLocalInput(initial.expiresAt),
          commissionType: initial.commissionType,
          commissionValue: String(initial.commissionValue),
          productSlug: initial.productSlug ?? '',
        }
      : {
          name: '',
          slug: '',
          slugTouched: false,
          startsAt: '',
          expiresAt: toLocalInput(new Date(Date.now() + 30 * 86_400_000).toISOString()),
          commissionType: 'percent',
          commissionValue: '10',
          productSlug: '',
        },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));
  const slug = normalizePartnerSlug(form.slug);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!form.expiresAt) {
      setError('La date d’expiration est obligatoire.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        slug,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        expiresAt: new Date(form.expiresAt).toISOString(),
        commissionType: form.commissionType,
        commissionValue: Math.round(Number(form.commissionValue) || 0),
        productSlug: form.productSlug || null,
      };
      const { partner } = await api<{ partner: PartnerDTO }>(
        initial ? `/api/store/partners/${initial.id}` : '/api/store/partners',
        { method: initial ? 'PATCH' : 'POST', body },
      );
      onSaved(partner);
    } catch (err) {
      setError(errorText(err, 'L’enregistrement a échoué. Réessayez.'));
    } finally {
      setBusy(false);
    }
  };

  const products = pages.filter((p) => p.status !== 'inactive');

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
        aria-label={initial ? 'Modifier le partenaire' : 'Nouveau partenaire'}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-7 space-y-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-[#201D1D]">
            {initial ? 'Modifier le partenaire' : 'Nouveau partenaire'}
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
          <span className="text-[14px] font-semibold text-[#201D1D]">Nom du partenaire *</span>
          <input
            required
            minLength={2}
            maxLength={80}
            value={form.name}
            onChange={(e) =>
              set({
                name: e.target.value,
                ...(form.slugTouched
                  ? {}
                  : { slug: normalizePartnerSlug(e.target.value.split(' ')[0] ?? '') }),
              })
            }
            placeholder="Ex : Fatou TikTok"
            className={INPUT}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[14px] font-semibold text-[#201D1D]">Identifiant du lien *</span>
          <input
            required
            value={form.slug}
            onChange={(e) => set({ slug: e.target.value, slugTouched: true })}
            placeholder="Ex : fatou"
            className={`${INPUT} font-semibold`}
          />
          <span className="block text-[13px] text-[#7A808C] break-all">
            Lien suivi :{' '}
            <strong className="text-[#201D1D]">
              {subdomain
                ? storeOrigin(subdomain).replace(/^https?:\/\//, '')
                : 'maboutique.juula.store'}
              /?ref={slug || '…'}
            </strong>
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block space-y-1.5 min-w-0">
            <span className="text-[14px] font-semibold text-[#201D1D]">
              Début <span className="font-normal text-[#7A808C]">(optionnel)</span>
            </span>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => set({ startsAt: e.target.value })}
              className={INPUT}
            />
          </label>
          <label className="block space-y-1.5 min-w-0">
            <span className="text-[14px] font-semibold text-[#201D1D]">Expiration *</span>
            <input
              required
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => set({ expiresAt: e.target.value })}
              className={INPUT}
            />
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-[14px] font-semibold text-[#201D1D] mb-2">Commission</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'percent', label: 'Pourcentage (%)' },
                { id: 'fixed', label: 'Montant fixe / article' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => set({ commissionType: t.id })}
                aria-pressed={form.commissionType === t.id}
                className={`min-h-12 px-3 rounded-2xl border-2 text-[14px] font-semibold cursor-pointer ${
                  form.commissionType === t.id
                    ? 'border-[#235BF7] bg-[#F5F8FF] text-[#235BF7]'
                    : 'border-[#E3E7EE] text-[#3F4654] hover:bg-[#F6F7F9]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              required
              type="number"
              inputMode="numeric"
              min={1}
              max={form.commissionType === 'percent' ? 100 : undefined}
              value={form.commissionValue}
              onChange={(e) => set({ commissionValue: e.target.value })}
              aria-label="Valeur de la commission"
              className={`${INPUT} pr-24`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-[#7A808C]">
              {form.commissionType === 'percent' ? '% / commande' : 'FCFA / article'}
            </span>
          </div>
          <p className="text-[13px] text-[#7A808C]">
            Calculée sur le prix des produits uniquement, jamais sur la livraison.
          </p>
        </fieldset>

        <div className="space-y-1.5">
          <span className="text-[14px] font-semibold text-[#201D1D]">Produits concernés</span>
          <Dropdown
            label="Produits concernés"
            value={form.productSlug}
            onChange={(productSlug) => set({ productSlug })}
            options={[
              { value: '', label: 'Tous les produits du catalogue' },
              ...products.map((p) => ({
                value: p.config.slug,
                label: p.config.productTitle || p.internalName,
              })),
            ]}
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
            {initial ? 'Enregistrer' : 'Créer le partenaire'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// List
// ─────────────────────────────────────────────────────────────────────────
export const PartnersPanel: React.FC<{ pages: FunnelPageItem[] }> = ({ pages }) => {
  const [partners, setPartners] = useState<PartnerDTO[] | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [editing, setEditing] = useState<PartnerDTO | 'new' | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<PartnerDTO | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ partners: PartnerDTO[] }>('/api/store/partners'),
      api<{ subdomain: string | null }>('/api/store/storefront'),
    ])
      .then(([a, b]) => {
        setPartners(a.partners);
        setSubdomain(b.subdomain);
      })
      .catch(() => setError('Impossible de charger vos partenaires.'));
  }, []);

  const origin = subdomain ? storeOrigin(subdomain) : '';
  const trackedUrl = (p: PartnerDTO) => `${origin}/?ref=${encodeURIComponent(p.slug)}`;
  const privateUrl = (p: PartnerDTO) =>
    `${origin}/partner/${p.id}?token=${encodeURIComponent(p.token)}`;

  const replace = (p: PartnerDTO) =>
    setPartners((cur) => {
      const list = cur ?? [];
      return list.some((x) => x.id === p.id)
        ? list.map((x) => (x.id === p.id ? p : x))
        : [p, ...list];
    });

  const copy = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  };

  const act = async (p: PartnerDTO, body: Record<string, unknown>) => {
    setBusyId(p.id);
    setError(null);
    try {
      const { partner } = await api<{ partner: PartnerDTO }>(`/api/store/partners/${p.id}`, {
        method: 'PATCH',
        body,
      });
      replace(partner);
    } catch (err) {
      setError(errorText(err, 'L’action a échoué.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/api/store/partners/${id}`, { method: 'DELETE' });
      setPartners((cur) => (cur ?? []).filter((x) => x.id !== id));
    } catch (err) {
      setError(errorText(err, 'La suppression a échoué.'));
    }
  };

  return (
    <section className="p-5 sm:p-6 rounded-[28px] bg-white border border-[#ECEFF4] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
            <Handshake className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[17px] font-extrabold text-[#201D1D]">Liens & partenaires</h3>
            <p className="text-[14px] text-[#7A808C]">
              Donnez un lien suivi à vos influenceurs : chaque vente qu’ils apportent leur rapporte
              une commission. Ils suivent leurs résultats sur un lien privé.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nouveau partenaire
        </button>
      </div>

      {error && <p className="text-[14px] font-semibold text-[#DC2626]">{error}</p>}

      {!partners ? (
        <SkeletonList rows={2} />
      ) : partners.length === 0 ? (
        <div className="py-10 px-4 rounded-2xl border-2 border-dashed border-[#E3E7EE] text-center">
          <Handshake className="mx-auto w-8 h-8 text-[#C9D3EA]" />
          <p className="mt-3 text-[16px] font-bold text-[#201D1D]">Aucun partenaire</p>
          <p className="mt-1 text-[14px] text-[#7A808C]">
            Créez un lien pour une influenceuse, par exemple « Fatou TikTok » avec 10 % sur ses
            ventes.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {partners.map((p) => {
            const b = badge(p);
            const status = partnerStatus(p);
            const s = p.stats;
            return (
              <li key={p.id} className="p-4 rounded-2xl border border-[#ECEFF4] space-y-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[16px] font-extrabold text-[#201D1D]">{p.name}</p>
                    <p className="text-[13px] text-[#7A808C]">
                      ?ref={p.slug} · {commissionLabel(p, p.productTitle)} · jusqu’au{' '}
                      {dateFmt.format(new Date(p.expiresAt))}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md border ${b.cls}`}>
                    {b.label}
                  </span>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: 'Clics', value: s.clicks.toLocaleString('fr-FR') },
                    { label: 'En cours', value: String(s.pendingOrders) },
                    { label: 'Livrées', value: String(s.validatedOrders) },
                    { label: 'CA généré', value: formatFCFA(s.revenue) },
                    { label: 'À verser', value: formatFCFA(s.dueCommission), strong: true },
                  ].map((k) => (
                    <div
                      key={k.label}
                      className={`p-2.5 rounded-xl ${k.strong ? 'bg-[#201D1D] text-white' : 'bg-[#F6F7F9]'}`}
                    >
                      <dt
                        className={`text-[12px] ${k.strong ? 'text-white/70' : 'text-[#7A808C]'}`}
                      >
                        {k.label}
                      </dt>
                      <dd className="text-[15px] font-extrabold tabular-nums">{k.value}</dd>
                    </div>
                  ))}
                </dl>
                {s.pendingCommission > 0 && (
                  <p className="text-[13px] text-[#7A808C]">
                    + {formatFCFA(s.pendingCommission)} en attente de livraison
                    {p.paidAmount > 0 ? ` · déjà versé ${formatFCFA(p.paidAmount)}` : ''}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => copy(`t-${p.id}`, trackedUrl(p))}
                    className="min-h-11 px-3 inline-flex items-center justify-center gap-2 rounded-xl border border-[#E3E7EE] text-[14px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] cursor-pointer"
                  >
                    {copied === `t-${p.id}` ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Link2 className="w-4 h-4 text-[#235BF7]" />
                    )}
                    {copied === `t-${p.id}` ? 'Lien copié' : 'Copier le lien suivi'}
                  </button>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <button
                      type="button"
                      onClick={() => copy(`p-${p.id}`, privateUrl(p))}
                      className="min-h-11 px-3 inline-flex items-center justify-center gap-2 rounded-xl border border-[#E3E7EE] text-[14px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] cursor-pointer"
                    >
                      {copied === `p-${p.id}` ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-[#235BF7]" />
                      )}
                      {copied === `p-${p.id}` ? 'Lien copié' : 'Copier le lien de suivi'}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Bonjour ${p.name}, voici votre lien à partager : ${trackedUrl(p)}\nSuivez vos résultats ici : ${privateUrl(p)}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-11 px-3 inline-flex items-center justify-center rounded-xl bg-[#25D366] text-white text-[14px] font-semibold"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#F1F3F6]">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl text-[13px] font-semibold text-[#3F4654] hover:bg-[#F1F3F6] cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" /> Modifier / date
                  </button>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => void act(p, { action: 'extend', days: 30 })}
                    className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl text-[13px] font-semibold text-[#3F4654] hover:bg-[#F1F3F6] cursor-pointer disabled:opacity-50"
                  >
                    <CalendarPlus className="w-4 h-4" /> Prolonger 30 j
                  </button>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() =>
                      void act(p, { action: status === 'suspended' ? 'resume' : 'suspend' })
                    }
                    className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl text-[13px] font-semibold text-[#3F4654] hover:bg-[#F1F3F6] cursor-pointer disabled:opacity-50"
                  >
                    {status === 'suspended' ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                    {status === 'suspended' ? 'Réactiver' : 'Suspendre'}
                  </button>
                  {s.dueCommission > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayFor(p)}
                      className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl text-[13px] font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                    >
                      <Wallet className="w-4 h-4" /> Marquer comme payé
                    </button>
                  )}
                  <span className="ml-auto">
                    {confirmDelete === p.id ? (
                      <button
                        type="button"
                        onClick={() => void remove(p.id)}
                        className="h-10 px-3 rounded-xl bg-[#DC2626] text-white text-[13px] font-semibold cursor-pointer"
                      >
                        Supprimer ?
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(p.id)}
                        aria-label={`Supprimer ${p.name}`}
                        className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <PartnerEditor
          initial={editing === 'new' ? null : editing}
          pages={pages}
          subdomain={subdomain}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            replace(p);
            setEditing(null);
          }}
        />
      )}

      {payFor && (
        <div
          className="fixed inset-0 z-[80] bg-[#201D1D]/40 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setPayFor(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Marquer comme payé"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] p-6 space-y-4"
          >
            <h3 className="text-lg font-extrabold text-[#201D1D]">
              Commission versée à {payFor.name}
            </h3>
            <p className="text-[14px] text-[#3F4654]">
              Vous confirmez avoir envoyé <strong>{formatFCFA(payFor.stats.dueCommission)}</strong>.
              Ce montant passe en « déjà versé » sur son espace partenaire.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {(
                [
                  { via: 'wave', label: 'Payé par Wave' },
                  { via: 'orange_money', label: 'Payé par Orange Money' },
                  { via: 'other', label: 'Autre moyen' },
                ] as const
              ).map((o) => (
                <button
                  key={o.via}
                  type="button"
                  onClick={() => {
                    void act(payFor, { action: 'markPaid', via: o.via });
                    setPayFor(null);
                  }}
                  className="h-12 rounded-xl border border-[#E3E7EE] text-[15px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] cursor-pointer"
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPayFor(null)}
              className="w-full h-11 rounded-xl text-[14px] font-semibold text-[#7A808C] hover:bg-[#F6F7F9] cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
