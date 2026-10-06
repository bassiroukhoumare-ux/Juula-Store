'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bell, Plus, Search } from 'lucide-react';
import type { DashboardTab } from '@/types/juula';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import type { CustomDates, PeriodId } from '@/lib/store/period';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';

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
  customDates: CustomDates | null;
  onSelectPeriod: (id: PeriodId, custom?: CustomDates) => void;
  dateRangeLabel: string;
  /** Unread notifications (badge on the bell). */
  unreadNotifications: number;
  avatarUrl?: string | null | undefined;
  storeName?: string | null | undefined;
  onSearch: (query: string) => void;
}

const TITLES: Record<DashboardTab, string> = {
  cockpit: 'Tableau de bord',
  kanban: 'Commandes',
  wallet: 'Portefeuille',
  products: 'Pages produits',
  storefront: 'Ma boutique',
  notifications: 'Notifications',
  wizard: 'Pages produits',
  customers: 'Clients',
  analytics: 'Performances des ventes',
  settings: 'Paramètres',
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onCreatePageClick,
  periodId,
  customDates,
  onSelectPeriod,
  dateRangeLabel,
  unreadNotifications,
  avatarUrl,
  storeName,
  onSearch,
}) => {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses the search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const unread = unreadNotifications;
  const initials = (storeName || 'J')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="bg-white/85 backdrop-blur-xl border-b border-[#ECEFF4] lg:border lg:border-[#ECEFF4] lg:m-3 lg:mb-0 lg:rounded-[22px] lg:shadow-[0_10px_30px_-22px_rgba(32,29,29,0.3)] px-4 sm:px-6 py-4 flex flex-col gap-4 sticky top-0 lg:top-3 z-30 select-none">
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
          {/* Notifications → full page */}
          <button
            type="button"
            onClick={() => onTabChange('notifications')}
            aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}
            className={`relative w-11 h-11 rounded-2xl border flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-[#EEF3FF] border-[#BFD0FD] text-[#235BF7]'
                : 'bg-white border-[#E3E7EE] text-[#3F4654] hover:text-[#201D1D] hover:bg-[#F6F7F9]'
            }`}
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#235BF7] text-white text-[13px] font-bold flex items-center justify-center ring-2 ring-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

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

        <div className="hidden sm:flex sm:items-center gap-2">
          <button
            type="button"
            onClick={onCreatePageClick}
            className="sm:order-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Créer une page
          </button>

          {/* Filtrer: period of the KPIs, chart and analytics */}
          <div className="sm:order-1">
            <PeriodFilter
              periodId={periodId}
              custom={customDates}
              rangeLabel={dateRangeLabel}
              onSelect={onSelectPeriod}
            />
          </div>
        </div>

        {/* Phones: the filter only where it changes the figures */}
        {(activeTab === 'cockpit' || activeTab === 'analytics') && (
          <div className="sm:hidden">
            <PeriodFilter
              block
              periodId={periodId}
              custom={customDates}
              rangeLabel={dateRangeLabel}
              onSelect={onSelectPeriod}
            />
          </div>
        )}
      </div>
    </header>
  );
};
