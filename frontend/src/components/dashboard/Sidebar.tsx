'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Boxes,
  Compass,
  ExternalLink,
  LogOut,
  Settings,
  ShoppingBag,
  Store,
  Users,
  Wallet,
  Megaphone,
} from 'lucide-react';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import { LogoutConfirmDialog } from '@/components/dashboard/LogoutConfirmDialog';
import { DashboardTab } from '@/types/juula';

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onOpenStorefrontPreview: () => void;
  newOrdersCount: number;
  userEmail?: string | undefined;
  onLogout?: () => void;
}

type Item = { id: DashboardTab; label: string; icon: React.ElementType; badge?: number };

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenStorefrontPreview,
  newOrdersCount,
  userEmail,
  onLogout,
}) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const groups: { title?: string; items: Item[] }[] = [
    {
      items: [
        { id: 'cockpit', label: 'Tableau de bord', icon: Compass },
        { id: 'kanban', label: 'Commandes', icon: ShoppingBag, badge: newOrdersCount },
        { id: 'products', label: 'Pages produits', icon: Boxes },
        { id: 'storefront', label: 'Boutique', icon: Store },
        { id: 'customers', label: 'Clients', icon: Users },
      ],
    },
    { title: 'Finances', items: [{ id: 'wallet', label: 'Juula Pay & retraits', icon: Wallet }] },
    {
      title: 'Croissance',
      items: [
        { id: 'marketing', label: 'Marketing', icon: Megaphone },
        { id: 'analytics', label: 'Performances', icon: BarChart3 },
      ],
    },
  ];

  const NavButton = ({ item }: { item: Item }) => {
    const on = activeTab === item.id;
    const Icon = item.icon;
    return (
      <button
        type="button"
        onClick={() => onTabChange(item.id)}
        aria-current={on ? 'page' : undefined}
        className={`relative w-full flex items-center justify-between gap-3 px-3.5 h-12 rounded-xl text-[16px] font-semibold transition-colors cursor-pointer ${
          on
            ? 'bg-[#EEF3FF] text-[#235BF7]'
            : 'text-[#4B5260] hover:bg-[#F6F7F9] hover:text-[#201D1D]'
        }`}
      >
        {on && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#235BF7] rounded-r-full" />
        )}
        <span className="flex items-center gap-3 min-w-0">
          <Icon className={`w-5 h-5 shrink-0 ${on ? 'text-[#235BF7]' : 'text-[#8A909B]'}`} />
          <span className="truncate">{item.label}</span>
        </span>
        {item.badge ? (
          <span className="shrink-0 min-w-6 h-6 px-1.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[13px] font-bold flex items-center justify-center">
            {item.badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <>
      <aside className="hidden lg:flex w-[272px] bg-white border border-[#ECEFF4] rounded-[32px] shadow-[0_20px_50px_-36px_rgba(32,29,29,0.35)] flex-col justify-between h-[calc(100vh-24px)] sticky top-3 z-30 select-none flex-shrink-0 overflow-hidden">
        <div className="overflow-y-auto">
          <div className="p-5 flex items-center justify-between border-b border-[#F1F5F9]">
            <JuulaLogo height={36} />
            <button
              type="button"
              onClick={onOpenStorefrontPreview}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8A909B] hover:text-[#201D1D] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              title="Aperçu rapide"
              aria-label="Aperçu rapide"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-3 space-y-5">
            {groups.map((g, i) => (
              <div key={g.title ?? i} className="space-y-1">
                {g.title && (
                  <p className="px-3.5 pb-1 text-[13px] font-bold uppercase tracking-wider text-[#9AA0AB]">
                    {g.title}
                  </p>
                )}
                {g.items.map((item) => (
                  <NavButton key={item.id} item={item} />
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="p-3 border-t border-[#F1F5F9] space-y-1">
          <NavButton item={{ id: 'settings', label: 'Paramètres', icon: Settings }} />
          {onLogout && (
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              title={userEmail}
              className="w-full flex items-center gap-3 px-3.5 h-12 rounded-xl text-[16px] font-semibold text-[#4B5260] hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5 text-[#8A909B]" />
              <span className="truncate">Se déconnecter</span>
            </button>
          )}
          {userEmail && (
            <p className="px-3.5 pt-1 text-[13px] text-[#9AA0AB] truncate">{userEmail}</p>
          )}
        </div>
      </aside>
      {onLogout && (
        <LogoutConfirmDialog
          open={showLogoutModal}
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={onLogout}
        />
      )}
    </>
  );
};
