'use client';

// /adminom « Signalements »: list, case file, proofs, sanctions, e-mail replies.
import React, { useEffect, useState } from 'react';
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  EyeOff,
  Flag,
  Images,
  Loader2,
  Mail,
  MessagesSquare,
  MessageCircle,
  Package,
  Send,
  Snowflake,
  Store,
  X,
} from 'lucide-react';
import {
  Badge,
  Card,
  ErrorBox,
  Loading,
  SearchBox,
  adminFetch,
  dateTimeFmt,
  fShort,
  useAdminData,
  useDebounced,
  useMinWidth,
} from './ui';
import { ActionDialog, Sheet, type ActionSpec, type OnChanged } from './Moderation';
import { REPORT_REPLY_TEMPLATES, REPORT_STATUSES, type ReportStatus } from '@/lib/store/reports';

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'grey' | 'violet';
export type ReportFilter = 'all' | ReportStatus;

const STATUS: Record<ReportStatus, { label: string; tone: Tone }> = {
  new: { label: 'Nouveau', tone: 'red' },
  investigating: { label: 'En investigation', tone: 'amber' },
  resolved: { label: 'Résolu', tone: 'green' },
  dismissed: { label: 'Classé sans suite', tone: 'grey' },
};

interface ReportRow {
  id: string;
  caseRef: string;
  createdAt: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  type: 'store' | 'product';
  target: string;
  storeName: string | null;
  reason: string;
  photos: number;
  replies: number;
  unreadReplies: number;
  status: ReportStatus;
  unread: boolean;
}

interface ReportFull {
  id: string;
  caseRef: string;
  createdAt: string;
  status: ReportStatus;
  reporter: { name: string; email: string; phone: string };
  reason: string;
  description: string;
  images: string[];
  pageUrl: string | null;
  ip: string | null;
  target: {
    type: 'store' | 'product';
    label: string;
    storeName: string | null;
    storeId: string | null;
    storeUrl: string | null;
    storeSuspended: boolean;
    storeWhatsapp: string | null;
    merchantEmail: string | null;
    productTitle: string | null;
    productId: string | null;
    productUrl: string | null;
    productDisabled: boolean;
    deleted: boolean;
  };
  orders: {
    id: string;
    reference: string;
    product: string;
    amount: number;
    customer: string;
    phone: string;
    paidAt: string | null;
    matchesReporter: boolean;
    frozen: boolean;
    refunded: boolean;
  }[];
  messages: {
    id: string;
    kind: string;
    subject: string;
    body: string;
    status: string;
    at: string;
    fromEmail: string | null;
    attachments: string[];
    agent: string | null;
    unread: boolean;
  }[];
  inboundEnabled: boolean;
}

const waHref = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

// ─────────────────────────────────────────────────────────────────────────
// Lightbox (proofs, full screen)
// ─────────────────────────────────────────────────────────────────────────
const Lightbox: React.FC<{ images: string[]; start: number; onClose: () => void }> = ({
  images,
  start,
  onClose,
}) => {
  const [i, setI] = useState(start);
  const go = (d: number) => setI((v) => (v + d + images.length) % images.length);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preuves"
      className="fixed inset-0 z-[110] bg-black/95 flex flex-col"
      onClick={onClose}
    >
      <div className="h-14 px-4 flex items-center justify-between text-white">
        <span className="text-[14px] font-semibold tabular-nums">
          Preuve {i + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16">
        <img
          src={images[i]}
          alt={`Preuve ${i + 1}`}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Précédente"
              className="absolute left-2 sm:left-4 w-12 h-12 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Suivante"
              className="absolute right-2 sm:right-4 w-12 h-12 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
      <a
        href={images[i]}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mx-auto my-4 inline-flex items-center gap-1.5 text-[13px] text-white/80 hover:text-white"
      >
        Ouvrir l’original <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Case file
// ─────────────────────────────────────────────────────────────────────────
const SanctionBtn: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: string;
  children: React.ReactNode;
}> = ({ icon, onClick, disabled, tone, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`min-h-11 px-3 rounded-xl inline-flex items-center justify-center gap-1.5 text-[13px] font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${tone}`}
  >
    {icon}
    {children}
  </button>
);

const Initials: React.FC<{ name: string }> = ({ name }) => (
  <span className="mt-1 w-8 h-8 shrink-0 rounded-full bg-[var(--a-text)] text-[var(--a-bg)] text-[12px] font-bold flex items-center justify-center">
    {name
      .split(/\s+/)
      .map((w) => w[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase()}
  </span>
);

const Thumbs: React.FC<{ images: string[]; onOpen: (i: number) => void }> = ({ images, onOpen }) =>
  images.length === 0 ? null : (
    <ul className="flex flex-wrap gap-2 pt-1">
      {images.map((src, i) => (
        <li key={src}>
          <button
            type="button"
            onClick={() => onOpen(i)}
            aria-label={`Voir la preuve ${i + 1}`}
            className="block w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[var(--a-border)] cursor-zoom-in"
          >
            <img src={src} alt="" className="w-full h-full object-cover" />
          </button>
        </li>
      ))}
    </ul>
  );

const ReportCase: React.FC<{ id: string; onClose: () => void; onChanged: OnChanged }> = ({
  id,
  onClose,
  onChanged,
}) => {
  const [tick, setTick] = useState(0);
  const { data, error } = useAdminData<{ report: ReportFull }>(`/api/adminom/reports/${id}`, tick);
  const [light, setLight] = useState<{ images: string[]; i: number } | null>(null);
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const r = data?.report;

  useEffect(() => {
    if (!r || subject) return;
    const what = r.target.productTitle ?? r.target.storeName ?? 'votre commande';
    setSubject(`[Juula Store Support] Suite à votre signalement concernant ${what}`);
  }, [r, subject]);

  const reload = (msg?: string) => {
    setTick((t) => t + 1);
    if (msg) onChanged(msg);
  };

  const fill = (tpl: string) => {
    if (!r) return;
    const first = r.reporter.name.trim().split(/\s+/)[0] ?? '';
    setBody(tpl.replaceAll('{prenom}', first).replaceAll('{cible}', r.target.label));
  };

  const send = async () => {
    if (!r || sending || subject.trim().length < 3 || body.trim().length < 10) return;
    setSending(true);
    setSendErr(null);
    try {
      await adminFetch(`/api/adminom/reports/${r.id}`, {
        method: 'POST',
        body: { action: 'reply', subject, body },
      });
      setBody('');
      reload(`Réponse envoyée à ${r.reporter.email}.`);
    } catch (e) {
      setSendErr(e instanceof Error ? e.message : 'L’envoi a échoué.');
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (status: ReportStatus) => {
    if (!r || statusBusy || r.status === status) return;
    setStatusBusy(true);
    try {
      await adminFetch(`/api/adminom/reports/${r.id}`, {
        method: 'POST',
        body: { action: 'status', status },
      });
      reload(`Signalement ${r.caseRef} : ${STATUS[status].label.toLowerCase()}.`);
    } finally {
      setStatusBusy(false);
    }
  };

  const freeze = (o: ReportFull['orders'][number]) =>
    setAction({
      title: 'Geler la commande associée',
      subtitle: `${o.reference} · ${fShort(o.amount)}`,
      icon: <Snowflake className="w-5 h-5" />,
      iconTone: 'bg-sky-500/12 text-sky-600',
      confirmLabel: 'Geler les fonds',
      tone: 'ice',
      reason: {
        label: 'Motif du gel',
        placeholder: 'Ex : Signalement client',
        required: true,
        chips: [`Signalement ${r?.caseRef ?? ''} : ${r?.reason ?? ''}`],
      },
      run: async (reason) => {
        await adminFetch(`/api/adminom/disputes/${o.id}`, {
          method: 'POST',
          body: { action: 'freeze', reason },
        });
        reload();
        return `${o.reference} est gelée.`;
      },
    });
  const disableProduct = () =>
    r?.target.productId &&
    setAction({
      title: 'Désactiver le produit',
      subtitle: r.target.productTitle ?? '',
      icon: <EyeOff className="w-5 h-5" />,
      iconTone: 'bg-rose-500/10 text-rose-600',
      confirmLabel: 'Désactiver',
      tone: 'danger',
      reason: {
        label: 'Motif (visible par le vendeur)',
        placeholder: 'Ex : Produit contrefait',
        required: true,
        chips: [r.reason],
      },
      run: async (reason) => {
        await adminFetch(`/api/adminom/products/${r.target.productId}`, {
          method: 'POST',
          body: { action: 'disable', reason },
        });
        reload();
        return 'Produit retiré de la vente.';
      },
    });
  const suspendStore = () =>
    r?.target.storeId &&
    setAction({
      title: 'Suspendre la boutique',
      subtitle: r.target.storeName ?? '',
      icon: <Ban className="w-5 h-5" />,
      iconTone: 'bg-rose-500/10 text-rose-600',
      confirmLabel: 'Suspendre',
      tone: 'danger',
      warning: 'Les acheteurs verront « Boutique temporairement indisponible ».',
      reason: {
        label: 'Motif',
        placeholder: 'Ex : Signalements répétés',
        required: true,
        chips: [r.reason],
      },
      run: async (reason) => {
        await adminFetch(`/api/adminom/stores/${r.target.storeId}`, {
          method: 'POST',
          body: { action: 'suspend', reason },
        });
        reload();
        return `${r.target.storeName ?? 'La boutique'} est suspendue.`;
      },
    });

  return (
    <Sheet
      wide
      title={r ? `Signalement ${r.caseRef}` : 'Signalement'}
      icon={<Flag className="w-5 h-5" />}
      iconTone="bg-rose-500/10 text-rose-600"
      subtitle={r ? `${dateTimeFmt.format(new Date(r.createdAt))} · ${r.reason}` : undefined}
      onClose={onClose}
    >
      {error ? (
        <p className="text-rose-500 font-semibold">{error}</p>
      ) : !r ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--a-muted)]" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Status */}
          <div className="-mx-1 px-1 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {REPORT_STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => void setStatus(s.id)}
                aria-pressed={r.status === s.id}
                className={`shrink-0 h-10 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap cursor-pointer ${
                  r.status === s.id
                    ? 'bg-[var(--a-text)] text-[var(--a-bg)]'
                    : 'bg-[var(--a-soft)] text-[var(--a-muted)] hover:text-[var(--a-text)]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {/* Reporter */}
            <div className="p-4 rounded-2xl bg-[var(--a-soft)] space-y-2 min-w-0">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--a-muted)]">
                Plaignant
              </p>
              <p className="text-[16px] font-bold truncate">{r.reporter.name}</p>
              <a
                href={`mailto:${r.reporter.email}`}
                className="flex items-center gap-1.5 text-[14px] text-[#235BF7] font-semibold min-w-0"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate">{r.reporter.email}</span>
              </a>
              <p className="text-[14px] tabular-nums">{r.reporter.phone}</p>
              <a
                href={waHref(
                  r.reporter.phone,
                  `Bonjour ${r.reporter.name.split(' ')[0]}, l’équipe sécurité Juula Store vous contacte au sujet de votre signalement ${r.caseRef}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 w-full min-h-11 rounded-xl bg-[#25D366] text-white text-[14px] font-bold"
              >
                <MessageCircle className="w-4 h-4" /> Discuter sur WhatsApp
              </a>
            </div>

            {/* Target + sanctions */}
            <div className="p-4 rounded-2xl border border-[var(--a-border)] space-y-2 min-w-0">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--a-muted)]">
                Cible · {r.target.type === 'product' ? 'Produit' : 'Boutique'}
              </p>
              {r.target.productTitle && (
                <a
                  href={r.target.productUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[15px] font-bold min-w-0 hover:text-[#235BF7]"
                >
                  <Package className="w-4 h-4 shrink-0" />
                  <span className="truncate">{r.target.productTitle}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              )}
              <a
                href={r.target.storeUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[14px] font-semibold min-w-0 hover:text-[#235BF7]"
              >
                <Store className="w-4 h-4 shrink-0" />
                <span className="truncate">{r.target.storeName ?? '—'}</span>
                {r.target.storeUrl && <ExternalLink className="w-3.5 h-3.5 shrink-0" />}
              </a>
              {r.target.merchantEmail && (
                <p className="text-[13px] text-[var(--a-muted)] truncate">
                  Vendeur : {r.target.merchantEmail}
                  {r.target.storeWhatsapp && (
                    <a
                      href={waHref(r.target.storeWhatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="WhatsApp du vendeur"
                      className="ml-1.5 inline-flex align-middle text-[#1DA851]"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                </p>
              )}
              {r.target.deleted && <Badge tone="grey">Boutique supprimée</Badge>}
              <div className="pt-1 flex flex-wrap gap-1.5">
                {r.target.storeSuspended && <Badge tone="red">Boutique suspendue</Badge>}
                {r.target.productDisabled && <Badge tone="red">Produit désactivé</Badge>}
              </div>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 pt-1">
                {r.target.productId && (
                  <SanctionBtn
                    icon={<EyeOff className="w-4 h-4" />}
                    onClick={() => disableProduct()}
                    disabled={r.target.productDisabled}
                    tone="bg-amber-400/15 text-amber-600"
                  >
                    Désactiver le produit
                  </SanctionBtn>
                )}
                {r.target.storeId && (
                  <SanctionBtn
                    icon={<Ban className="w-4 h-4" />}
                    onClick={() => suspendStore()}
                    disabled={r.target.storeSuspended}
                    tone="bg-rose-500/10 text-rose-600"
                  >
                    Suspendre la boutique
                  </SanctionBtn>
                )}
              </div>
            </div>
          </div>

          {/* Related orders */}
          {r.orders.length > 0 && (
            <div className="space-y-2">
              <p className="text-[14px] font-bold">Commandes payées en ligne de cette boutique</p>
              <ul className="space-y-2">
                {r.orders.map((o) => (
                  <li
                    key={o.id}
                    className={`p-3 rounded-2xl border flex flex-col min-[480px]:flex-row min-[480px]:items-center gap-2 ${
                      o.matchesReporter
                        ? 'border-sky-400/60 bg-sky-500/5'
                        : 'border-[var(--a-border)]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold tabular-nums">
                        {o.reference} · {fShort(o.amount)}
                      </p>
                      <p className="text-[12px] text-[var(--a-muted)] truncate">
                        {o.customer} · {o.phone}
                        {o.paidAt ? ` · ${dateTimeFmt.format(new Date(o.paidAt))}` : ''}
                      </p>
                      {o.matchesReporter && (
                        <p className="text-[12px] font-semibold text-sky-600">
                          Même numéro que le plaignant
                        </p>
                      )}
                    </div>
                    {o.refunded ? (
                      <Badge tone="red">Remboursée</Badge>
                    ) : o.frozen ? (
                      <Badge tone="blue">Gelée</Badge>
                    ) : (
                      <SanctionBtn
                        icon={<Snowflake className="w-4 h-4" />}
                        onClick={() => freeze(o)}
                        tone="bg-sky-500/12 text-sky-600"
                      >
                        Geler la commande
                      </SanctionBtn>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Conversation (timeline) */}
          <div className="space-y-3">
            <p className="text-[15px] font-extrabold flex items-center gap-2">
              <MessagesSquare className="w-4 h-4" /> Conversation avec le plaignant
            </p>
            <ol className="space-y-3">
              {/* 1. The report itself */}
              <li className="flex gap-2.5 max-w-[92%]">
                <Initials name={r.reporter.name} />
                <div className="min-w-0 rounded-2xl rounded-tl-md bg-[var(--a-soft)] p-3.5 sm:p-4 space-y-2">
                  <p className="text-[12px] text-[var(--a-muted)]">
                    <span className="font-bold text-[var(--a-text)]">{r.reporter.name}</span> ·
                    signalement · {dateTimeFmt.format(new Date(r.createdAt))}
                  </p>
                  <p className="text-[14px] font-bold">{r.reason}</p>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                    {r.description}
                  </p>
                  <Thumbs images={r.images} onOpen={(i) => setLight({ images: r.images, i })} />
                  <p className="text-[11px] text-[var(--a-muted)] break-all">
                    {r.pageUrl ? `Page : ${r.pageUrl}` : ''}
                    {r.ip ? ` · IP ${r.ip}` : ''}
                  </p>
                </div>
              </li>
              {r.messages.map((m) =>
                m.kind === 'ack' ? (
                  <li key={m.id} className="flex justify-center">
                    <span className="px-3 py-1 rounded-full bg-[var(--a-soft)] text-[12px] text-[var(--a-muted)] text-center">
                      {m.status === 'sent'
                        ? 'Accusé de réception envoyé automatiquement'
                        : 'Accusé de réception non envoyé'}{' '}
                      · {dateTimeFmt.format(new Date(m.at))}
                    </span>
                  </li>
                ) : m.kind === 'inbound' ? (
                  <li key={m.id} className="flex gap-2.5 max-w-[92%]">
                    <Initials name={r.reporter.name} />
                    <div
                      className={`min-w-0 rounded-2xl rounded-tl-md p-3.5 sm:p-4 space-y-1.5 ${
                        m.unread
                          ? 'bg-violet-500/10 ring-1 ring-violet-500/40'
                          : 'bg-[var(--a-soft)]'
                      }`}
                    >
                      <p className="text-[12px] text-[var(--a-muted)] flex flex-wrap items-center gap-x-1.5">
                        <span className="font-bold text-[var(--a-text)]">{r.reporter.name}</span>
                        <span>· réponse par e-mail · {dateTimeFmt.format(new Date(m.at))}</span>
                        {m.unread && <Badge tone="violet">Nouveau</Badge>}
                      </p>
                      {m.fromEmail && m.fromEmail !== r.reporter.email.toLowerCase() && (
                        <p className="text-[12px] font-semibold text-amber-600">
                          Envoyé depuis une autre adresse : {m.fromEmail}
                        </p>
                      )}
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                        {m.body}
                      </p>
                      <Thumbs
                        images={m.attachments}
                        onOpen={(i) => setLight({ images: m.attachments, i })}
                      />
                    </div>
                  </li>
                ) : (
                  <li key={m.id} className="flex justify-end">
                    <div className="max-w-[92%] min-w-0 rounded-2xl rounded-tr-md bg-[#235BF7] text-white p-3.5 sm:p-4 space-y-1.5">
                      <p className="text-[12px] text-white/75 flex flex-wrap gap-x-1.5">
                        <span className="font-bold text-white">{m.agent ?? 'Équipe sécurité'}</span>
                        <span>· {dateTimeFmt.format(new Date(m.at))}</span>
                        {m.status !== 'sent' && (
                          <span className="font-bold text-amber-200">· non envoyé</span>
                        )}
                      </p>
                      <p className="text-[12px] font-semibold text-white/85 break-words">
                        {m.subject}
                      </p>
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                        {m.body}
                      </p>
                    </div>
                  </li>
                ),
              )}
            </ol>
            {!r.inboundEnabled && (
              <p className="text-[12px] text-[var(--a-muted)]">
                Les réponses du plaignant apparaîtront ici dès que la réception d’e-mails Resend
                sera configurée (REPORT_INBOUND_DOMAIN).
              </p>
            )}
          </div>

          {/* Quick reply */}
          <div className="sticky bottom-0 -mx-5 sm:-mx-7 px-5 sm:px-7 pt-3 pb-1 bg-[var(--a-surface)] border-t border-[var(--a-border)] space-y-2.5">
            <div className="-mx-1 px-1 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {REPORT_REPLY_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => fill(t.body)}
                  className="shrink-0 min-h-9 px-3 rounded-full bg-[var(--a-soft)] text-[12px] font-semibold text-[var(--a-muted)] hover:text-[var(--a-text)] whitespace-nowrap cursor-pointer"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input
              value={subject}
              maxLength={200}
              onChange={(e) => setSubject(e.target.value)}
              aria-label="Objet de l’e-mail"
              className="w-full h-11 px-4 rounded-xl border border-[var(--a-border)] bg-[var(--a-soft)] text-[14px] focus:outline-none focus:border-[#235BF7]"
            />
            <div className="flex items-end gap-2">
              <textarea
                value={body}
                rows={body ? 6 : 2}
                maxLength={5000}
                onChange={(e) => setBody(e.target.value)}
                aria-label="Votre réponse"
                placeholder="Répondre officiellement au plaignant…"
                className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-[var(--a-border)] bg-[var(--a-soft)] text-[15px] leading-relaxed resize-y focus:outline-none focus:border-[#235BF7]"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || subject.trim().length < 3 || body.trim().length < 10}
                aria-label="Envoyer la réponse"
                className="shrink-0 w-12 h-12 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] disabled:opacity-45 text-white inline-flex items-center justify-center cursor-pointer"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            {sendErr && <p className="text-[13px] font-semibold text-rose-500">{sendErr}</p>}
            <p className="text-[11px] text-[var(--a-muted)]">
              Envoyé par e-mail à {r.reporter.email} depuis l’adresse officielle Juula Store.
            </p>
          </div>
        </div>
      )}
      {light && <Lightbox images={light.images} start={light.i} onClose={() => setLight(null)} />}
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
    </Sheet>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// List
// ─────────────────────────────────────────────────────────────────────────
export const ReportsPanel: React.FC<{
  status: ReportFilter;
  tick: number;
  onChanged: OnChanged;
  /** Opens this case (from the notification bell). */
  focusId?: string | null;
  onFocused?: () => void;
}> = ({ status, tick, onChanged, focusId = null, onFocused }) => {
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | 'store' | 'product'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [local, setLocal] = useState(0);
  const wide = useMinWidth(1024);
  useEffect(() => {
    if (!focusId) return;
    setOpen(focusId);
    onFocused?.();
  }, [focusId, onFocused]);
  const dq = useDebounced(q);
  const { data, error } = useAdminData<{ counts: Record<string, number>; reports: ReportRow[] }>(
    `/api/adminom/reports?status=${status}&type=${type}&q=${encodeURIComponent(dq)}`,
    tick + local,
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Plaignant, e-mail, boutique ou produit" />
        <div className="flex gap-2">
          {(
            [
              ['all', 'Tous types'],
              ['store', 'Boutique'],
              ['product', 'Produit'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setType(id)}
              aria-pressed={type === id}
              className={`h-10 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap cursor-pointer ${
                type === id
                  ? 'bg-[var(--a-text)] text-[var(--a-bg)]'
                  : 'bg-[var(--a-surface)] text-[var(--a-muted)] border border-[var(--a-border)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <ErrorBox error={error} />
      ) : !data ? (
        <Loading />
      ) : data.reports.length === 0 ? (
        <Card className="text-center text-[var(--a-muted)]">
          Aucun signalement pour ces filtres.
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          {wide ? (
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--a-border)] text-[12px] uppercase tracking-wide text-[var(--a-muted)]">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Plaignant</th>
                  <th className="px-3 py-3 font-semibold">Cible</th>
                  <th className="px-3 py-3 font-semibold">Motif</th>
                  <th className="px-3 py-3 font-semibold text-center">Photos</th>
                  <th className="px-5 py-3 font-semibold text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--a-border)]">
                {data.reports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setOpen(r.id)}
                    className={`cursor-pointer hover:bg-[var(--a-soft)] ${r.unread ? 'font-semibold' : ''}`}
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap tabular-nums">
                      <span className="flex items-center gap-2">
                        {r.unread && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                        {dateTimeFmt.format(new Date(r.createdAt))}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 max-w-[220px]">
                      <p className="truncate">{r.reporterName}</p>
                      <p className="truncate text-[12px] font-normal text-[var(--a-muted)]">
                        {r.reporterEmail} · {r.reporterPhone}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 max-w-[220px]">
                      <p className="truncate">{r.target}</p>
                      <p className="text-[12px] font-normal text-[var(--a-muted)] truncate">
                        {r.type === 'product' ? `Produit · ${r.storeName ?? ''}` : 'Boutique'}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 max-w-[220px] truncate font-normal">{r.reason}</td>
                    <td className="px-3 py-3.5 text-center tabular-nums">{r.photos}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex flex-wrap justify-end gap-1">
                        {r.unreadReplies > 0 && <Badge tone="violet">Nouvelle réponse</Badge>}
                        <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ul className="divide-y divide-[var(--a-border)]">
              {data.reports.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(r.id)}
                    className="w-full text-left px-4 sm:px-5 py-4 space-y-1.5 hover:bg-[var(--a-soft)] cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`min-w-0 text-[15px] truncate ${r.unread ? 'font-extrabold' : 'font-semibold'}`}
                      >
                        {r.unread && (
                          <span className="inline-block w-2 h-2 mr-1.5 align-middle rounded-full bg-rose-500" />
                        )}
                        {r.target}
                      </p>
                      <span className="shrink-0 inline-flex flex-wrap justify-end gap-1">
                        {r.unreadReplies > 0 && <Badge tone="violet">Nouvelle réponse</Badge>}
                        <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                      </span>
                    </div>
                    <p className="text-[13px] text-[var(--a-muted)]">
                      {r.type === 'product' ? `Produit · ${r.storeName ?? ''}` : 'Boutique'} ·{' '}
                      {r.reason}
                    </p>
                    <p className="text-[13px] truncate">
                      {r.reporterName} ·{' '}
                      <span className="text-[var(--a-muted)]">{r.reporterPhone}</span>
                    </p>
                    <p className="flex items-center gap-3 text-[12px] text-[var(--a-muted)] tabular-nums">
                      <span>{dateTimeFmt.format(new Date(r.createdAt))}</span>
                      <span className="inline-flex items-center gap-1">
                        <Images className="w-3.5 h-3.5" /> {r.photos}
                      </span>
                      {r.replies > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {r.replies}
                        </span>
                      )}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      {open && (
        <ReportCase
          id={open}
          onClose={() => {
            setOpen(null);
            setLocal((v) => v + 1);
          }}
          onChanged={onChanged}
        />
      )}
    </div>
  );
};
