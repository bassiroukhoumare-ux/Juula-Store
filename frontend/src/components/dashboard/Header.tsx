'use client';

import React, { useState } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Calendar,
  SlidersHorizontal,
  Download,
  Plus,
  ChevronDown,
  Sparkles,
  Layers,
  Smartphone,
  ExternalLink,
  Hexagon,
  Check,
  X,
  CreditCard,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { DashboardTab } from '@/types/juula';

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
  currentViewMode: 'dashboard' | 'vitrine';
  onToggleViewMode: (mode: 'dashboard' | 'vitrine') => void;
  onCreatePageClick: () => void;
  selectedPeriod?: string;
  onSelectPeriod?: (period: string) => void;
  selectedDateRange?: string;
  onSelectDateRange?: (range: string) => void;
  activeWidgets?: HeaderWidgetsState;
  onToggleWidget?: (widgetKey: keyof HeaderWidgetsState) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  leadCreditsRemaining,
  availableBalance,
  currency,
  onOpenRecharge,
  onOpenPayoutModal,
  onOpenStorefrontPreview,
  currentViewMode,
  onToggleViewMode,
  onCreatePageClick,
  selectedPeriod = '30 derniers jours',
  onSelectPeriod,
  selectedDateRange = '1 Jan, 2026 - 4 Oct, 2026',
  onSelectDateRange,
  activeWidgets = {
    kpiCards: true,
    profitChart: true,
    segmentation: true,
    activeDays: true,
    deliveryRate: true,
    aiAssistant: true,
    bestProducts: true,
  },
  onToggleWidget,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);

  interface NotificationItem {
    id: number;
    title: string;
    desc: string;
    time: string;
    type: string;
    unread: boolean;
  }
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const getPageTitle = () => {
    switch (activeTab) {
      case 'cockpit':
        return 'Dashboard';
      case 'kanban':
        return 'Commandes & Pipeline';
      case 'wallet':
        return 'Juula Pay — Portefeuille';
      case 'wizard':
        return 'Pages de vente';
      case 'customers':
        return 'Clients';
      case 'analytics':
        return 'Performances des Ventes';
      case 'settings':
        return 'Paramètres & Intégrations';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="bg-white border-b border-[#E5E9F0] px-4 sm:px-6 py-3.5 flex flex-col gap-3 sticky top-0 z-30 select-none">
      {/* Top Search Bar, Mobile Brand & User Actions */}
      <div className="flex items-center justify-between gap-4">
        {/* Mobile Brand (Visible only when sidebar is hidden on mobile) */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 rounded-xl bg-[#1E60F8] text-white flex items-center justify-center font-black shadow-[0_2px_8px_rgba(30,96,248,0.25)]">
            <Hexagon className="w-4 h-4 fill-white stroke-[#1E60F8]" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-[#0F172A] tracking-tight block leading-none">
              Juula Store
            </span>
            <span className="text-[10px] text-[#64748B] font-semibold">Marchand</span>
          </div>
        </div>

        {/* Search input with shortcut ⌘K (Desktop) */}
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une commande, un client, un quartier..."
            className="w-full pl-10 pr-12 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1E60F8] focus:bg-white transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#94A3B8] bg-white border border-[#E2E8F0] px-1.5 py-0.5 rounded">
            ⌘K
          </span>
        </div>

        {/* Right Switchers and Profile */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* View mode toggle : Dashboard vs Vitrine */}
          <div className="flex items-center p-1 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0]">
            <button
              onClick={() => onToggleViewMode('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentViewMode === 'dashboard'
                  ? 'bg-white text-[#1E60F8] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            <button
              onClick={() => onToggleViewMode('vitrine')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentViewMode === 'vitrine'
                  ? 'bg-white text-[#1E60F8] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-[#1E60F8]" />
              <span className="hidden sm:inline">Vitrine Mobile</span>
            </button>
          </div>

          {/* Nocturne / Dark Mode Button with active indicator */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-[#0F172A] text-amber-300 border-[#0F172A]'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] border-[#E2E8F0]'
            }`}
            title={isDarkMode ? 'Désactiver le mode nocturne' : 'Activer le mode nocturne'}
          >
            {isDarkMode ? <Moon className="w-4 h-4 fill-amber-300" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Notification bell with dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsCalendarOpen(false);
                setIsPeriodOpen(false);
                setIsWidgetModalOpen(false);
              }}
              className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] border border-[#E2E8F0] transition-colors cursor-pointer relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#10B981] ring-2 ring-white" />
              )}
            </button>

            {/* Notifications Popover */}
            {isNotificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-3xl p-4 border border-[#E5E9F0] shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-[#0F172A]">Notifications</span>
                    {unreadCount > 0 ? (
                      <span className="text-[10px] font-black bg-[#EFF4FF] text-[#1E60F8] px-2 py-0.5 rounded-full">
                        {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                        0 nouvelle
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-1 text-[#94A3B8] hover:text-[#0F172A]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-[#F1F5F9] max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#94A3B8] space-y-1">
                      <p className="font-semibold text-[#64748B]">Aucune notification</p>
                      <p className="text-[11px]">Les alertes de commandes et retraits s'afficheront ici en direct.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`py-3 px-1 space-y-1 transition-colors ${
                          notif.unread ? 'bg-[#FAFCFF]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#0F172A]">{notif.title}</span>
                          <span className="text-[10px] text-[#94A3B8]">{notif.time}</span>
                        </div>
                        <p className="text-[11px] text-[#64748B] leading-tight">{notif.desc}</p>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="pt-2 border-t border-[#F1F5F9]">
                    <button
                      onClick={() => {
                        setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
                        setIsNotificationsOpen(false);
                      }}
                      className="w-full py-1.5 text-center text-xs font-bold text-[#1E60F8] hover:underline cursor-pointer"
                    >
                      Marquer tout comme lu
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile */}
          <div
            onClick={() => onTabChange('settings')}
            className="flex items-center gap-2.5 pl-1 cursor-pointer"
            title="Paramètres boutique"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1E60F8] to-[#60A5FA] text-white font-extrabold text-xs flex items-center justify-center ring-2 ring-[#E2E8F0]">
              DE
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Header Row matching Shopeers Title and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
          {getPageTitle()}
        </h1>

        <div className="flex items-center gap-1.5 sm:gap-2 relative overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-full">
          {/* Date Picker Pill with Popover */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setIsCalendarOpen(!isCalendarOpen);
                setIsPeriodOpen(false);
                setIsWidgetModalOpen(false);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
              <span className="hidden sm:inline">{selectedDateRange}</span>
              <span className="sm:hidden text-[11px] truncate max-w-[120px]">
                {selectedDateRange.includes('-')
                  ? selectedDateRange.split('-')[0]?.trim() || selectedDateRange
                  : selectedDateRange}
              </span>
            </button>

            {isCalendarOpen && (
              <div className="absolute left-0 sm:right-0 top-full mt-2 w-64 bg-white rounded-2xl p-2 border border-[#E5E9F0] shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
                {[
                  'Aujourd’hui',
                  '7 derniers jours',
                  '30 derniers jours',
                  'Ce mois (Octobre 2026)',
                  '1 Jan, 2026 - 4 Oct, 2026',
                ].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      onSelectDateRange?.(range);
                      setIsCalendarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      selectedDateRange === range
                        ? 'bg-[#EFF4FF] text-[#1E60F8]'
                        : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Period selector with Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setIsPeriodOpen(!isPeriodOpen);
                setIsCalendarOpen(false);
                setIsWidgetModalOpen(false);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>{selectedPeriod}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>

            {isPeriodOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl p-2 border border-[#E5E9F0] shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
                {['Aujourd’hui', '7 derniers jours', '14 derniers jours', '30 derniers jours', 'Ce mois'].map(
                  (period) => (
                    <button
                      key={period}
                      onClick={() => {
                        onSelectPeriod?.(period);
                        setIsPeriodOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        selectedPeriod === period
                          ? 'bg-[#EFF4FF] text-[#1E60F8]'
                          : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                      }`}
                    >
                      {period}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Add Widget Popover Modal */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setIsWidgetModalOpen(!isWidgetModalOpen);
                setIsCalendarOpen(false);
                setIsPeriodOpen(false);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span className="hidden sm:inline">Ajouter widget</span>
              <span className="sm:hidden">Widgets</span>
            </button>

            {isWidgetModalOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-3xl p-4 border border-[#E5E9F0] shadow-xl z-50 animate-in fade-in slide-in-from-top-1 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                  <span className="text-xs font-black text-[#0F172A]">Widgets Visibles</span>
                  <button
                    onClick={() => setIsWidgetModalOpen(false)}
                    className="p-1 text-[#94A3B8] hover:text-[#0F172A]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    { key: 'kpiCards' as const, label: 'Cartes Vues, Clics & Commandes' },
                    { key: 'profitChart' as const, label: 'Graphique Bénéfice & CA Spline' },
                    { key: 'segmentation' as const, label: 'Segmentation COD & Mobile Money' },
                    { key: 'activeDays' as const, label: 'Journées les plus actives' },
                    { key: 'deliveryRate' as const, label: 'Jauge Taux de Livraison (68%)' },
                    { key: 'aiAssistant' as const, label: 'Assistant IA Ventes Juula' },
                    { key: 'bestProducts' as const, label: 'Tableau des Produits les Plus Vendus' },
                  ].map((w) => (
                    <label
                      key={w.key}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F8FAFC] cursor-pointer"
                    >
                      <span className="font-semibold text-[#334155]">{w.label}</span>
                      <input
                        type="checkbox"
                        checked={activeWidgets[w.key]}
                        onChange={() => onToggleWidget?.(w.key)}
                        className="w-4 h-4 rounded text-[#1E60F8] accent-[#1E60F8] cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Button (Blue Shopeers style) */}
          <button
            onClick={onCreatePageClick}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-xl bg-[#1E60F8] hover:bg-[#164ED0] text-white text-xs font-bold transition-all shadow-[0_2px_8px_rgba(30,96,248,0.25)] cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Créer une page</span>
            <span className="sm:hidden">+ Tunnel</span>
          </button>
        </div>
      </div>
    </header>
  );
};
