'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  Boxes,
  Compass,
  LogOut,
  MoreHorizontal,
  Settings,
  ShoppingBag,
  Store,
  Users,
  Wallet,
  X,
  Megaphone,
} from 'lucide-react';
import { DashboardTab } from '@/types/juula';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';

interface MobileBottomNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  newOrdersCount: number;
  onLogout?: () => Promise<void> | void;
}

const MAIN: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
  { id: 'cockpit', label: 'Accueil', icon: Compass },
  { id: 'kanban', label: 'Commandes', icon: ShoppingBag },
  { id: 'products', label: 'Produits', icon: Boxes },
  { id: 'storefront', label: 'Boutique', icon: Store },
];

const MORE: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
  { id: 'wallet', label: 'Juula Finance', icon: Wallet },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'analytics', label: 'Performances', icon: BarChart3 },
  { id: 'customers', label: 'Clients', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  newOrdersCount,
  onLogout,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const moreActive = MORE.some((m) => m.id === activeTab);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const go = (tab: DashboardTab) => {
    setMoreOpen(false);
    onTabChange(tab);
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/95 backdrop-blur-xl border border-[#ECEFF4] rounded-[24px] px-1.5 py-1.5 shadow-[0_18px_40px_-18px_rgba(32,29,29,0.35)] pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-5">
          {MAIN.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badge = tab.id === 'kanban' ? newOrdersCount : 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => go(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl cursor-pointer ${
                  isActive ? 'text-[#235BF7]' : 'text-[#7A808C]'
                }`}
              >
                <span className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-[#10B981] text-white text-[11px] font-bold px-1.5 rounded-full ring-2 ring-white">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-semibold">{tab.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl cursor-pointer ${
              moreActive ? 'text-[#235BF7]' : 'text-[#7A808C]'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[11px] font-semibold">Plus</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="Plus"
        >
          <div className="absolute inset-0 bg-[#201D1D]/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between px-1 pb-3">
              <p className="text-lg font-extrabold text-[#201D1D]">Plus</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Fermer"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#7A808C] hover:bg-[#F6F7F9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MORE.map((item) => {
                const Icon = item.icon;
                const on = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.id)}
                    className={`flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border text-[13px] font-semibold cursor-pointer ${
                      on
                        ? 'bg-[#EEF3FF] border-[#BFD0FD] text-[#235BF7]'
                        : 'bg-[#F6F7F9] border-transparent text-[#201D1D]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={() => setLogoutOpen(true)}
                className="mt-3 w-full h-12 rounded-2xl border border-[#ECEFF4] text-[15px] font-semibold text-[#DC2626] inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Se déconnecter
              </button>
            )}
          </div>
        </div>
      )}

      {onLogout && (
        <LogoutConfirmDialog
          open={logoutOpen}
          onCancel={() => setLogoutOpen(false)}
          onConfirm={onLogout}
        />
      )}
    </>
  );
};
