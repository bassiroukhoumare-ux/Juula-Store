'use client';

// /adminom moderation: products, shops, accounts, escrow & disputes.
import React, { useEffect, useRef, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Crown,
  ExternalLink,
  EyeOff,
  Images,
  Loader2,
  Lock,
  MessageCircle,
  Package,
  Power,
  RotateCcw,
  ScrollText,
  ShieldAlert,
  Snowflake,
  Sparkles,
  Store,
  Trash2,
  Unlock,
  UserX,
  Wallet,
  X,
} from 'lucide-react';
import {
  Badge,
  Card,
  ErrorBox,
  Kpi,
  Loading,
  SearchBox,
  adminFetch,
  dateFmt,
  dateTimeFmt,
  fShort,
  useAdminData,
  useDebounced,
} from './ui';
import type { MerchantRow } from './GrantModal';
import type { Period } from './Tabs';

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'grey' | 'violet';
export type OnChanged = (message: string) => void;

// ─────────────────────────────────────────────────────────────────────────
// Shared: sheet / dialog + action buttons
// ─────────────────────────────────────────────────────────────────────────
export const Sheet: React.FC<{
  title: string;
  icon: React.ReactNode;
  iconTone: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  /** Large case file (signalement) instead of a confirmation sheet. */
  wide?: boolean;
}> = ({ title, icon, iconTone, subtitle, onClose, children, wide = false }) => {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Escape closes only the top-most sheet (a confirmation over a case file).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const all = document.querySelectorAll('[role="dialog"]');
      if (all[all.length - 1] === box.current) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92dvh] overflow-y-auto bg-[var(--a-surface)] text-[var(--a-text)] rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-7 space-y-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center ${iconTone}`}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-extrabold leading-snug">{title}</h2>
            {subtitle && <div className="mt-0.5 text-[13px] text-[var(--a-muted)]">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-[var(--a-muted)] hover:bg-[var(--a-soft)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const fieldCls =
  'w-full px-4 rounded-xl border border-[var(--a-border)] bg-[var(--a-soft)] text-[15px] focus:outline-none focus:border-[#235BF7]';

const TONE_BTN = {
  danger: 'bg-rose-600 hover:bg-rose-700 text-white',
  primary: 'bg-[#235BF7] hover:bg-[#1B4AD6] text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  ice: 'bg-sky-600 hover:bg-sky-700 text-white',
} as const;

export interface ActionSpec {
  title: string;
  subtitle?: React.ReactNode;
  icon: React.ReactNode;
  iconTone: string;
  confirmLabel: string;
  tone: keyof typeof TONE_BTN;
  /** Free-text reason / report saved in the audit log. */
  reason?: { label: string; placeholder: string; required?: boolean; chips?: string[] };
  /** Strict confirmation: the admin must type this exact text. */
  typeToConfirm?: string;
  warning?: React.ReactNode;
  run: (reason: string, typed: string) => Promise<string>;
}

/** Confirmation sheet of every sanction (reason + optional typed confirmation). */
export const ActionDialog: React.FC<{
  spec: ActionSpec;
  onClose: () => void;
  onDone: OnChanged;
}> = ({ spec, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked =
    busy ||
    (spec.reason?.required && !reason.trim()) ||
    (spec.typeToConfirm !== undefined &&
      typed.trim().toLowerCase() !== spec.typeToConfirm.toLowerCase());
  const submit = async () => {
    if (blocked) return;
    setBusy(true);
    setError(null);
    try {
      onDone(await spec.run(reason.trim(), typed.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'L’action a échoué.');
      setBusy(false);
    }
  };
  return (
    <Sheet
      title={spec.title}
      icon={spec.icon}
      iconTone={spec.iconTone}
      subtitle={spec.subtitle}
      onClose={onClose}
    >
      {spec.warning && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 text-[14px] font-medium leading-relaxed">
          {spec.warning}
        </div>
      )}
      {spec.reason && (
        <div className="space-y-2">
          <label className="block text-[14px] font-semibold" htmlFor="adm-reason">
            {spec.reason.label}
            {!spec.reason.required && (
              <span className="font-normal text-[var(--a-muted)]"> (facultatif)</span>
            )}
          </label>
          <textarea
            id="adm-reason"
            value={reason}
            maxLength={500}
            rows={3}
            onChange={(e) => setReason(e.target.value)}
            placeholder={spec.reason.placeholder}
            className={`${fieldCls} py-3 resize-none`}
          />
          {spec.reason.chips && (
            <div className="flex flex-wrap gap-1.5">
              {spec.reason.chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setReason(c)}
                  className="min-h-8 px-3 rounded-full bg-[var(--a-soft)] text-[12px] font-semibold text-[var(--a-muted)] hover:text-[var(--a-text)] cursor-pointer"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {spec.typeToConfirm !== undefined && (
        <div className="space-y-2">
          <label className="block text-[14px] font-semibold" htmlFor="adm-typed">
            Tapez <span className="font-mono text-rose-600 break-all">{spec.typeToConfirm}</span>{' '}
            pour confirmer
          </label>
          <input
            id="adm-typed"
            value={typed}
            autoComplete="off"
            autoCapitalize="off"
            onChange={(e) => setTyped(e.target.value)}
            className={`${fieldCls} h-12`}
          />
        </div>
      )}
      {error && <p className="text-[14px] font-semibold text-rose-500">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-12 rounded-xl border border-[var(--a-border)] text-[15px] font-semibold cursor-pointer"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={Boolean(blocked)}
          className={`h-12 rounded-xl text-[15px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-45 cursor-pointer ${TONE_BTN[spec.tone]}`}
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {spec.confirmLabel}
        </button>
      </div>
    </Sheet>
  );
};

const ACT_TONE = {
  neutral: 'bg-[var(--a-soft)] text-[var(--a-text)] hover:bg-[var(--a-border)]',
  danger: 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/15',
  warn: 'bg-amber-400/15 text-amber-600 hover:bg-amber-400/25',
  good: 'bg-emerald-500/12 text-emerald-600 hover:bg-emerald-500/20',
  ice: 'bg-sky-500/12 text-sky-600 hover:bg-sky-500/20',
} as const;

const Act: React.FC<{
  tone: keyof typeof ACT_TONE;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ tone, icon, onClick, children, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-10 px-3 inline-flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition-colors cursor-pointer ${ACT_TONE[tone]} ${className}`}
  >
    {icon}
    {children}
  </button>
);

const FilterPills: React.FC<{
  options: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        onClick={() => onChange(o.id)}
        aria-pressed={value === o.id}
        className={`shrink-0 h-10 px-4 rounded-full text-[14px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
          value === o.id
            ? 'bg-[var(--a-text)] text-[var(--a-bg)]'
            : 'bg-[var(--a-surface)] text-[var(--a-muted)] border border-[var(--a-border)] hover:text-[var(--a-text)]'
        }`}
      >
        {o.label}
        {o.count ? ` · ${o.count}` : ''}
      </button>
    ))}
  </div>
);

async function post(url: string, body: unknown, method = 'POST'): Promise<void> {
  await adminFetch(url, { method, body });
}

const storeHref = (sub: string | null) => (sub ? `https://${sub}.juula.store` : null);

// ─────────────────────────────────────────────────────────────────────────
// Produits
// ─────────────────────────────────────────────────────────────────────────
interface AdminProduct {
  id: string;
  title: string;
  price: number;
  status: 'published' | 'draft' | 'disabled';
  disabledReason: string | null;
  image: string | null;
  gallery: string[];
  store: string;
  merchantEmail: string;
  url: string;
  sales: number;
  createdAt: string;
}

const PRODUCT_BADGE: Record<AdminProduct['status'], { label: string; tone: Tone }> = {
  published: { label: 'Publié', tone: 'green' },
  draft: { label: 'Brouillon', tone: 'amber' },
  disabled: { label: 'Désactivé par l’admin', tone: 'red' },
};

const Gallery: React.FC<{ product: AdminProduct; onClose: () => void }> = ({
  product,
  onClose,
}) => {
  const [i, setI] = useState(0);
  return (
    <Sheet
      title={product.title}
      icon={<Images className="w-5 h-5" />}
      iconTone="bg-[#235BF7]/10 text-[#235BF7]"
      subtitle={`${product.store} · ${product.gallery.length} image${product.gallery.length > 1 ? 's' : ''}`}
      onClose={onClose}
    >
      <div className="aspect-square rounded-2xl overflow-hidden bg-[var(--a-soft)]">
        {product.gallery[i] && (
          <img src={product.gallery[i]} alt="" className="w-full h-full object-contain" />
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {product.gallery.map((g, k) => (
          <button
            key={g + k}
            type="button"
            onClick={() => setI(k)}
            aria-label={`Image ${k + 1}`}
            className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 cursor-pointer ${
              k === i ? 'border-[#235BF7]' : 'border-transparent'
            }`}
          >
            <img src={g} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </Sheet>
  );
};

export const ProductsTab: React.FC<{ tick: number; onChanged: OnChanged }> = ({
  tick,
  onChanged,
}) => {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [gallery, setGallery] = useState<AdminProduct | null>(null);
  const [action, setAction] = useState<ActionSpec | null>(null);
  const dq = useDebounced(q);
  const { data, error } = useAdminData<{ products: AdminProduct[] }>(
    `/api/adminom/products?status=${filter}&q=${encodeURIComponent(dq)}`,
    tick,
  );

  const disable = (p: AdminProduct) =>
    setAction({
      title: 'Désactiver ce produit',
      subtitle: `${p.title} · ${p.store}`,
      icon: <EyeOff className="w-5 h-5" />,
      iconTone: 'bg-rose-500/10 text-rose-600',
      confirmLabel: 'Désactiver',
      tone: 'danger',
      reason: {
        label: 'Motif (visible par le vendeur)',
        placeholder: 'Ex : Produit contrefait',
        required: true,
        chips: ['Produit suspect', 'Contrefaçon', 'Produit non conforme', 'Photos trompeuses'],
      },
      run: async (reason) => {
        await post(`/api/adminom/products/${p.id}`, { action: 'disable', reason });
        return `« ${p.title} » est retiré de la vente.`;
      },
    });
  const enable = (p: AdminProduct) =>
    setAction({
      title: 'Réactiver ce produit',
      subtitle: `${p.title} · ${p.store}`,
      icon: <Power className="w-5 h-5" />,
      iconTone: 'bg-emerald-500/12 text-emerald-600',
      confirmLabel: 'Réactiver',
      tone: 'success',
      reason: { label: 'Note interne', placeholder: 'Ex : Vendeur a fourni les justificatifs' },
      run: async (reason) => {
        await post(`/api/adminom/products/${p.id}`, { action: 'enable', reason });
        return `« ${p.title} » est de nouveau en ligne.`;
      },
    });
  const remove = (p: AdminProduct) =>
    setAction({
      title: 'Supprimer définitivement',
      subtitle: `${p.title} · ${p.store}`,
      icon: <Trash2 className="w-5 h-5" />,
      iconTone: 'bg-rose-500/10 text-rose-600',
      confirmLabel: 'Supprimer',
      tone: 'danger',
      warning:
        'Le produit et ses statistiques seront effacés. Les commandes passées restent dans l’historique du vendeur.',
      reason: { label: 'Motif', placeholder: 'Ex : Produit interdit' },
      typeToConfirm: 'SUPPRIMER',
      run: async (reason) => {
        await post(`/api/adminom/products/${p.id}`, { reason }, 'DELETE');
        return `« ${p.title} » a été supprimé.`;
      },
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Produit, boutique ou email du vendeur" />
        <FilterPills
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: 'Tous' },
            { id: 'published', label: 'Publiés' },
            { id: 'draft', label: 'Brouillons' },
            { id: 'disabled', label: 'Désactivés' },
          ]}
        />
      </div>
      {error ? (
        <ErrorBox error={error} />
      ) : !data ? (
        <Loading />
      ) : data.products.length === 0 ? (
        <Card className="text-center text-[var(--a-muted)]">Aucun produit.</Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.products.map((p) => {
            const b = PRODUCT_BADGE[p.status];
            return (
              <Card key={p.id} className="!p-0 overflow-hidden flex flex-col">
                <button
                  type="button"
                  onClick={() => p.gallery.length > 0 && setGallery(p)}
                  aria-label={`Galerie de ${p.title}`}
                  className="relative aspect-[4/3] bg-[var(--a-soft)] cursor-pointer"
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt=""
                      loading="lazy"
                      className={`w-full h-full object-cover ${p.status === 'disabled' ? 'grayscale opacity-60' : ''}`}
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-[var(--a-muted)]">
                      <Package className="w-8 h-8" />
                    </span>
                  )}
                  <span className="absolute top-2.5 left-2.5">
                    <Badge tone={b.tone}>{b.label}</Badge>
                  </span>
                  {p.gallery.length > 1 && (
                    <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 text-white text-[12px] font-bold">
                      <Images className="w-3.5 h-3.5" /> {p.gallery.length}
                    </span>
                  )}
                </button>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div>
                    <p className="text-[15px] font-bold leading-snug line-clamp-2">{p.title}</p>
                    <p className="mt-0.5 text-[16px] font-extrabold tabular-nums text-[#235BF7]">
                      {fShort(p.price)}
                    </p>
                  </div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--a-muted)] hover:text-[#235BF7] min-w-0"
                  >
                    <Store className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{p.store}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                  <p className="text-[12px] text-[var(--a-muted)]">
                    {p.sales} vente{p.sales > 1 ? 's' : ''} · créé le{' '}
                    {dateFmt.format(new Date(p.createdAt))}
                  </p>
                  {p.disabledReason && (
                    <p className="text-[12px] font-semibold text-rose-500 leading-snug">
                      Motif : {p.disabledReason}
                    </p>
                  )}
                  <div className="mt-auto pt-2 grid grid-cols-2 gap-2">
                    {p.status === 'disabled' ? (
                      <Act
                        tone="good"
                        icon={<Power className="w-4 h-4" />}
                        onClick={() => enable(p)}
                      >
                        Réactiver
                      </Act>
                    ) : (
                      <Act
                        tone="warn"
                        icon={<EyeOff className="w-4 h-4" />}
                        onClick={() => disable(p)}
                      >
                        Désactiver
                      </Act>
                    )}
                    <Act
                      tone="danger"
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={() => remove(p)}
                    >
                      Supprimer
                    </Act>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {gallery && <Gallery product={gallery} onClose={() => setGallery(null)} />}
      {action && (
        <ActionDialog
          spec={action}
          onClose={() => setAction(null)}
          onDone={(m) => {
            setAction(null);
            onChanged(m);
          }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Marchands
// ─────────────────────────────────────────────────────────────────────────
type FullMerchant = MerchantRow & {
  joinedAt: string;
  storeId: string;
  whatsapp: string | null;
  logoUrl: string | null;
  accountStatus: 'ACTIVE' | 'SUSPENDED';
  isAdmin: boolean;
  suspended: boolean;
  suspendedReason: string | null;
  published: boolean;
  products: number;
  orders: number;
};

const PlanBadge: React.FC<{ m: { pro: boolean; planExpiresAt: string | null } }> = ({ m }) =>
  m.pro ? (
    <Badge tone="green">
      <Crown className="w-3 h-3" /> PRO{' '}
      {m.planExpiresAt ? `· ${dateFmt.format(new Date(m.planExpiresAt))}` : '· à vie'}
    </Badge>
  ) : (
    <Badge tone="grey">Sans abonnement</Badge>
  );

const Avatar: React.FC<{ logo: string | null; name: string }> = ({ logo, name }) => (
  <span className="w-11 h-11 shrink-0 rounded-2xl overflow-hidden bg-[var(--a-soft)] flex items-center justify-center text-[15px] font-extrabold text-[var(--a-muted)]">
    {logo ? (
      <img src={logo} alt="" className="w-full h-full object-cover" />
    ) : (
      (name.trim()[0] ?? '?').toUpperCase()
    )}
  </span>
);

function accountActions(m: FullMerchant, set: (a: ActionSpec) => void) {
  const who = m.name || m.email;
  return {
    suspend: () =>
      set({
        title: 'Suspendre le compte',
        subtitle: `${who} · ${m.email}`,
        icon: <UserX className="w-5 h-5" />,
        iconTone: 'bg-rose-500/10 text-rose-600',
        confirmLabel: 'Suspendre',
        tone: 'danger',
        warning:
          'Le marchand est déconnecté partout immédiatement et ne peut plus se connecter. Sa boutique reste en l’état (suspendez-la aussi si besoin).',
        reason: {
          label: 'Motif',
          placeholder: 'Ex : Fraude signalée par plusieurs clients',
          required: true,
          chips: ['Fraude', 'Arnaque signalée', 'Usurpation d’identité', 'Non-respect des CGU'],
        },
        run: async (reason) => {
          await post(`/api/adminom/merchants/${m.userId}`, { action: 'suspend', reason });
          return `Le compte ${m.email} est suspendu.`;
        },
      }),
    restore: () =>
      set({
        title: 'Réactiver le compte',
        subtitle: `${who} · ${m.email}`,
        icon: <Unlock className="w-5 h-5" />,
        iconTone: 'bg-emerald-500/12 text-emerald-600',
        confirmLabel: 'Réactiver',
        tone: 'success',
        reason: { label: 'Note interne', placeholder: 'Ex : Situation régularisée' },
        run: async (reason) => {
          await post(`/api/adminom/merchants/${m.userId}`, { action: 'restore', reason });
          return `Le compte ${m.email} est réactivé.`;
        },
      }),
    remove: () =>
      set({
        title: 'Supprimer le compte et la boutique',
        subtitle: `${who} · ${m.storeName}`,
        icon: <Trash2 className="w-5 h-5" />,
        iconTone: 'bg-rose-500/10 text-rose-600',
        confirmLabel: 'Tout supprimer',
        tone: 'danger',
        warning:
          'Action irréversible : compte, boutique, produits, commandes, codes promo et historique de retraits sont effacés. Un résumé est archivé dans le journal d’audit.',
        reason: { label: 'Motif', placeholder: 'Ex : Compte frauduleux', required: true },
        typeToConfirm: m.email,
        run: async (reason, typed) => {
          await post(
            `/api/adminom/merchants/${m.userId}`,
            { confirmEmail: typed, reason },
            'DELETE',
          );
          return `Le compte ${m.email} et sa boutique ont été supprimés.`;
        },
      }),
  };
}

export const MerchantsTab: React.FC<{
  tick: number;
  onGrant: (m: MerchantRow) => void;
  onChanged: OnChanged;
}> = ({ tick, onGrant, onChanged }) => {
  const [q, setQ] = useState('');
  const [action, setAction] = useState<ActionSpec | null>(null);
  const dq = useDebounced(q);
  const { data, error } = useAdminData<{ merchants: FullMerchant[] }>(
    `/api/adminom/merchants?q=${encodeURIComponent(dq)}`,
    tick,
  );
  return (
    <div className="space-y-4">
      <SearchBox
        value={q}
        onChange={setQ}
        placeholder="Rechercher par email, nom ou sous-domaine"
      />
      {error ? (
        <ErrorBox error={error} />
      ) : !data ? (
        <Loading />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <ul className="divide-y divide-[var(--a-border)]">
            {data.merchants.map((m) => {
              const act = accountActions(m, setAction);
              return (
                <li
                  key={m.userId}
                  className="px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Avatar logo={m.logoUrl} name={m.storeName || m.email} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold truncate">{m.name || m.email}</p>
                      <p className="text-[13px] text-[var(--a-muted)] truncate">
                        {m.email} · inscrit le {dateFmt.format(new Date(m.joinedAt))}
                      </p>
                      <p className="text-[13px] text-[var(--a-muted)] truncate">
                        {m.storeName} · {m.products} produit{m.products > 1 ? 's' : ''} · {m.orders}{' '}
                        commande{m.orders > 1 ? 's' : ''}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {m.accountStatus === 'SUSPENDED' ? (
                          <Badge tone="red">
                            <Lock className="w-3 h-3" /> Compte suspendu
                          </Badge>
                        ) : (
                          <Badge tone="blue">Compte actif</Badge>
                        )}
                        <PlanBadge m={m} />
                        {m.suspended && <Badge tone="red">Boutique suspendue</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 lg:justify-end">
                    {m.whatsapp && (
                      <a
                        href={`https://wa.me/${m.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-10 px-3 rounded-xl inline-flex items-center justify-center gap-1.5 bg-[#25D366]/12 text-[#1DA851] text-[13px] font-bold"
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </a>
                    )}
                    <Act
                      tone="warn"
                      icon={<Sparkles className="w-4 h-4" />}
                      onClick={() => onGrant(m)}
                    >
                      Accorder PRO
                    </Act>
                    {!m.isAdmin &&
                      (m.accountStatus === 'SUSPENDED' ? (
                        <Act
                          tone="good"
                          icon={<Unlock className="w-4 h-4" />}
                          onClick={act.restore}
                        >
                          Réactiver
                        </Act>
                      ) : (
                        <Act
                          tone="neutral"
                          icon={<UserX className="w-4 h-4" />}
                          onClick={act.suspend}
                        >
                          Suspendre
                        </Act>
                      ))}
                    {!m.isAdmin && (
                      <Act tone="danger" icon={<Trash2 className="w-4 h-4" />} onClick={act.remove}>
                        Supprimer
                      </Act>
                    )}
                  </div>
                </li>
              );
            })}
            {data.merchants.length === 0 && (
              <li className="px-6 py-10 text-center text-[14px] text-[var(--a-muted)]">
                Aucun marchand.
              </li>
            )}
          </ul>
        </Card>
      )}
      {action && (
        <ActionDialog
          spec={action}
          onClose={() => setAction(null)}
          onDone={(msg) => {
            setAction(null);
            onChanged(msg);
          }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Boutiques
// ─────────────────────────────────────────────────────────────────────────
type AdminStore = FullMerchant & { online: boolean; gmv: number; balance: number };

function storeState(s: AdminStore): { label: string; tone: Tone } {
  if (s.suspended) return { label: 'Suspendue par l’admin', tone: 'red' };
  if (s.online) return { label: 'Ouverte / Active', tone: 'green' };
  return { label: 'Fermée temporairement', tone: 'amber' };
}

export const StoresTab: React.FC<{ tick: number; onChanged: OnChanged }> = ({
  tick,
  onChanged,
}) => {
  const [q, setQ] = useState('');
  const [action, setAction] = useState<ActionSpec | null>(null);
  const dq = useDebounced(q);
  const { data, error } = useAdminData<{ stores: AdminStore[] }>(
    `/api/adminom/stores?q=${encodeURIComponent(dq)}`,
    tick,
  );
  const suspend = (s: AdminStore) =>
    setAction({
      title: 'Fermer / suspendre la boutique',
      subtitle: `${s.storeName}${s.subdomain ? ` · ${s.subdomain}.juula.store` : ''}`,
      icon: <Ban className="w-5 h-5" />,
      iconTone: 'bg-rose-500/10 text-rose-600',
      confirmLabel: 'Suspendre',
      tone: 'danger',
      warning:
        'Les acheteurs verront « Boutique temporairement indisponible » sur la boutique et toutes ses pages produits. Aucune commande ne peut être passée.',
      reason: {
        label: 'Motif',
        placeholder: 'Ex : Enquête en cours sur des colis non livrés',
        required: true,
        chips: ['Colis non livrés', 'Produits interdits', 'Fraude au paiement', 'Litiges répétés'],
      },
      run: async (reason) => {
        await post(`/api/adminom/stores/${s.storeId}`, { action: 'suspend', reason });
        return `${s.storeName} est fermée aux acheteurs.`;
      },
    });
  const reopen = (s: AdminStore) =>
    setAction({
      title: 'Rouvrir la boutique',
      subtitle: s.storeName,
      icon: <Store className="w-5 h-5" />,
      iconTone: 'bg-emerald-500/12 text-emerald-600',
      confirmLabel: 'Rouvrir',
      tone: 'success',
      reason: { label: 'Note interne', placeholder: 'Ex : Litige résolu' },
      run: async (reason) => {
        await post(`/api/adminom/stores/${s.storeId}`, { action: 'reopen', reason });
        return `${s.storeName} est rouverte.`;
      },
    });

  return (
    <div className="space-y-4">
      <SearchBox value={q} onChange={setQ} placeholder="Boutique, propriétaire ou email" />
      {error ? (
        <ErrorBox error={error} />
      ) : !data ? (
        <Loading />
      ) : (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.stores.map((s) => {
            const st = storeState(s);
            const act = accountActions(s, setAction);
            const href = storeHref(s.subdomain);
            return (
              <Card key={s.userId} className="!p-4 sm:!p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Avatar logo={s.logoUrl} name={s.storeName} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-bold truncate">{s.storeName}</p>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 max-w-full text-[13px] font-semibold text-[#235BF7]"
                      >
                        <span className="truncate">{s.subdomain}.juula.store</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    ) : (
                      <p className="text-[13px] text-[var(--a-muted)]">Sans adresse</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <PlanBadge m={s} />
                  {s.accountStatus === 'SUSPENDED' && <Badge tone="red">Compte suspendu</Badge>}
                </div>
                {s.suspendedReason && (
                  <p className="text-[12px] font-semibold text-rose-500">
                    Motif : {s.suspendedReason}
                  </p>
                )}
                <div className="p-3 rounded-2xl bg-[var(--a-soft)] text-[13px] space-y-0.5 min-w-0">
                  <p className="font-semibold truncate">{s.name || 'Propriétaire'}</p>
                  <p className="text-[var(--a-muted)] truncate">{s.email}</p>
                  {s.whatsapp && (
                    <a
                      href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#1DA851]"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> +{s.whatsapp.replace(/\D/g, '')}
                    </a>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-2">
                  {[
                    { k: 'Chiffre d’affaires', v: fShort(s.gmv) },
                    { k: 'Solde en cours', v: fShort(s.balance) },
                    { k: 'Produits', v: String(s.products) },
                    { k: 'Commandes', v: String(s.orders) },
                  ].map((x) => (
                    <div key={x.k} className="p-2.5 rounded-xl border border-[var(--a-border)]">
                      <dt className="text-[11px] text-[var(--a-muted)]">{x.k}</dt>
                      <dd className="text-[15px] font-bold tabular-nums">{x.v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  {s.suspended ? (
                    <Act tone="good" icon={<Store className="w-4 h-4" />} onClick={() => reopen(s)}>
                      Rouvrir
                    </Act>
                  ) : (
                    <Act tone="warn" icon={<Ban className="w-4 h-4" />} onClick={() => suspend(s)}>
                      Suspendre
                    </Act>
                  )}
                  {!s.isAdmin &&
                    (s.accountStatus === 'SUSPENDED' ? (
                      <Act tone="good" icon={<Unlock className="w-4 h-4" />} onClick={act.restore}>
                        Débloquer compte
                      </Act>
                    ) : (
                      <Act
                        tone="neutral"
                        icon={<UserX className="w-4 h-4" />}
                        onClick={act.suspend}
                      >
                        Bloquer compte
                      </Act>
                    ))}
                  {!s.isAdmin && (
                    <Act
                      tone="danger"
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={act.remove}
                      className="col-span-2"
                    >
                      Supprimer compte et boutique
                    </Act>
                  )}
                </div>
              </Card>
            );
          })}
          {data.stores.length === 0 && (
            <Card className="text-center text-[var(--a-muted)]">Aucune boutique.</Card>
          )}
        </div>
      )}
      {action && (
        <ActionDialog
          spec={action}
          onClose={() => setAction(null)}
          onDone={(msg) => {
            setAction(null);
            onChanged(msg);
          }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Litiges & séquestre
// ─────────────────────────────────────────────────────────────────────────
export type DisputeFilter =
  | 'all'
  | 'maturing'
  | 'available'
  | 'withdrawn'
  | 'frozen'
  | 'refunding'
  | 'refunded'
  | 'released';

interface DisputeOrder {
  id: string;
  reference: string;
  product: string;
  amount: number;
  net: number;
  customer: string;
  phone: string;
  method: string;
  orderStatus: string;
  paidAt: string;
  availableAt: string | null;
  finance: 'maturing' | 'available' | 'withdrawn' | 'frozen' | 'refunding' | 'refunded';
  released: boolean;
  frozenReason: string | null;
  frozenAt: string | null;
  closedAt: string | null;
  report: string | null;
  refund: { method: string; phone: string | null; reference: string | null } | null;
  store: string;
  storeWhatsapp: string | null;
}
interface DisputesData {
  totals: {
    volume: number;
    count: number;
    maturing: number;
    available: number;
    frozen: number;
    frozenCount: number;
    refunded: number;
  };
  orders: DisputeOrder[];
}

const FINANCE: Record<DisputeOrder['finance'], { label: string; tone: Tone }> = {
  maturing: { label: 'En maturation 72 h', tone: 'amber' },
  available: { label: 'Disponible pour retrait', tone: 'green' },
  withdrawn: { label: 'Retiré', tone: 'grey' },
  frozen: { label: 'Gelé / en litige', tone: 'blue' },
  refunding: { label: 'Remboursement en cours', tone: 'violet' },
  refunded: { label: 'Remboursé au client', tone: 'red' },
};

const RefundDialog: React.FC<{
  order: DisputeOrder;
  onClose: () => void;
  onDone: OnChanged;
}> = ({ order, onClose, onDone }) => {
  const resuming = order.finance === 'refunding';
  const [mode, setMode] = useState<'moneriz' | 'manual'>(resuming ? 'manual' : 'moneriz');
  const [provider, setProvider] = useState<'wave' | 'orange'>(
    order.method === 'Orange Money' ? 'orange' : 'wave',
  );
  const [phone, setPhone] = useState(order.phone);
  const [name, setName] = useState(order.customer);
  const [reference, setReference] = useState('');
  const [report, setReport] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy || !confirm || !phone.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await adminFetch<{ pending?: boolean }>(`/api/adminom/disputes/${order.id}`, {
        method: 'POST',
        body: {
          action: 'refund',
          report,
          refund: { mode, provider, phone, name, ...(reference.trim() ? { reference } : {}) },
        },
      });
      onDone(
        r.pending
          ? `Remboursement envoyé à Moneriz, confirmation en attente (${order.reference}).`
          : `${order.reference} : client remboursé, dossier clos.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le remboursement a échoué.');
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Rembourser le client lésé"
      icon={<RotateCcw className="w-5 h-5" />}
      iconTone="bg-rose-500/10 text-rose-600"
      subtitle={`${order.reference} · ${order.store}`}
      onClose={onClose}
    >
      <div className="p-4 rounded-2xl bg-[var(--a-soft)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-[var(--a-muted)]">Montant payé par le client</p>
          <p className="text-[24px] font-extrabold tabular-nums">{fShort(order.amount)}</p>
        </div>
        <p className="text-right text-[12px] text-[var(--a-muted)]">
          Retiré définitivement
          <br />
          du compte du vendeur
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[14px] font-semibold">Comment rembourser ?</p>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
          {(
            [
              {
                id: 'moneriz',
                label: 'Envoyer via Moneriz',
                hint: 'Virement Mobile Money immédiat',
                off: resuming,
              },
              {
                id: 'manual',
                label: 'Déjà remboursé',
                hint: 'J’ai envoyé l’argent moi-même',
                off: false,
              },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={o.off}
              onClick={() => setMode(o.id)}
              aria-pressed={mode === o.id}
              className={`min-h-16 p-3 rounded-2xl border-2 text-left disabled:opacity-40 cursor-pointer ${
                mode === o.id ? 'border-[#235BF7] bg-[#235BF7]/8' : 'border-[var(--a-border)]'
              }`}
            >
              <span className="block text-[14px] font-bold">{o.label}</span>
              <span className="block text-[12px] text-[var(--a-muted)]">{o.hint}</span>
            </button>
          ))}
        </div>
        {resuming && (
          <p className="text-[12px] text-[var(--a-muted)]">
            Un virement Moneriz est déjà parti pour cette commande : confirmez-le ici une fois reçu
            par le client.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(['wave', 'orange'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setProvider(p)}
            aria-pressed={provider === p}
            className={`h-11 rounded-xl border-2 text-[14px] font-bold cursor-pointer ${
              provider === p ? 'border-[#235BF7] bg-[#235BF7]/8' : 'border-[var(--a-border)]'
            }`}
          >
            {p === 'wave' ? 'Wave' : 'Orange Money'}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 block">
          <span className="text-[13px] font-semibold">Numéro du client</span>
          <input
            value={phone}
            inputMode="tel"
            onChange={(e) => setPhone(e.target.value)}
            className={`${fieldCls} h-12`}
          />
        </label>
        <label className="space-y-1.5 block">
          <span className="text-[13px] font-semibold">Nom du client</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${fieldCls} h-12`}
          />
        </label>
      </div>
      {mode === 'manual' && (
        <label className="space-y-1.5 block">
          <span className="text-[13px] font-semibold">
            Référence du transfert{' '}
            <span className="font-normal text-[var(--a-muted)]">(facultatif)</span>
          </span>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ex : ID de transaction Wave"
            className={`${fieldCls} h-12`}
          />
        </label>
      )}
      <label className="space-y-1.5 block">
        <span className="text-[13px] font-semibold">Rapport d’incident (archivé)</span>
        <textarea
          value={report}
          rows={3}
          maxLength={2000}
          onChange={(e) => setReport(e.target.value)}
          placeholder="Ex : Colis jamais livré, vendeur injoignable depuis 5 jours."
          className={`${fieldCls} py-3 resize-none`}
        />
      </label>
      <label className="flex items-start gap-3 text-[14px] cursor-pointer">
        <input
          type="checkbox"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-rose-600"
        />
        <span>
          Je confirme le remboursement de <strong>{fShort(order.amount)}</strong> au client
          {mode === 'moneriz' ? ' (l’argent part immédiatement depuis le compte Moneriz).' : '.'}
        </span>
      </label>
      {error && <p className="text-[14px] font-semibold text-rose-500">{error}</p>}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!confirm || busy || !phone.trim()}
        className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-45 text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
        {mode === 'moneriz' ? 'Rembourser maintenant' : 'Clore : client remboursé'}
      </button>
    </Sheet>
  );
};

const AUDIT_LABEL: Record<string, string> = {
  'product.disable': 'Produit désactivé',
  'product.enable': 'Produit réactivé',
  'product.delete': 'Produit supprimé',
  'store.suspend': 'Boutique suspendue',
  'store.reopen': 'Boutique rouverte',
  'user.suspend': 'Compte suspendu',
  'user.restore': 'Compte réactivé',
  'user.delete': 'Compte supprimé',
  'order.freeze': 'Commande gelée',
  'order.release': 'Fonds libérés',
  'order.refund': 'Client remboursé',
  'order.refund_pending': 'Remboursement envoyé',
  'store.grant_pro': 'Accès PRO offert',
};

const AuditLog: React.FC<{ tick: number }> = ({ tick }) => {
  const { data } = useAdminData<{
    actions: { id: string; action: string; target: string; reason: string | null; at: string }[];
  }>('/api/adminom/audit', tick);
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-[var(--a-border)] flex items-center gap-2">
        <ScrollText className="w-5 h-5 text-[var(--a-muted)]" />
        <div>
          <h3 className="text-[16px] font-extrabold">Journal des sanctions</h3>
          <p className="text-[13px] text-[var(--a-muted)]">
            Chaque action est enregistrée, avec son motif.
          </p>
        </div>
      </div>
      {!data ? (
        <p className="px-6 py-8 text-center text-[14px] text-[var(--a-muted)]">Chargement…</p>
      ) : data.actions.length === 0 ? (
        <p className="px-6 py-8 text-center text-[14px] text-[var(--a-muted)]">
          Aucune action pour l’instant.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--a-border)] max-h-[420px] overflow-y-auto">
          {data.actions.map((a) => (
            <li key={a.id} className="px-5 sm:px-6 py-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">
                  {AUDIT_LABEL[a.action] ?? a.action}{' '}
                  <span className="font-normal text-[var(--a-muted)] break-all">{a.target}</span>
                </p>
                {a.reason && (
                  <p className="text-[12px] text-[var(--a-muted)] line-clamp-2">{a.reason}</p>
                )}
              </div>
              <p className="shrink-0 text-[12px] text-[var(--a-muted)] tabular-nums">
                {dateTimeFmt.format(new Date(a.at))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export const DisputesTab: React.FC<{
  period: Period;
  status: DisputeFilter;
  tick: number;
  onChanged: OnChanged;
}> = ({ period, status, tick, onChanged }) => {
  const [q, setQ] = useState('');
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [refund, setRefund] = useState<DisputeOrder | null>(null);
  const dq = useDebounced(q);
  const { data, error } = useAdminData<DisputesData>(
    `/api/adminom/disputes?period=${period}&status=${status}&q=${encodeURIComponent(dq)}`,
    tick,
  );

  const freeze = (o: DisputeOrder) =>
    setAction({
      title: 'Geler cette commande',
      subtitle: `${o.reference} · ${fShort(o.amount)} · ${o.store}`,
      icon: <Snowflake className="w-5 h-5" />,
      iconTone: 'bg-sky-500/12 text-sky-600',
      confirmLabel: 'Geler les fonds',
      tone: 'ice',
      warning: (
        <>
          Les fonds ne tomberont <strong>jamais</strong> dans le solde retirable du vendeur tant que
          le litige n’est pas levé, même après 72 h. Le vendeur est prévenu dans son tableau de
          bord.
          {o.finance === 'withdrawn' &&
            ' Cette somme est déjà retirée : elle sera déduite de ses prochains encaissements.'}
        </>
      ),
      reason: {
        label: 'Motif du gel',
        placeholder: 'Ex : Client signale un colis non reçu',
        required: true,
        chips: [
          'Colis non reçu',
          'Produit endommagé',
          'Produit non conforme',
          'Suspicion d’arnaque',
        ],
      },
      run: async (reason) => {
        await post(`/api/adminom/disputes/${o.id}`, { action: 'freeze', reason });
        return `${o.reference} est gelée : fonds bloqués.`;
      },
    });
  const release = (o: DisputeOrder) =>
    setAction({
      title: 'Libérer les fonds au vendeur',
      subtitle: `${o.reference} · ${fShort(o.net)} pour ${o.store}`,
      icon: <CheckCircle2 className="w-5 h-5" />,
      iconTone: 'bg-emerald-500/12 text-emerald-600',
      confirmLabel: 'Libérer les fonds',
      tone: 'success',
      reason: {
        label: 'Rapport de clôture',
        placeholder: 'Ex : Preuve de livraison signée fournie par le vendeur',
        required: true,
        chips: [
          'Preuve de livraison fournie',
          'Client a confirmé la réception',
          'Litige retiré par le client',
        ],
      },
      run: async (report) => {
        await post(`/api/adminom/disputes/${o.id}`, { action: 'release', report });
        return `${o.reference} : fonds rendus au vendeur, dossier clos.`;
      },
    });

  const t = data?.totals;
  return (
    <div className="space-y-4">
      {t && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Kpi
            label="Paiements en ligne"
            value={fShort(t.volume)}
            hint={`${t.count} paiement${t.count > 1 ? 's' : ''} sur ${period} jours`}
            icon={<Wallet className="w-5 h-5" />}
            tone="bg-violet-500/12 text-violet-500"
          />
          <Kpi
            label="En maturation 72 h"
            value={fShort(t.maturing)}
            hint={`disponible : ${fShort(t.available)}`}
            icon={<Lock className="w-5 h-5" />}
            tone="bg-amber-500/12 text-amber-500"
          />
          <Kpi
            label="Gelé / en litige"
            value={fShort(t.frozen)}
            valueClass={t.frozenCount > 0 ? 'text-sky-500' : ''}
            hint={`${t.frozenCount} dossier${t.frozenCount > 1 ? 's' : ''} ouvert${t.frozenCount > 1 ? 's' : ''}`}
            icon={<Snowflake className="w-5 h-5" />}
            tone="bg-sky-500/12 text-sky-500"
          />
          <Kpi
            label="Remboursé"
            value={fShort(t.refunded)}
            hint="aux clients lésés"
            icon={<RotateCcw className="w-5 h-5" />}
            tone="bg-rose-500/12 text-rose-500"
          />
        </div>
      )}
      <SearchBox value={q} onChange={setQ} placeholder="Référence, client, téléphone ou boutique" />
      {error ? (
        <ErrorBox error={error} />
      ) : !data ? (
        <Loading />
      ) : data.orders.length === 0 ? (
        <Card className="text-center text-[var(--a-muted)]">Aucun paiement pour ces filtres.</Card>
      ) : (
        <ul className="space-y-3">
          {data.orders.map((o) => {
            const f = FINANCE[o.finance];
            const open = o.finance === 'frozen' || o.finance === 'refunding';
            return (
              <li key={o.id}>
                <Card className={`!p-4 sm:!p-5 ${open ? '!border-sky-400/60' : ''}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-extrabold tabular-nums">{o.reference}</p>
                        <Badge tone={f.tone}>{f.label}</Badge>
                        {o.released && <Badge tone="green">Litige clos · libéré</Badge>}
                      </div>
                      <p className="text-[13px] text-[var(--a-muted)]">
                        {dateTimeFmt.format(new Date(o.paidAt))} · {o.method} · {o.product}
                      </p>
                      <div className="grid gap-1 sm:grid-cols-2 text-[13px]">
                        <p className="min-w-0 truncate">
                          <span className="text-[var(--a-muted)]">Client : </span>
                          <span className="font-semibold">{o.customer}</span>{' '}
                          <a href={`tel:${o.phone}`} className="text-[#235BF7] font-semibold">
                            {o.phone}
                          </a>
                        </p>
                        <p className="min-w-0 truncate">
                          <span className="text-[var(--a-muted)]">Vendeur : </span>
                          <span className="font-semibold">{o.store}</span>
                          {o.storeWhatsapp && (
                            <a
                              href={`https://wa.me/${o.storeWhatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`WhatsApp ${o.store}`}
                              className="ml-1.5 inline-flex align-middle text-[#1DA851]"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                        </p>
                      </div>
                      {o.finance === 'maturing' && o.availableAt && (
                        <p className="text-[12px] text-[var(--a-muted)]">
                          Disponible pour le vendeur le{' '}
                          {dateTimeFmt.format(new Date(o.availableAt))}
                        </p>
                      )}
                      {o.frozenReason && (
                        <p className="text-[13px] font-semibold text-sky-600">
                          <ShieldAlert className="inline w-4 h-4 -mt-0.5 mr-1" />
                          Motif : {o.frozenReason}
                        </p>
                      )}
                      {o.report && (
                        <p className="text-[12px] text-[var(--a-muted)]">Rapport : {o.report}</p>
                      )}
                      {o.refund && (
                        <p className="text-[12px] text-[var(--a-muted)]">
                          Remboursé {o.refund.method === 'manual' ? 'manuellement' : 'via Moneriz'}
                          {o.refund.phone ? ` au ${o.refund.phone}` : ''}
                          {o.refund.reference ? ` · réf. ${o.refund.reference}` : ''}
                          {o.closedAt ? ` · ${dateTimeFmt.format(new Date(o.closedAt))}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 lg:w-60 lg:items-stretch">
                      <div className="flex items-baseline justify-between lg:justify-end gap-3">
                        <span className="text-[12px] text-[var(--a-muted)] lg:hidden">Montant</span>
                        <p className="text-[20px] font-extrabold tabular-nums">
                          {fShort(o.amount)}
                        </p>
                      </div>
                      {o.finance !== 'refunded' &&
                        o.finance !== 'refunding' &&
                        !o.released &&
                        !open && (
                          <Act
                            tone="ice"
                            icon={<Snowflake className="w-4 h-4" />}
                            onClick={() => freeze(o)}
                          >
                            Geler / bloquer les fonds
                          </Act>
                        )}
                      {o.released && o.finance !== 'refunded' && (
                        <Act
                          tone="ice"
                          icon={<Snowflake className="w-4 h-4" />}
                          onClick={() => freeze(o)}
                        >
                          Geler à nouveau
                        </Act>
                      )}
                      {o.finance === 'frozen' && (
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                          <Act
                            tone="good"
                            icon={<CheckCircle2 className="w-4 h-4" />}
                            onClick={() => release(o)}
                          >
                            Libérer au vendeur
                          </Act>
                          <Act
                            tone="danger"
                            icon={<RotateCcw className="w-4 h-4" />}
                            onClick={() => setRefund(o)}
                          >
                            Rembourser client
                          </Act>
                        </div>
                      )}
                      {o.finance === 'refunding' && (
                        <Act
                          tone="danger"
                          icon={<RotateCcw className="w-4 h-4" />}
                          onClick={() => setRefund(o)}
                        >
                          Confirmer le remboursement
                        </Act>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <AuditLog tick={tick} />
      {action && (
        <ActionDialog
          spec={action}
          onClose={() => setAction(null)}
          onDone={(msg) => {
            setAction(null);
            onChanged(msg);
          }}
        />
      )}
      {refund && (
        <RefundDialog
          order={refund}
          onClose={() => setRefund(null)}
          onDone={(msg) => {
            setRefund(null);
            onChanged(msg);
          }}
        />
      )}
    </div>
  );
};
