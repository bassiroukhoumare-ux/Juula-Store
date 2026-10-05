'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Copy,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Package,
  Pencil,
  Plus,
  Power,
  Rocket,
  Trash2,
  X,
} from 'lucide-react';
import type { FunnelPageItem, FunnelPageStatus } from '@/types/juula';
import { formatFCFA } from '@/lib/orderUtils';
import { storeProductUrl } from '@/lib/store/subdomain';
import type { ProductStats } from '@/lib/store/analytics-types';
import { useStoreAnalytics } from '@/components/dashboard/analytics/useStoreAnalytics';
import {
  AbandonedPanel,
  CountriesPanel,
  SourcesPanel,
  StatTile,
} from '@/components/dashboard/analytics/TrafficPanels';

interface ProductsListViewProps {
  pages: FunnelPageItem[];
  subdomain?: string | null | undefined;
  onCreate: (name: string) => Promise<void> | void;
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onSetStatus: (id: string, status: FunnelPageStatus) => void;
  onDelete: (id: string) => void;
  /** Incremented by the dashboard header's « Créer » button: opens the create dialog. */
  createSignal?: number;
}

type Filter = 'all' | FunnelPageStatus;

const STATUS_META: Record<FunnelPageStatus, { label: string; cls: string }> = {
  published: { label: 'Publié', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  draft: { label: 'Brouillon', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  inactive: { label: 'Désactivé', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const STATUS_ORDER: Record<FunnelPageStatus, number> = { published: 0, draft: 1, inactive: 2 };
const DAY = 86_400_000;

function last30Days(): { from: Date; to: Date } {
  const to = new Date();
  return { from: new Date(to.getTime() - 30 * DAY), to };
}

export const ProductsListView: React.FC<ProductsListViewProps> = ({
  pages,
  subdomain,
  onCreate,
  onEdit,
  onPreview,
  onSetStatus,
  onDelete,
  createSignal = 0,
}) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<FunnelPageItem | null>(null);
  const [statsFor, setStatsFor] = useState<FunnelPageItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (createSignal > 0) setCreating(true);
  }, [createSignal]);

  const [range] = useState(last30Days);
  const { data } = useStoreAnalytics(range);
  const statsById = useMemo(() => {
    const map = new Map<string, ProductStats>();
    data?.products.forEach((p) => map.set(p.id, p));
    return map;
  }, [data]);

  const counts = useMemo(
    () => ({
      all: pages.length,
      published: pages.filter((p) => p.status === 'published').length,
      draft: pages.filter((p) => p.status === 'draft').length,
      inactive: pages.filter((p) => p.status === 'inactive').length,
    }),
    [pages],
  );

  const visible = useMemo(
    () =>
      pages
        .filter((p) => filter === 'all' || p.status === filter)
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [pages, filter],
  );

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onCreate(newName.trim() || 'Nouveau produit');
      setCreating(false);
      setNewName('');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (page: FunnelPageItem) => {
    const url = subdomain
      ? storeProductUrl(subdomain, page.config.slug)
      : `${window.location.origin}/p/${page.config.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(page.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // clipboard blocked: nothing to do
    }
  };

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'published', label: 'Publiés' },
    { id: 'draft', label: 'Brouillons' },
    { id: 'inactive', label: 'Désactivés' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#201D1D] tracking-tight">
            Mes produits
          </h2>
          <p className="text-[14px] text-[#7A808C]">
            {counts.published} publié{counts.published > 1 ? 's' : ''} sur {counts.all} produit
            {counts.all > 1 ? 's' : ''} · statistiques des 30 derniers jours
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Nouveau produit
        </button>
      </div>

      {/* Status filter */}
      {pages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[14px] font-semibold border transition-colors cursor-pointer ${
                filter === f.id
                  ? 'bg-[#201D1D] text-white border-[#201D1D]'
                  : 'bg-white text-[#3F4654] border-[#E3E7EE] hover:bg-[#F6F7F9]'
              }`}
            >
              {f.label}
              <span
                className={`text-xs font-bold px-1.5 rounded-md ${
                  filter === f.id ? 'bg-white/15' : 'bg-[#F1F3F6] text-[#7A808C]'
                }`}
              >
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {visible.length === 0 ? (
        <div className="py-14 px-6 rounded-[28px] bg-white border border-[#ECEFF4] text-center">
          <span className="mx-auto w-14 h-14 rounded-2xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center">
            <Package className="w-6 h-6" />
          </span>
          <p className="mt-4 text-lg font-extrabold text-[#201D1D]">
            {pages.length === 0
              ? 'Aucun produit pour le moment'
              : filter === 'published'
                ? 'Aucun produit publié'
                : 'Aucun produit dans cette catégorie'}
          </p>
          <p className="mt-1 text-[14px] text-[#7A808C]">
            {pages.length === 0
              ? 'Créez votre premier produit pour obtenir votre page de vente.'
              : 'Publiez un produit pour qu’il soit visible par vos clients.'}
          </p>
          {pages.length === 0 && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Créer mon premier produit
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {visible.map((page) => {
            const cfg = page.config;
            const image = cfg.mediaItems?.find((m) => m.type === 'image')?.url;
            const stats = statsById.get(page.id);
            const meta = STATUS_META[page.status];
            return (
              <article
                key={page.id}
                className="rounded-[24px] bg-white border border-[#ECEFF4] overflow-hidden flex flex-col"
              >
                <div className="flex gap-3.5 p-4">
                  <button
                    type="button"
                    onClick={() => onPreview(page.id)}
                    className="shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-[#F1F3F6] cursor-pointer"
                    aria-label={`Voir ${cfg.productTitle || page.internalName}`}
                  >
                    {image ? (
                      <img src={image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-[#9AA0AB]">
                        <Package className="w-6 h-6" />
                      </span>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-[15px] text-[#201D1D] leading-snug line-clamp-2">
                        {cfg.productTitle || page.internalName}
                      </h3>
                      <span
                        className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-md border ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-[#7A808C] truncate">
                      {page.internalName} · modifié {page.updatedAt}
                    </p>
                    <p className="mt-1 text-[15px] font-extrabold text-[#235BF7]">
                      {formatFCFA(cfg.price)}
                    </p>
                  </div>
                </div>

                {/* 30-day numbers */}
                <div className="grid grid-cols-3 border-y border-[#F1F3F6] text-center">
                  {[
                    { label: 'Vues', value: stats?.views ?? 0 },
                    { label: 'Commandes', value: stats?.orders ?? 0 },
                    { label: 'Conversion', value: `${stats?.conversionRate ?? 0}%` },
                  ].map((s) => (
                    <div key={s.label} className="py-2.5">
                      <p className="text-[15px] font-extrabold text-[#201D1D] tabular-nums">
                        {s.value}
                      </p>
                      <p className="text-xs text-[#9AA0AB]">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="p-3 flex flex-wrap items-center gap-2 mt-auto">
                  <button
                    type="button"
                    onClick={() => onEdit(page.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[13px] font-bold cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => onPreview(page.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E3E7EE] text-[#201D1D] text-[13px] font-bold hover:bg-[#F6F7F9] cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#235BF7]" /> Voir
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatsFor(page)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E3E7EE] text-[#201D1D] text-[13px] font-bold hover:bg-[#F6F7F9] cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-[#235BF7]" /> Statistiques
                  </button>

                  <div className="ml-auto flex items-center gap-1">
                    {page.status === 'published' && (
                      <IconAction
                        label={copiedId === page.id ? 'Lien copié' : 'Copier le lien'}
                        onClick={() => void copyLink(page)}
                      >
                        {copiedId === page.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </IconAction>
                    )}
                    {page.status === 'draft' && (
                      <IconAction label="Publier" onClick={() => onSetStatus(page.id, 'published')}>
                        <Rocket className="w-4 h-4 text-emerald-600" />
                      </IconAction>
                    )}
                    {page.status === 'published' && (
                      <>
                        <IconAction label="Dépublier" onClick={() => onSetStatus(page.id, 'draft')}>
                          <EyeOff className="w-4 h-4" />
                        </IconAction>
                        <IconAction
                          label="Désactiver"
                          onClick={() => onSetStatus(page.id, 'inactive')}
                        >
                          <Power className="w-4 h-4 text-rose-600" />
                        </IconAction>
                      </>
                    )}
                    {page.status === 'inactive' && (
                      <IconAction
                        label="Réactiver"
                        onClick={() => onSetStatus(page.id, 'published')}
                      >
                        <Power className="w-4 h-4 text-emerald-600" />
                      </IconAction>
                    )}
                    <IconAction label="Supprimer" onClick={() => setToDelete(page)}>
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </IconAction>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create */}
      {creating && (
        <Modal onClose={() => !busy && setCreating(false)} title="Nouveau produit">
          <form onSubmit={submitCreate} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[14px] font-semibold text-[#201D1D]">Nom du produit</span>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={120}
                placeholder="Ex : Montre Élégance"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E7EE] bg-[#F6F7F9] text-[14px] text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white"
              />
              <span className="text-[13px] text-[#7A808C]">
                Vous ajouterez ensuite les photos, la vidéo, le prix et la description.
              </span>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] disabled:opacity-60 text-white text-[14px] font-semibold cursor-pointer"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer et configurer
            </button>
          </form>
        </Modal>
      )}

      {/* Delete confirmation */}
      {toDelete && (
        <Modal onClose={() => setToDelete(null)} title="Supprimer ce produit ?">
          <p className="text-[14px] text-[#3F4654] leading-relaxed">
            « {toDelete.config.productTitle || toDelete.internalName} » et sa page de vente seront
            supprimés définitivement. Ses commandes restent dans votre historique.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setToDelete(null)}
              className="py-2.5 rounded-xl border border-[#E3E7EE] text-[14px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(toDelete.id);
                setToDelete(null);
              }}
              className="py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[14px] font-semibold cursor-pointer"
            >
              Supprimer
            </button>
          </div>
        </Modal>
      )}

      {statsFor && <ProductStatsModal page={statsFor} onClose={() => setStatsFor(null)} />}
    </div>
  );
};

const IconAction: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({
  label,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className="w-9 h-9 rounded-xl flex items-center justify-center text-[#3F4654] hover:bg-[#F1F3F6] transition-colors cursor-pointer"
  >
    {children}
  </button>
);

const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ title, onClose, children, wide = false }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[60] bg-[#201D1D]/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? 'sm:max-w-4xl' : 'sm:max-w-md'} max-h-[92vh] overflow-y-auto bg-[#F6F7F9] sm:bg-white rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6`}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-extrabold text-[#201D1D]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#7A808C] hover:bg-[#F1F3F6] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const STATS_PERIODS = [
  { days: 7, label: '7 jours' },
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' },
];

const ProductStatsModal: React.FC<{ page: FunnelPageItem; onClose: () => void }> = ({
  page,
  onClose,
}) => {
  const [days, setDays] = useState(30);
  const range = useMemo(() => {
    const to = new Date();
    return { from: new Date(to.getTime() - days * DAY), to, productId: page.id };
  }, [days, page.id]);
  const { data, loading, error } = useStoreAnalytics(range);
  const t = data?.totals;

  return (
    <Modal wide onClose={onClose} title={page.config.productTitle || page.internalName}>
      <div className="flex gap-2 mb-4">
        {STATS_PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => setDays(p.days)}
            className={`px-3 py-1.5 rounded-xl text-[13px] font-semibold border cursor-pointer ${
              days === p.days
                ? 'bg-[#201D1D] text-white border-[#201D1D]'
                : 'bg-white text-[#3F4654] border-[#E3E7EE]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#235BF7]" />
        </div>
      ) : error || !data || !t ? (
        <p className="py-10 text-center text-[14px] text-[#7A808C]">
          Impossible de charger les statistiques. Réessayez.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatTile label="Vues de la page" value={String(t.views)} />
            <StatTile label="Visiteurs uniques" value={String(t.visitors)} />
            <StatTile label="Clics « Commander »" value={String(t.checkoutOpens)} />
            <StatTile label="Commandes" value={String(t.orders)} />
            <StatTile
              label="Taux de conversion"
              value={`${t.conversionRate}%`}
              hint="commandes / visiteurs"
            />
            <StatTile label="Chiffre d’affaires" value={formatFCFA(t.revenue)} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SourcesPanel data={data} />
            <CountriesPanel data={data} />
          </div>
          <AbandonedPanel data={data} showProduct={false} />
        </div>
      )}
    </Modal>
  );
};
