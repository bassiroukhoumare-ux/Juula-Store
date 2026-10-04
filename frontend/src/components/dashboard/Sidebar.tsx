'use client';

import React from 'react';
import Link from 'next/link';
import {
  Compass,
  ShoppingBag,
  Package,
  Users,
  Wallet,
  BarChart3,
  Settings,
  HelpCircle,
  Zap,
  ChevronDown,
  ExternalLink,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import { DashboardTab } from '@/types/juula';

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  leadCreditsRemaining: number;
  leadCreditsTotal: number;
  onOpenRecharge: () => void;
  onOpenStorefrontPreview: () => void;
  newOrdersCount: number;
  availableBalance: number;
  currency: string;
  userEmail?: string | undefined;
  onLogout?: () => void;
  plan?: 'FREE' | 'PRO' | undefined;
  planExpiresAt?: string | null | undefined;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  leadCreditsRemaining: _leadCreditsRemaining,
  leadCreditsTotal: _leadCreditsTotal,
  onOpenRecharge: _onOpenRecharge,
  onOpenStorefrontPreview,
  newOrdersCount,
  userEmail,
  onLogout,
  plan = 'FREE',
  planExpiresAt: _planExpiresAt,
}) => {
  return (
    <aside className="hidden lg:flex w-64 bg-white border-r border-[#E5E9F0] flex-col justify-between h-screen sticky top-0 z-30 select-none flex-shrink-0">
      {/* Top Header & Brand */}
      <div className="overflow-y-auto">
        <div className="p-5 flex items-center justify-between border-b border-[#F1F5F9]">
          <div className="flex items-center">
            <JuulaLogo height={34} />
          </div>

          <button
            onClick={onOpenStorefrontPreview}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            title="Aperçu rapide"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items (Shopeers style) */}
        <div className="p-3.5 space-y-6">
          {/* Main Group */}
          <div className="space-y-1">
            {/* Dashboard / Cockpit */}
            <button
              onClick={() => onTabChange('cockpit')}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative
                ${
                  activeTab === 'cockpit'
                    ? 'bg-[#EFF4FF] text-[#1E60F8]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {activeTab === 'cockpit' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#1E60F8] rounded-r-full" />
                )}
                <Compass
                  className={`w-4 h-4 ${activeTab === 'cockpit' ? 'text-[#1E60F8]' : 'text-[#94A3B8]'}`}
                />
                <span>Tableau de Bord</span>
              </div>
            </button>

            {/* Orders / Pipeline */}
            <button
              onClick={() => onTabChange('kanban')}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative
                ${
                  activeTab === 'kanban'
                    ? 'bg-[#EFF4FF] text-[#1E60F8]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {activeTab === 'kanban' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#1E60F8] rounded-r-full" />
                )}
                <ShoppingBag
                  className={`w-4 h-4 ${activeTab === 'kanban' ? 'text-[#1E60F8]' : 'text-[#94A3B8]'}`}
                />
                <span>Commandes</span>
              </div>
              {newOrdersCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669]">
                  {newOrdersCount}
                </span>
              )}
            </button>

            {/* Products / Wizard */}
            <button
              onClick={() => onTabChange('wizard')}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative
                ${
                  activeTab === 'wizard'
                    ? 'bg-[#EFF4FF] text-[#1E60F8]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {activeTab === 'wizard' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#1E60F8] rounded-r-full" />
                )}
                <Package
                  className={`w-4 h-4 ${activeTab === 'wizard' ? 'text-[#1E60F8]' : 'text-[#94A3B8]'}`}
                />
                <span>Pages de vente</span>
              </div>
            </button>

            {/* Customers */}
            <button
              onClick={() => onTabChange('customers')}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative
                ${
                  activeTab === 'customers'
                    ? 'bg-[#EFF4FF] text-[#1E60F8]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {activeTab === 'customers' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#1E60F8] rounded-r-full" />
                )}
                <Users
                  className={`w-4 h-4 ${
                    activeTab === 'customers' ? 'text-[#1E60F8]' : 'text-[#94A3B8]'
                  }`}
                />
                <span>Clients</span>
              </div>
            </button>
          </div>

          {/* Finances Section */}
          <div className="space-y-1">
            <div className="px-3 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              <span>Finances</span>
              <ChevronDown className="w-3 h-3" />
            </div>

            <button
              onClick={() => onTabChange('wallet')}
              className={`
                w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative
                ${
                  activeTab === 'wallet'
                    ? 'bg-[#EFF4FF] text-[#1E60F8]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {activeTab === 'wallet' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#1E60F8] rounded-r-full" />
                )}
                <Wallet
                  className={`w-4 h-4 ${activeTab === 'wallet' ? 'text-[#1E60F8]' : 'text-[#94A3B8]'}`}
                />
                <span>Juula Pay & Retraits</span>
              </div>
            </button>
          </div>

          {/* Analytics Section */}
          <div className="space-y-1">
            <div className="px-3 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              <span>Analyses</span>
            </div>

            <button
              onClick={() => onTabChange('analytics')}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative
                ${
                  activeTab === 'analytics'
                    ? 'bg-[#EFF4FF] text-[#1E60F8]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }
              `}
            >
              {activeTab === 'analytics' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#1E60F8] rounded-r-full" />
              )}
              <BarChart3
                className={`w-4 h-4 ${
                  activeTab === 'analytics' ? 'text-[#1E60F8]' : 'text-[#94A3B8]'
                }`}
              />
              <span>Performances Ventes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom of Sidebar: Upgrade to Pro card & Settings */}
      <div className="p-3.5 space-y-3 border-t border-[#F1F5F9]">
        <div className="space-y-1">
          <button
            onClick={() => onTabChange('settings')}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative
              ${
                activeTab === 'settings'
                  ? 'bg-[#EFF4FF] text-[#1E60F8]'
                  : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
              }
            `}
          >
            {activeTab === 'settings' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#1E60F8] rounded-r-full" />
            )}
            <Settings
              className={`w-4 h-4 ${
                activeTab === 'settings' ? 'text-[#1E60F8]' : 'text-[#94A3B8]'
              }`}
            />
            <span>Paramètres</span>
          </button>
          <button
            onClick={() => window.open('https://wa.me/221774128930', '_blank')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[#94A3B8]" />
            <span>Aide & Support WhatsApp</span>
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              title={userEmail}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-[#94A3B8]" />
              <span className="truncate">Se déconnecter</span>
            </button>
          )}
          {userEmail && (
            <p className="px-3 pt-1 text-[10px] text-[#94A3B8] truncate">{userEmail}</p>
          )}
        </div>

        {/* Plan Status / Upgrade Card */}
        {plan === 'PRO' ? (
          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white shadow-md relative overflow-hidden border border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/40">
                PRO ACTIF
              </span>
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            </div>
            <h4 className="text-xs font-black tracking-tight leading-tight">Plan Juula Pro</h4>
            <p className="text-[10px] text-white/70 leading-relaxed mt-1 mb-3">
              Produits illimités · Paiement à la livraison actif · 0% commission Juula.
            </p>
            <Link
              href="/pro"
              className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 border border-white/15"
            >
              <span>Gérer mon abonnement</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0F2B6B] via-[#143E9C] to-[#1E60F8] text-white shadow-md relative overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center mb-2.5 backdrop-blur-xs">
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            </div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.5 rounded">
                Plan Gratuit
              </span>
            </div>
            <h4 className="text-xs font-black tracking-tight leading-tight mt-1">
              Passez à Juula Pro
            </h4>
            <p className="text-[10px] text-white/80 leading-relaxed mt-1 mb-3">
              Débloquez le paiement à la livraison, les pixels pubs et des produits illimités pour 6
              000 F/mois.
            </p>
            <Link
              href="/pro"
              className="w-full py-2.5 px-3 rounded-xl bg-white text-[#1E60F8] hover:bg-white/90 active:scale-[0.98] text-[11px] font-black transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>Découvrir Juula Pro (6 000 F)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};
