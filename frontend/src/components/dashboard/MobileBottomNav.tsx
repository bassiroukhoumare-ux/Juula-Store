'use client';

import React from 'react';
import { Compass, ShoppingBag, Package, Wallet, Smartphone } from 'lucide-react';
import { DashboardTab } from '@/types/juula';

interface MobileBottomNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onOpenStorefrontPreview: () => void;
  newOrdersCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenStorefrontPreview,
  newOrdersCount,
}) => {
  const tabs = [
    { id: 'cockpit' as DashboardTab, label: 'Cockpit', icon: Compass },
    { id: 'kanban' as DashboardTab, label: 'Commandes', icon: ShoppingBag, badge: newOrdersCount },
    { id: 'wizard' as DashboardTab, label: 'Tunnels', icon: Package },
    { id: 'wallet' as DashboardTab, label: 'Finances', icon: Wallet },
  ];

  return (
    <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/90 backdrop-blur-xl border border-[#ECEFF4] rounded-[24px] px-2 py-2 shadow-[0_18px_40px_-18px_rgba(32,29,29,0.35)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl relative transition-all cursor-pointer ${
                isActive ? 'text-[#235BF7]' : 'text-[#7A808C] hover:text-[#201D1D]'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'
                  }`}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#10B981] text-white text-[11px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-white">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span
                className={`text-xs mt-1 font-bold tracking-tight ${
                  isActive ? 'text-[#235BF7]' : 'text-[#7A808C]'
                }`}
              >
                {tab.label}
              </span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#235BF7] mt-0.5" />}
            </button>
          );
        })}

        {/* Vitrine Client Preview Button */}
        <button
          onClick={onOpenStorefrontPreview}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl text-[#235BF7] hover:opacity-80 transition-all cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-[#EEF3FF] flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-[#235BF7]" />
          </div>
          <span className="text-xs mt-0.5 font-extrabold text-[#235BF7]">Vitrine</span>
        </button>
      </div>
    </nav>
  );
};
