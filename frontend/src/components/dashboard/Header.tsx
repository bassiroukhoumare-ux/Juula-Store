'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  CircleDollarSign,
  PackageCheck,
  Plus,
  Search,
  SlidersHorizontal,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import type { DashboardTab, OrderLead, PayoutRecord } from '@/types/juula';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import { formatFCFA } from '@/lib/orderUtils';
import { PERIODS, type PeriodId } from '@/lib/store/period';

export interface HeaderWidgetsState {
  kpiCards: boolean;
  profitChart: boolean;
  segmentation: boolean;
  activeDays: boolean;
  deliveryRate: boolean;
  aiAssistant: boolean;
  bestProducts: boolean;
}

interface HeaderProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  leadCreditsRemaining: number;
  availableBalance: number;
  currency: string;
  onOpenRecharge: () => void;
  onOpenPayoutModal: () => void;
  onOpenStorefrontPreview: () => void;
  onCreatePageClick: () => void;
  periodId: PeriodId;
  onSelectPeriod: (id: PeriodId) => void;
  dateRangeLabel: string;
  /** Source of the notifications (new / paid orders) and of nothing else. */
  orders: OrderLead[];
  payouts: PayoutRecord[];
  avatarUrl?: string | null | undefined;
  storeName?: string | null | undefined;
  onOpenOrder: (reference: string) => void;
  onSearch: (query: string) => void;
}

const TITLES: Record<DashboardTab, string> = {
  cockpit: 'Tableau de bord',
  kanban: 'Commandes',
  wallet: 'Portefeuille',
  wizard: 'Pages de vente',
  customers: 'Clients',
  analytics: 'Performances des ventes',
  settings: 'Paramètres',
};

const SEEN_KEY = 'juula-notifications-seen-at';

type Notif = {
  id: string;
  at: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
  tone: string;
  orderRef?: string;
  when: string;
};

function readSeen(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

const PILL =
  'flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E3E7EE] text-[14px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] transition-colors cursor-pointer whitespace-nowrap';

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onCreatePageClick,
  periodId,
  onSelectPeriod,
  dateRangeLabel,
  orders,
  payouts,
  avatarUrl,
  storeName,
  onOpenOrder,
  onSearch,
}) => {
  const [open, setOpen] = useState<null | 'notifications' | 'period'>(null);
  const [seenAt, setSeenAt] = useState(0);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => setSeenAt(readSeen()), []);

  // ⌘K / Ctrl+K focuses the search; Escape and outside clicks close popovers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') setOpen(null);
    };
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  // Notifications = latest orders (new / paid online) + withdrawals.
  const notifications = useMemo<Notif[]>(() => {
    const list: Notif[] = [];
    for (const o of orders) {
      if (!o.createdAtIso) continue;
      const at = Date.parse(o.createdAtIso);
      const total = formatFCFA(o.totalAmount ?? o.amount);
      list.push(
        o.paymentStatus === 'paid'
          ? {
              id: `paid-${o.id}`,
              at,
              title: 'Paiement en ligne reçu',
              desc: `${o.customerName} · ${o.productName} · ${total}`,
              icon: <CircleDollarSign className="w-4 h-4" />,
              tone: 'bg-[#ECFDF3] text-[#16A34A]',
              orderRef: o.id,
              when: o.createdAt,
            }
          : {
              id: `order-${o.id}`,
              at,
              title: `Nouvelle commande ${o.id}`,
              desc: `${o.customerName} · ${o.productName} · ${total}`,
              icon: <PackageCheck className="w-4 h-4" />,
              tone: 'bg-[#EEF3FF] text-[#235BF7]',
              orderRef: o.id,
              when: o.createdAt,
            },
      );
    }
    payouts.forEach((p, i) => {
      list.push({
        id: `payout-${p.id}`,
        at: Date.now() - (i + 1) * 1000 * 60 * 60 * 24 * 365, // history has no timestamp: keep after orders
        title:
          p.status === 'completed'
            ? 'Retrait confirmé'
            : p.status === 'failed'
              ? 'Retrait non effectué'
              : 'Retrait en cours',
        desc: `${formatFCFA(p.amount)} vers ${p.provider === 'wave' ? 'Wave' : 'Orange Money'}`,
        icon:
          p.status === 'failed' ? <XCircle className="w-4 h-4" /> : <Wallet className="w-4 h-4" />,
        tone: p.status === 'failed' ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#F6F7F9] text-[#3F4654]',
        when: p.date,
      });
    });
    return list.sort((a, b) => b.at - a.at).slice(0, 20);
  }, [orders, payouts]);

  const unread = notifications.filter((n) => n.at > seenAt).length;

  const markAllRead = () => {
    const now = Date.now();
    setSeenAt(now);
    try {
      localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      // ignore (private mode)
    }
  };

  const toggle = (which: NonNullable<typeof open>) =>
    setOpen((cur) => (cur === which ? null : which));
  const periodLabel = PERIODS.find((p) => p.id === periodId)?.label ?? '';
  const initials = (storeName || 'J')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header
      ref={rootRef}
      className="bg-white/85 backdrop-blur-xl border-b border-[#ECEFF4] lg:border lg:border-[#ECEFF4] lg:m-3 lg:mb-0 lg:rounded-[22px] lg:shadow-[0_10px_30px_-22px_rgba(32,29,29,0.3)] px-4 sm:px-6 py-4 flex flex-col gap-4 sticky top-0 lg:top-3 z-30 select-none"
    >
      {/* Row 1: brand (mobile), search, notifications, avatar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center lg:hidden shrink-0">
          <JuulaLogo height={30} />
        </div>

        <form
          className="relative w-full max-w-md hidden sm:block"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(query.trim());
          }}
        >
          <Search className="w-[18px] h-[18px] text-[#9AA0AB] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une commande, un client, un quartier…"
            className="w-full pl-11 pr-14 py-2.5 rounded-2xl bg-[#F6F7F9] border border-[#E3E7EE] text-[14px] text-[#201D1D] placeholder:text-[#9AA0AB] focus:outline-none focus:border-[#235BF7] focus:bg-white focus:ring-4 focus:ring-[#235BF7]/10 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#9AA0AB] bg-white border border-[#E3E7EE] px-1.5 py-0.5 rounded-md">
            ⌘K
          </kbd>
        </form>

        <div className="flex items-center gap-2.5 ml-auto">
          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggle('notifications')}
              aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}
              className="relative w-11 h-11 rounded-2xl text-[#3F4654] hover:text-[#201D1D] bg-white hover:bg-[#F6F7F9] border border-[#E3E7EE] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#235BF7] text-white text-[13px] font-bold flex items-center justify-center ring-2 ring-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {open === 'notifications' && (
              <div className="fixed inset-x-3 top-[76px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[400px] bg-white rounded-[24px] border border-[#ECEFF4] shadow-[0_30px_60px_-24px_rgba(32,29,29,0.35)] z-50 overflow-hidden motion-safe:animate-[rise_220ms_ease]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F3F7]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[15px] text-[#201D1D]">Notifications</span>
                    {unread > 0 && (
                      <span className="text-[12px] font-semibold bg-[#EEF3FF] text-[#235BF7] px-2 py-0.5 rounded-full">
                        {unread} nouvelle{unread > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(null)}
                    aria-label="Fermer"
                    className="p-1.5 rounded-lg text-[#9AA0AB] hover:text-[#201D1D] hover:bg-[#F6F7F9]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain">
                  {notifications.length === 0 ? (
                    <div className="py-12 px-6 text-center">
                      <span className="mx-auto w-12 h-12 rounded-2xl bg-[#F6F7F9] text-[#9AA0AB] flex items-center justify-center">
                        <Bell className="w-5 h-5" />
                      </span>
                      <p className="mt-3 font-semibold text-[#201D1D]">Aucune notification</p>
                      <p className="mt-1 text-sm text-[#7A808C]">
                        Vos nouvelles commandes, paiements et retraits apparaîtront ici.
                      </p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        disabled={!n.orderRef}
                        onClick={() => {
                          if (n.orderRef) onOpenOrder(n.orderRef);
                          setOpen(null);
                        }}
                        className={`w-full text-left flex items-start gap-3 px-5 py-3.5 border-b border-[#F6F7F9] last:border-0 transition-colors ${
                          n.orderRef ? 'hover:bg-[#F6F7F9] cursor-pointer' : 'cursor-default'
                        } ${n.at > seenAt ? 'bg-[#FAFBFF]' : ''}`}
                      >
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.tone}`}
                        >
                          {n.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[14px] text-[#201D1D] truncate">
                              {n.title}
                            </span>
                            <span className="text-[12px] text-[#9AA0AB] shrink-0">{n.when}</span>
                          </span>
                          <span className="block text-sm text-[#7A808C] truncate">{n.desc}</span>
                        </span>
                        {n.at > seenAt && (
                          <span className="mt-2 w-2 h-2 rounded-full bg-[#235BF7] shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>

                {unread > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-semibold text-[#235BF7] hover:bg-[#F6F7F9] border-t border-[#F1F3F7] cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Tout marquer comme lu
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Avatar: store logo (or initials) → settings */}
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            title="Paramètres de la boutique"
            className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-white shadow-[0_6px_16px_-8px_rgba(32,29,29,0.5)] bg-gradient-to-br from-[#4D7DFF] to-[#1F4FE0] text-white font-bold text-[15px] flex items-center justify-center cursor-pointer shrink-0"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={storeName ?? 'Ma boutique'}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </button>
        </div>
      </div>

      {/* Row 2: title + actions (Créer une page, Filtrer) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#201D1D] tracking-[-0.02em]">
          {TITLES[activeTab]}
        </h1>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <button
            type="button"
            onClick={onCreatePageClick}
            className="sm:order-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Créer une page
          </button>

          {/* Filtrer: period of the KPIs, chart and analytics */}
          <div className="relative sm:order-1">
            <button
              type="button"
              onClick={() => toggle('period')}
              aria-expanded={open === 'period'}
              className={`${PILL} w-full justify-center`}
            >
              <SlidersHorizontal className="w-4 h-4 text-[#235BF7]" />
              <span className="sm:hidden">Filtrer</span>
              <span className="hidden sm:inline text-[#7A808C] font-medium">{dateRangeLabel}</span>
              <span className="hidden sm:inline text-[#D5DAE3]">·</span>
              <span className="hidden sm:inline">{periodLabel}</span>
              <ChevronDown className="w-4 h-4 text-[#9AA0AB]" />
            </button>
            {open === 'period' && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl p-2 border border-[#ECEFF4] shadow-[0_24px_48px_-24px_rgba(32,29,29,0.35)] z-50 motion-safe:animate-[rise_200ms_ease]">
                <p className="px-3 pt-1 pb-2 text-[13px] font-semibold text-[#9AA0AB]">
                  {dateRangeLabel}
                </p>
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectPeriod(p.id);
                      setOpen(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-colors cursor-pointer ${
                      periodId === p.id
                        ? 'bg-[#EEF3FF] text-[#235BF7]'
                        : 'text-[#3F4654] hover:bg-[#F6F7F9]'
                    }`}
                  >
                    {p.label}
                    {periodId === p.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
