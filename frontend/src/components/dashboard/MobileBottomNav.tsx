'use client';

import React from 'react';
import {
  Compass,
  ShoppingBag,
  Package,
  Wallet,
  Smartphone,
} from 'lucide-react';
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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E9F0] px-2 py-2 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl relative transition-all cursor-pointer ${
                isActive ? 'text-[#1E60F8]' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'
                  }`}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#10B981] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-white">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span
                className={`text-[10px] mt-1 font-bold tracking-tight ${
                  isActive ? 'text-[#1E60F8]' : 'text-[#64748B]'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E60F8] mt-0.5" />
              )}
            </button>
          );
        })}

        {/* Vitrine Client Preview Button */}
        <button
          onClick={onOpenStorefrontPreview}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl text-[#1E60F8] hover:opacity-80 transition-all cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-[#EFF4FF] flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-[#1E60F8]" />
          </div>
          <span className="text-[10px] mt-0.5 font-extrabold text-[#1E60F8]">
            Vitrine
          </span>
        </button>
      </div>
    </nav>
  );
};
