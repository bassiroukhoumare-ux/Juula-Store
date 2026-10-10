'use client';

import { FilterBar } from '@/components/ui/FilterBar';
import { SkeletonStats } from '@/components/ui/Skeleton';
import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Copy,
  Check,
  Eye,
  EyeOff,
  Package,
  Pencil,
  Plus,
  Power,
  Rocket,
  Split,
  Trash2,
  X,
} from 'lucide-react';
import type { FunnelPageConfig, FunnelPageItem, FunnelPageStatus } from '@/types/juula';
import { formatFCFA } from '@/lib/orderUtils';
import { storeProductUrl } from '@/lib/store/subdomain';
import type { ProductStats } from '@/lib/store/analytics-types';
import { ProductCreationWizardModal } from '@/components/dashboard/ProductCreationWizardModal';
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
  onCreate: (
    name: string,
    configPatch?: Partial<FunnelPageConfig>,
  ) => Promise<void | boolean> | void;
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onSetStatus: (id: string, status: FunnelPageStatus) => void;
  onDelete: (id: string) => void;
  /** Incremented by the dashboard header's « Créer » button: opens the create dialog. */
  createSignal?: number;
  /** Called once the signal opened the dialog, so the dashboard resets it to 0. */
  onCreateSignalHandled?: () => void;
  /**
   * 'catalog' (onglet Produits): every product, with its shop visibility and
   * sales page switches. 'pages' (onglet Pages de vente): sales pages.
   */
  mode?: 'catalog' | 'pages';
  onSetShopVisibility?: (id: string, visible: boolean) => void;
}

type Filter = 'all' | FunnelPageStatus;

const STATUS_META: Record<FunnelPageStatus, { label: string; cls: string }> = {
  published: { label: 'Publié', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  draft: { label: 'Brouillon', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  inactive: { label: 'Désactivé', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const ADMIN_DISABLED_META = {
  label: 'Désactivé par Juula',
  cls: 'bg-rose-50 text-rose-700 border-rose-200',
};

/** Reason given by the Juula administration when it disabled a product. */
const AdminDisabledNote: React.FC<{ page: FunnelPageItem }> = ({ page }) =>
  page.adminDisabled ? (
    <p className="mt-1 text-[12px] font-semibold text-rose-600 leading-snug">
      Désactivé par l’administration
      {page.adminDisabled.reason ? ` : ${page.adminDisabled.reason}` : ''}. Contactez le support.
    </p>
  ) : null;

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
  onCreateSignalHandled,
  mode = 'pages',
  onSetShopVisibility,
}) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [shopFilter, setShopFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<FunnelPageItem | null>(null);
  const [statsFor, setStatsFor] = useState<FunnelPageItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // The header button asks for the dialog once: consume the request, otherwise
  // every later visit to this tab would pop it open again.
  useEffect(() => {
    if (createSignal > 0) {
      setCreating(true);
      onCreateSignalHandled?.();
    }
  }, [createSignal, onCreateSignalHandled]);

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
        .filter(
          (p) =>
            shopFilter === 'all' || (shopFilter === 'visible') === (p.config.showInStore === true),
        )
        .filter((p) => {
          const q = query.trim().toLowerCase();
          return (
            !q ||
            (p.config.productTitle || '').toLowerCase().includes(q) ||
            p.internalName.toLowerCase().includes(q) ||
            (p.config.category || '').toLowerCase().includes(q)
          );
        })
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [pages, filter, shopFilter, query],
  );

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

  // Tailwind needs literal class names: one column template per mode.
  const tableCols =
    mode === 'catalog'
      ? 'grid-cols-[minmax(0,1fr)_80px_104px_60px_60px_204px]'
      : 'grid-cols-[minmax(0,1fr)_80px_104px_204px]';

  return (
    <div className="space-y-5">
      {/* Recherche + un seul bouton « Filtrer » + nouveau produit */}
      <FilterBar
        {...(pages.length > 0
          ? {
              search: {
                value: query,
                onChange: setQuery,
                placeholder: 'Nom, catégorie…',
              },
            }
          : {})}
        groups={
          pages.length === 0
            ? []
            : [
                {
                  id: 'status',
                  label: 'Statut',
                  value: filter,
                  defaultValue: 'all',
                  onChange: (v) => setFilter(v as Filter),
                  options: FILTERS.map((f) => ({
                    value: f.id,
                    label: f.label,
                    count: counts[f.id],
                  })),
                },
                ...(mode === 'catalog'
                  ? [
                      {
                        id: 'shop',
                        label: 'Dans la boutique',
                        value: shopFilter,
                        defaultValue: 'all',
                        onChange: (v: string) => setShopFilter(v as typeof shopFilter),
                        options: [
                          { value: 'all', label: 'Tous' },
                          {
                            value: 'visible',
                            label: 'Visibles',
                            count: pages.filter((p) => p.config.showInStore === true).length,
                          },
                          {
                            value: 'hidden',
                            label: 'Masqués',
                            count: pages.filter((p) => p.config.showInStore !== true).length,
                          },
                        ],
                      },
                    ]
                  : []),
              ]
        }
        action={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span className="hidden min-[400px]:inline">Ajouter un produit</span>
            <span className="min-[400px]:hidden">Ajouter</span>
          </button>
        }
      />

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
        // Table or cards depending on the room actually available (not the screen).
        <div className="@container">
          {/* Wide enough: one linear table */}
          <div className="hidden @min-[46rem]:block rounded-[24px] bg-white border border-[#ECEFF4] overflow-hidden">
            <div
              className={`grid ${tableCols} items-center gap-3 px-4 h-11 bg-[#F8F9FB] border-b border-[#ECEFF4] text-[12px] font-bold uppercase tracking-wide text-[#7A808C]`}
            >
              <span>Produit</span>
              <span>Statut</span>
              <span>Ventes · 30 j</span>
              {mode === 'catalog' && <span className="text-center">Boutique</span>}
              {mode === 'catalog' && <span className="text-center">En ligne</span>}
              <span className="text-right">Actions</span>
            </div>
            <ul className="divide-y divide-[#F1F3F6]">
              {visible.map((page) => {
                const cfg = page.config;
                const image = cfg.mediaItems?.find((m) => m.type === 'image')?.url;
                const stats = statsById.get(page.id);
                const meta = page.adminDisabled ? ADMIN_DISABLED_META : STATUS_META[page.status];
                const title = cfg.productTitle || page.internalName;
                return (
                  <li
                    key={page.id}
                    className={`grid ${tableCols} items-center gap-3 px-4 py-3 hover:bg-[#FAFBFC] transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => onPreview(page.id)}
                        className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-[#F1F3F6] cursor-pointer"
                        aria-label={`Voir ${title}`}
                      >
                        {image ? (
                          <img src={image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-[#9AA0AB]">
                            <Package className="w-5 h-5" />
                          </span>
                        )}
                      </button>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onEdit(page.id)}
                          className="block max-w-full truncate text-left font-bold text-[15px] text-[#201D1D] hover:text-[#235BF7] cursor-pointer"
                        >
                          {title}
                        </button>
                        <p className="text-[13px] text-[#7A808C] truncate">
                          <span className="font-bold text-[#235BF7]">{formatFCFA(cfg.price)}</span>
                          {' · '}modifié {page.updatedAt}
                        </p>
                        <AdminDisabledNote page={page} />
                      </div>
                    </div>
                    <span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md border ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </span>
                    <span className="min-w-0 tabular-nums">
                      <span className="block text-[14px] font-bold text-[#201D1D]">
                        {stats?.orders ?? 0} commande{(stats?.orders ?? 0) > 1 ? 's' : ''}
                      </span>
                      <span className="block text-[12px] text-[#7A808C]">
                        {stats?.views ?? 0} vues · {stats?.conversionRate ?? 0}%
                      </span>
                    </span>
                    {mode === 'catalog' && (
                      <span className="flex justify-center">
                        <MiniSwitch
                          label={`Visible dans la boutique : ${title}`}
                          on={page.config.showInStore === true}
                          disabled={page.status === 'inactive' || !onSetShopVisibility}
                          onClick={() =>
                            onSetShopVisibility?.(page.id, page.config.showInStore !== true)
                          }
                        />
                      </span>
                    )}
                    {mode === 'catalog' && (
                      <span className="flex justify-center">
                        <MiniSwitch
                          label={`Page en ligne : ${title}`}
                          on={page.status === 'published'}
                          onClick={() =>
                            onSetStatus(
                              page.id,
                              page.status === 'published' ? 'draft' : 'published',
                            )
                          }
                        />
                      </span>
                    )}
                    <div className="flex items-center justify-end gap-0.5">
                      <IconAction compact label="Modifier" onClick={() => onEdit(page.id)}>
                        <Pencil className="w-4 h-4 text-[#235BF7]" />
                      </IconAction>
                      <IconAction compact label="Voir" onClick={() => onPreview(page.id)}>
                        <Eye className="w-4 h-4" />
                      </IconAction>
                      <IconAction compact label="Statistiques" onClick={() => setStatsFor(page)}>
                        <BarChart3 className="w-4 h-4" />
                      </IconAction>
                      {page.status === 'published' && (
                        <IconAction
                          compact
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
                      {page.status === 'inactive' ? (
                        <IconAction
                          compact
                          label="Réactiver"
                          onClick={() => onSetStatus(page.id, 'published')}
                        >
                          <Power className="w-4 h-4 text-emerald-600" />
                        </IconAction>
                      ) : (
                        <IconAction
                          compact
                          label="Désactiver"
                          onClick={() => onSetStatus(page.id, 'inactive')}
                        >
                          <Power className="w-4 h-4 text-rose-600" />
                        </IconAction>
                      )}
                      <IconAction compact label="Supprimer" onClick={() => setToDelete(page)}>
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </IconAction>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Phones and tablets: cards */}
          <div className="grid grid-cols-1 @min-[36rem]:grid-cols-2 gap-4 @min-[46rem]:hidden">
            {visible.map((page) => {
              const cfg = page.config;
              const image = cfg.mediaItems?.find((m) => m.type === 'image')?.url;
              const stats = statsById.get(page.id);
              const meta = page.adminDisabled ? ADMIN_DISABLED_META : STATUS_META[page.status];
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
                        {page.config.abTest?.enabled && page.config.abTest.status === 'running' && (
                          <span className="shrink-0 text-[11px] font-black px-2 py-0.5 rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1 shadow-2xs">
                            <Split className="w-3 h-3 text-indigo-600" /> A/B Test 50/50
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[13px] text-[#7A808C] truncate">
                        {page.internalName} · modifié {page.updatedAt}
                      </p>
                      <p className="mt-1 text-[15px] font-extrabold text-[#235BF7]">
                        {formatFCFA(cfg.price)}
                      </p>
                      <AdminDisabledNote page={page} />
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

                  {mode === 'catalog' && (
                    <div className="grid grid-cols-2 border-b border-[#F1F3F6]">
                      <SwitchCell
                        label="Boutique"
                        hint={page.config.showInStore === true ? 'Visible' : 'Masqué'}
                        on={page.config.showInStore === true}
                        disabled={page.status === 'inactive' || !onSetShopVisibility}
                        onClick={() =>
                          onSetShopVisibility?.(page.id, page.config.showInStore !== true)
                        }
                      />
                      <SwitchCell
                        label="Page en ligne"
                        hint={
                          page.status === 'published'
                            ? 'Active'
                            : page.status === 'inactive'
                              ? 'Désactivée'
                              : 'Inactive'
                        }
                        on={page.status === 'published'}
                        onClick={() =>
                          onSetStatus(page.id, page.status === 'published' ? 'draft' : 'published')
                        }
                      />
                    </div>
                  )}

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
                        <IconAction
                          label="Publier"
                          onClick={() => onSetStatus(page.id, 'published')}
                        >
                          <Rocket className="w-4 h-4 text-emerald-600" />
                        </IconAction>
                      )}
                      {page.status === 'published' && (
                        <>
                          <IconAction
                            label="Dépublier"
                            onClick={() => onSetStatus(page.id, 'draft')}
                          >
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
        </div>
      )}

      {/* Create Wizard IA */}
      <ProductCreationWizardModal
        isOpen={creating}
        onClose={() => setCreating(false)}
        onCreateProduct={async (patch, name) => {
          await onCreate(name, patch);
          setCreating(false);
        }}
        storeName={subdomain || undefined}
      />

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

const SwitchCell: React.FC<{
  label: string;
  hint: string;
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ label, hint, on, disabled = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={on}
    className="flex items-center justify-between gap-2 px-4 py-3 text-left first:border-r border-[#F1F3F6] hover:bg-[#F6F7F9] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
  >
    <span className="min-w-0">
      <span className="block text-[13px] font-bold text-[#201D1D]">{label}</span>
      <span className="block text-[12px] text-[#7A808C]">{hint}</span>
    </span>
    <span
      className={`shrink-0 w-10 h-6 rounded-full p-0.5 transition-colors ${on ? 'bg-[#235BF7]' : 'bg-[#D5DAE2]'}`}
    >
      <span
        className={`block w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`}
      />
    </span>
  </button>
);

const MiniSwitch: React.FC<{
  label: string;
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ label, on, disabled = false, onClick }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
      on ? 'bg-[#235BF7]' : 'bg-[#D5DAE2]'
    }`}
  >
    <span
      className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : ''}`}
    />
  </button>
);

const IconAction: React.FC<{
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  compact?: boolean;
}> = ({ label, onClick, children, compact = false }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`${compact ? 'w-8 h-8' : 'w-9 h-9'} rounded-xl flex items-center justify-center text-[#3F4654] hover:bg-[#F1F3F6] transition-colors cursor-pointer`}
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
        <SkeletonStats />
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
