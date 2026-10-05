'use client';

import React, { useState } from 'react';
import {
  Eye,
  Users,
  MousePointer,
  ShoppingBag,
  TrendingUp,
  MoreHorizontal,
  BrainCircuit,
  Lightbulb,
  Bot,
  Plus,
  Maximize2,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { KpiMetrics, OrderLead, FunnelPageConfig, WalletState } from '@/types/juula';
import { formatFCFA } from '@/lib/orderUtils';
import { HeaderWidgetsState } from '@/components/dashboard/Header';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import type { PeriodRange } from '@/lib/store/period';

interface CockpitViewProps {
  kpis: KpiMetrics;
  wallet: WalletState;
  funnelConfig: FunnelPageConfig;
  recentOrders: OrderLead[];
  onCreatePageClick: () => void;
  onOpenRecharge: () => void;
  onOpenPayoutModal: () => void;
  onOpenStorefrontPreview: () => void;
  onOpenKanban: () => void;
  onOpenWallet: () => void;
  activeWidgets?: HeaderWidgetsState;
  /** Orders of the previous period (for comparisons and the chart). */
  previousOrders: OrderLead[];
  periodRange: PeriodRange;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  kpis: _kpis,
  wallet: _wallet,
  funnelConfig,
  recentOrders,
  previousOrders,
  periodRange,
  onCreatePageClick,
  onOpenPayoutModal,
  onOpenKanban,
  activeWidgets = {
    kpiCards: true,
    profitChart: true,
    segmentation: true,
    activeDays: true,
    deliveryRate: true,
    aiAssistant: true,
    bestProducts: true,
  },
}) => {
  const [selectedDay, setSelectedDay] = useState('Mar');
  const [aiGeneratedTip, setAiGeneratedTip] = useState<string | null>(null);

  // Real metrics for the selected period, compared with the previous one.
  const periodData = React.useMemo(() => {
    const live = (list: OrderLead[]) => list.filter((o) => o.status !== 'cancelled');
    const revenueOf = (list: OrderLead[]) =>
      live(list).reduce((s, o) => s + (o.totalAmount ?? o.amount), 0);
    const delivered = (list: OrderLead[]) => list.filter((o) => o.status === 'delivered').length;
    const change = (cur: number, prev: number) => {
      if (prev === 0) return { text: cur > 0 ? 'Nouveau' : '0%', positive: true };
      const pct = Math.round(((cur - prev) / prev) * 100);
      return { text: `${pct > 0 ? '+' : ''}${pct}%`, positive: pct >= 0 };
    };

    const rev = revenueOf(recentOrders);
    const prevRev = revenueOf(previousOrders);
    const count = live(recentOrders).length;
    const prevCount = live(previousOrders).length;
    const basket = count ? Math.round(rev / count) : 0;
    const prevBasket = prevCount ? Math.round(prevRev / prevCount) : 0;
    const del = delivered(recentOrders);
    const prevDel = delivered(previousOrders);

    const c1 = change(rev, prevRev);
    const c2 = change(basket, prevBasket);
    const c3 = change(del, prevDel);
    const c4 = change(count, prevCount);
    return {
      views: formatFCFA(rev),
      viewsChange: c1.text,
      viewsPositive: c1.positive,
      viewsPrevious: `Période préc. : ${formatFCFA(prevRev)}`,
      visitors: formatFCFA(basket),
      visitorsChange: c2.text,
      visitorsPositive: c2.positive,
      visitorsPrevious: `Période préc. : ${formatFCFA(prevBasket)}`,
      clicks: String(del),
      clicksChange: c3.text,
      clicksPositive: c3.positive,
      clicksPrevious: `Période préc. : ${prevDel}`,
      orders: String(count),
      ordersChange: c4.text,
      ordersPositive: c4.positive,
      ordersPrevious: `Période préc. : ${prevCount}`,
      totalRevenue: rev,
      revenueChange: c1.text,
      revenuePositive: c1.positive,
    };
  }, [recentOrders, previousOrders]);

  const activeDaysList = React.useMemo(() => {
    if (recentOrders.length === 0) {
      return [
        { day: 'Dim', height: 12, value: formatFCFA(0), full: 'Dimanche' },
        { day: 'Lun', height: 12, value: formatFCFA(0), full: 'Lundi' },
        { day: 'Mar', height: 12, value: formatFCFA(0), full: 'Mardi' },
        { day: 'Mer', height: 12, value: formatFCFA(0), full: 'Mercredi' },
        { day: 'Jeu', height: 12, value: formatFCFA(0), full: 'Jeudi' },
        { day: 'Ven', height: 12, value: formatFCFA(0), full: 'Vendredi' },
        { day: 'Sam', height: 12, value: formatFCFA(0), full: 'Samedi' },
      ];
    }
    const daysMap: Record<string, number> = {
      Dim: 0,
      Lun: 0,
      Mar: 0,
      Mer: 0,
      Jeu: 0,
      Ven: 0,
      Sam: 0,
    };
    recentOrders.forEach((o) => {
      const dayName = 'Mar';
      daysMap[dayName] = (daysMap[dayName] || 0) + (o.totalAmount || o.amount);
    });
    return [
      {
        day: 'Dim',
        height: Math.max(12, Math.min(100, (daysMap.Dim || 0) / 1000)),
        value: formatFCFA(daysMap.Dim || 0),
        full: 'Dimanche',
      },
      {
        day: 'Lun',
        height: Math.max(12, Math.min(100, (daysMap.Lun || 0) / 1000)),
        value: formatFCFA(daysMap.Lun || 0),
        full: 'Lundi',
      },
      {
        day: 'Mar',
        height: Math.max(12, Math.min(100, (daysMap.Mar || 0) / 1000)),
        value: formatFCFA(daysMap.Mar || 0),
        full: 'Mardi',
      },
      {
        day: 'Mer',
        height: Math.max(12, Math.min(100, (daysMap.Mer || 0) / 1000)),
        value: formatFCFA(daysMap.Mer || 0),
        full: 'Mercredi',
      },
      {
        day: 'Jeu',
        height: Math.max(12, Math.min(100, (daysMap.Jeu || 0) / 1000)),
        value: formatFCFA(daysMap.Jeu || 0),
        full: 'Jeudi',
      },
      {
        day: 'Ven',
        height: Math.max(12, Math.min(100, (daysMap.Ven || 0) / 1000)),
        value: formatFCFA(daysMap.Ven || 0),
        full: 'Vendredi',
      },
      {
        day: 'Sam',
        height: Math.max(12, Math.min(100, (daysMap.Sam || 0) / 1000)),
        value: formatFCFA(daysMap.Sam || 0),
        full: 'Samedi',
      },
    ];
  }, [recentOrders]);

  // Dynamic segmentation
  const codCount = recentOrders.filter((o) => o.paymentType === 'cod').length;
  const mobileMoneyCount = recentOrders.filter((o) => o.paymentType !== 'cod').length;
  const totalOrdersCount = recentOrders.length;
  const uniqueCustomersCount = new Set(recentOrders.map((o) => o.phone || o.customerName)).size;
  const codPercent = totalOrdersCount > 0 ? Math.round((codCount / totalOrdersCount) * 100) : 0;
  const mobileMoneyPercent =
    totalOrdersCount > 0 ? Math.round((mobileMoneyCount / totalOrdersCount) * 100) : 0;

  // Dynamic delivery rate
  const deliveredCount = recentOrders.filter((o) => o.status === 'delivered').length;
  const deliveryPercent =
    totalOrdersCount > 0 ? Math.round((deliveredCount / totalOrdersCount) * 100) : 0;

  // Best selling products table derived from current products and sales
  const bestProducts = React.useMemo(() => {
    if (recentOrders.length === 0) {
      if (funnelConfig.productTitle) {
        return [
          {
            id: funnelConfig.storeCode || '#001',
            name: funnelConfig.productTitle,
            image:
              funnelConfig.mediaItems[0]?.url ||
              'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=120&q=80',
            sold: '0 vendu',
            revenue: formatFCFA(0),
            rating: '—',
          },
        ];
      }
      return [];
    }
    const count = recentOrders.length;
    const rev = recentOrders.reduce((sum, o) => sum + (o.totalAmount || o.amount), 0);
    return [
      {
        id: funnelConfig.storeCode || '#001',
        name: funnelConfig.productTitle,
        image:
          funnelConfig.mediaItems[0]?.url ||
          recentOrders[0]?.productImage ||
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=120&q=80',
        sold: `${count} vendu${count > 1 ? 's' : ''}`,
        revenue: `${formatFCFA(rev)}`,
        rating: `${deliveryPercent}%`,
      },
    ];
  }, [recentOrders, funnelConfig, deliveryPercent]);

  const handleGenerateAiTip = () => {
    if (recentOrders.length === 0) {
      setAiGeneratedTip(
        'Conseil de lancement : Votre boutique est prête ! Partagez le lien de votre vitrine sur WhatsApp, TikTok et Instagram pour recevoir vos premières commandes.',
      );
    } else {
      setAiGeneratedTip(
        `Analyse IA : Vous avez ${recentOrders.length} commande(s). Concentrez vos campagnes sur les créneaux 19h-22h pour maximiser votre taux de transformation.`,
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* 1. TOP ROW: 4 KPI CARDS (MATCHING SHOPEERS PIXEL-PERFECT) */}
      {/* ======================================================== */}
      {activeWidgets.kpiCards && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Page Views */}
          <div className="bg-white rounded-[28px] p-3.5 sm:p-5 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] sm:text-[13px] font-semibold text-[#7A808C] truncate">
                Chiffre d’affaires
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
              <span className="text-2xl sm:text-[28px] font-black text-[#201D1D] tracking-tight">
                {periodData.views}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] sm:text-xs font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full ${
                  periodData.viewsPositive
                    ? 'text-[#059669] bg-[#ECFDF5]'
                    : 'text-[#E11D48] bg-[#FFF1F2]'
                }`}
              >
                {periodData.viewsChange}
              </span>
            </div>

            <p className="text-xs sm:text-[13px] text-[#94A3B8] truncate">
              {periodData.viewsPrevious}
            </p>
          </div>

          {/* Card 2: Visitors */}
          <div className="bg-white rounded-[28px] p-3.5 sm:p-5 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] sm:text-[13px] font-semibold text-[#7A808C] truncate">
                Panier moyen
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
              <span className="text-2xl sm:text-[28px] font-black text-[#201D1D] tracking-tight">
                {periodData.visitors}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] sm:text-xs font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full ${
                  periodData.visitorsPositive
                    ? 'text-[#059669] bg-[#ECFDF5]'
                    : 'text-[#E11D48] bg-[#FFF1F2]'
                }`}
              >
                {periodData.visitorsChange}
              </span>
            </div>

            <p className="text-xs sm:text-[13px] text-[#94A3B8] truncate">
              {periodData.visitorsPrevious}
            </p>
          </div>

          {/* Card 3: Click */}
          <div className="bg-white rounded-[28px] p-3.5 sm:p-5 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] sm:text-[13px] font-semibold text-[#7A808C] truncate">
                Commandes livrées
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
                <MousePointer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
              <span className="text-2xl sm:text-[28px] font-black text-[#201D1D] tracking-tight">
                {periodData.clicks}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] sm:text-xs font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full ${
                  periodData.clicksPositive
                    ? 'text-[#059669] bg-[#ECFDF5]'
                    : 'text-[#E11D48] bg-[#FFF1F2]'
                }`}
              >
                {periodData.clicksChange}
              </span>
            </div>

            <p className="text-xs sm:text-[13px] text-[#94A3B8] truncate">
              {periodData.clicksPrevious}
            </p>
          </div>

          {/* Card 4: Orders */}
          <div className="bg-white rounded-[28px] p-3.5 sm:p-5 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] sm:text-[13px] font-semibold text-[#7A808C] truncate">
                Commandes reçues
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
              <span className="text-2xl sm:text-[28px] font-black text-[#201D1D] tracking-tight">
                {periodData.orders}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] sm:text-xs font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full ${
                  periodData.ordersPositive
                    ? 'text-[#059669] bg-[#ECFDF5]'
                    : 'text-[#E11D48] bg-[#FFF1F2]'
                }`}
              >
                {periodData.ordersChange}
              </span>
            </div>

            <p className="text-xs sm:text-[13px] text-[#94A3B8] truncate">
              {periodData.ordersPrevious}
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MIDDLE GRID: TOTAL PROFIT CHART + CUSTOMERS SEGMENTATION */}
      {/* ======================================================== */}
      {(activeWidgets.profitChart ||
        activeWidgets.segmentation ||
        activeWidgets.activeDays ||
        activeWidgets.deliveryRate ||
        activeWidgets.aiAssistant) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols): Total Profit Spline Chart + Customers */}
          {(activeWidgets.profitChart || activeWidgets.segmentation) && (
            <div
              className={`${
                !activeWidgets.activeDays &&
                !activeWidgets.deliveryRate &&
                !activeWidgets.aiAssistant
                  ? 'lg:col-span-12'
                  : 'lg:col-span-8'
              } space-y-6`}
            >
              {/* Main Chart Card */}
              {activeWidgets.profitChart && (
                <div className="bg-white rounded-[28px] p-6 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-base font-bold text-[#7A808C] block truncate">
                        Bénéfice & Chiffre d'Affaires Total
                      </span>
                      {/* Strictly on a single line / whitespace-nowrap */}
                      <div className="flex flex-wrap items-baseline gap-2.5 mt-1 whitespace-nowrap">
                        <span className="text-3xl sm:text-4xl font-black text-[#201D1D] tracking-tight whitespace-nowrap">
                          {formatFCFA(periodData.totalRevenue)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-bold whitespace-nowrap ${
                            periodData.revenuePositive ? 'text-[#16A34A]' : 'text-[#DC2626]'
                          }`}
                        >
                          <span>{periodData.revenueChange}</span>
                          <span className="text-[#94A3B8] font-normal">vs période préc.</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={onOpenPayoutModal}
                        className="px-3 py-1.5 rounded-xl bg-[#EEF3FF] hover:bg-[#DBEAFE] text-[#235BF7] text-[13px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Retirer vers Wave / OM
                      </button>
                      <button className="p-1.5 text-[#94A3B8] hover:text-[#201D1D] rounded-lg">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Real revenue curve for the selected period vs the previous one */}
                  <div className="pt-2">
                    <RevenueChart
                      orders={recentOrders}
                      previousOrders={previousOrders}
                      range={periodRange}
                    />
                  </div>
                </div>
              )}

              {/* Customers Segmentation Card */}
              {activeWidgets.segmentation && (
                <div className="bg-white rounded-[28px] p-6 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-bold text-[#7A808C] block">
                        Segmentation des Commandes & Clients
                      </span>
                      <span className="text-[13px] text-[#94A3B8]">
                        {uniqueCustomersCount} client(s) unique(s) enregistré(s)
                      </span>
                    </div>
                    <button className="p-1 text-[#94A3B8] hover:text-[#201D1D]">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4 pt-1">
                    {/* Segment 1 : COD Espèces */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[13px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-md bg-[#235BF7] shadow-xs shrink-0" />
                          <span className="font-bold text-[#201D1D] truncate">
                            <span className="hidden sm:inline">Commandes </span>Cash on Delivery
                            (COD)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="tabular-nums font-black text-[#201D1D]">{codCount}</span>
                          <span className="text-xs font-black bg-[#EEF3FF] text-[#235BF7] px-2 py-0.5 rounded-md">
                            {codPercent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[#E2E8F0] h-2 sm:h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#235BF7] h-full rounded-full transition-all duration-700"
                          style={{ width: `${codPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Segment 2 : Mobile Money (paiement en ligne) */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[13px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-md bg-[#10B981] shadow-xs shrink-0" />
                          <span className="font-bold text-[#201D1D] truncate">
                            <span className="hidden sm:inline">Paiements </span>Mobile Money
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-[#201D1D] tabular-nums">
                            {mobileMoneyCount}
                          </span>
                          <span className="text-xs font-black bg-[#ECFDF5] text-[#059669] px-2 py-0.5 rounded-md">
                            {mobileMoneyPercent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[#E2E8F0] h-2 sm:h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#10B981] h-full rounded-full transition-all duration-700"
                          style={{ width: `${mobileMoneyPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right Column (4 cols): Most Day Active, Dotted Arc Gauge, AI Assistant */}
          {(activeWidgets.activeDays ||
            activeWidgets.deliveryRate ||
            activeWidgets.aiAssistant) && (
            <div
              className={`${
                !activeWidgets.profitChart && !activeWidgets.segmentation
                  ? 'lg:col-span-12'
                  : 'lg:col-span-4'
              } space-y-6`}
            >
              {/* Card 1: Most Day Active (Interactive bar chart with amounts) */}
              {activeWidgets.activeDays && (
                <div className="bg-white rounded-[28px] p-5 sm:p-6 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-bold text-[#7A808C] block">
                        Journées les Plus Actives
                      </span>
                      <span className="text-xs text-[#94A3B8]">
                        Volume d'encaissements par jour
                      </span>
                    </div>
                    <button className="text-[#94A3B8] hover:text-[#201D1D] p-1">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Vertical Bars */}
                  <div className="pt-2">
                    <div className="flex items-end justify-between h-36 px-1 sm:px-2 gap-1 sm:gap-1.5">
                      {activeDaysList.map((item) => {
                        const isSelected = selectedDay === item.day;
                        return (
                          <div
                            key={item.day}
                            className="flex-1 flex flex-col items-center gap-2 cursor-pointer group max-w-[36px]"
                            onClick={() => setSelectedDay(item.day)}
                          >
                            {isSelected && (
                              <span className="text-[11px] sm:text-xs font-black text-[#235BF7] bg-[#EEF3FF] px-1 sm:px-1.5 py-0.5 rounded-md -mb-1 animate-pulse whitespace-nowrap shadow-xs">
                                {item.value}
                              </span>
                            )}
                            <div
                              className={`w-full max-w-[28px] rounded-xl transition-all ${
                                isSelected
                                  ? 'bg-[#235BF7] shadow-[0_4px_12px_rgba(30,96,248,0.3)] scale-105'
                                  : 'bg-[#F1F5F9] hover:bg-[#CBD5E1]'
                              }`}
                              style={{ height: `${item.height}px` }}
                              title={`${item.full} : ${item.value}`}
                            />
                            <span
                              className={`text-xs font-bold ${
                                isSelected ? 'text-[#235BF7]' : 'text-[#94A3B8]'
                              }`}
                            >
                              {item.day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Card 2: Taux de Livraison Réussie (Image 2 Pixel-Perfect Solid Arc Gauge - Redesigned) */}
              {activeWidgets.deliveryRate && (
                <div className="bg-white rounded-[28px] p-5 sm:p-6 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5 text-center">
                  <div className="flex items-center justify-between text-left">
                    <div>
                      <span className="text-[13px] font-bold text-[#7A808C] block">
                        Taux de Livraison Réussie
                      </span>
                      <span className="text-xs text-[#94A3B8]">Performance des expéditions</span>
                    </div>
                    <button className="text-[#94A3B8] hover:text-[#201D1D] p-1">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Semicircular Solid Gauge SVG with perfect geometry & target marker */}
                  <div className="relative flex flex-col items-center justify-center pt-2 pb-0">
                    <svg
                      viewBox="0 0 260 145"
                      className="w-56 sm:w-64 max-w-full h-32 sm:h-36 overflow-visible"
                    >
                      <defs>
                        <linearGradient id="deliveryGaugeGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#059669" />
                          <stop offset="65%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#00D084" />
                        </linearGradient>
                        <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow
                            dx="0"
                            dy="3"
                            stdDeviation="3"
                            floodColor="#10B981"
                            floodOpacity="0.25"
                          />
                        </filter>
                      </defs>

                      {/* Semicircle background track */}
                      <path
                        d="M 34 130 A 96 96 0 0 1 226 130"
                        fill="none"
                        stroke="#F1F5F9"
                        strokeWidth="16"
                        strokeLinecap="round"
                      />

                      {/* Target 80% marker on track (x=207.7, y=73.6) */}
                      <g className="transition-opacity duration-300">
                        <circle
                          cx="207.7"
                          cy="73.6"
                          r="4.5"
                          fill="#FFFFFF"
                          stroke="#235BF7"
                          strokeWidth="2.5"
                          className="drop-shadow-xs"
                        />
                      </g>

                      {/* Active solid emerald progress arc */}
                      <path
                        d="M 34 130 A 96 96 0 0 1 226 130"
                        fill="none"
                        stroke="url(#deliveryGaugeGrad)"
                        strokeWidth="16"
                        strokeLinecap="round"
                        strokeDasharray={`${(deliveryPercent / 100) * 302} 302`}
                        filter="url(#gaugeShadow)"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>

                    {/* Centered stat inside arc dome */}
                    <div className="absolute bottom-1 inset-x-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                      <span className="text-4xl font-black text-[#201D1D] tracking-tight leading-none">
                        {deliveryPercent}%
                      </span>
                      <span className="text-xs font-extrabold uppercase tracking-widest text-[#94A3B8] mt-1.5">
                        Taux Actuel
                      </span>
                    </div>
                  </div>

                  {/* Clean status pill & target comparison below arc */}
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-[13px] font-bold shadow-2xs">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {totalOrdersCount === 0
                          ? 'En attente de commandes'
                          : deliveryPercent >= 80
                            ? 'Objectif 80% atteint !'
                            : 'En bonne voie pour 80%'}
                      </span>
                    </div>

                    {/* Quick Metrics Breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-left pt-1 border-t border-[#F1F5F9]">
                      <div className="bg-[#F8FAFC] rounded-2xl p-2.5 border border-[#E2E8F0]/70">
                        <span className="text-xs font-bold text-[#7A808C] block uppercase tracking-wider">
                          Colis Livrés
                        </span>
                        <span className="text-[15px] font-black text-[#201D1D]">
                          {deliveredCount}
                        </span>
                      </div>
                      <div className="bg-[#F8FAFC] rounded-2xl p-2.5 border border-[#E2E8F0]/70">
                        <span className="text-xs font-bold text-[#7A808C] block uppercase tracking-wider">
                          Objectif Cible
                        </span>
                        <span className="text-[15px] font-black text-[#235BF7]">
                          80% <span className="text-xs text-[#94A3B8] font-normal">cible</span>
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={onOpenKanban}
                      className="w-full py-2.5 px-4 rounded-2xl bg-[#201D1D] hover:bg-[#1E293B] text-white text-[13px] font-bold transition-all shadow-xs flex items-center justify-center gap-2 group cursor-pointer"
                    >
                      <Truck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>Voir les détails logistiques</span>
                      <ArrowRight className="w-3.5 h-3.5 text-white/70 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {/* Card 3: AI Assistant Widget */}
              {activeWidgets.aiAssistant && (
                <div className="bg-white rounded-[28px] p-5 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center">
                        <BrainCircuit className="w-4.5 h-4.5" />
                      </span>
                      <span className="text-[13px] font-bold text-[#201D1D]">
                        Assistant IA Juula
                      </span>
                    </div>
                    <button
                      onClick={handleGenerateAiTip}
                      className="text-[#94A3B8] hover:text-[#201D1D]"
                      title="Agrandir"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 p-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    {/* 3D Blue Sphere matching Shopeers */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0F2B6B] via-[#235BF7] to-[#93C5FD] shadow-[0_6px_16px_rgba(30,96,248,0.4)] flex-shrink-0 flex items-center justify-center ring-4 ring-white text-white">
                      <Bot className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#201D1D] leading-tight">
                        Optimiseur de Ventes & Accroches
                      </p>
                      <p className="text-[13px] text-[#7A808C] mt-0.5">
                        Générez vos textes pubs en 1 clic
                      </p>
                    </div>
                  </div>

                  {aiGeneratedTip ? (
                    <p className="text-[13px] text-[#201D1D] bg-[#EEF3FF] p-3 rounded-xl border border-[#BFDBFE] leading-relaxed animate-in fade-in">
                      {aiGeneratedTip}
                    </p>
                  ) : (
                    <button
                      onClick={handleGenerateAiTip}
                      className="w-full py-2 px-3 rounded-xl bg-[#EEF3FF] hover:bg-[#DBEAFE] text-[#235BF7] text-[13px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Lightbulb className="w-4 h-4" />
                      <span>Générer un conseil pour aujourd'hui</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. BOTTOM SECTION: BEST SELLING PRODUCTS TABLE (SHOPEERS) */}
      {/* ======================================================== */}
      {activeWidgets.bestProducts && (
        <div className="bg-white rounded-[28px] p-4 sm:p-6 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
            <div className="min-w-0">
              <h3 className="text-[15px] font-extrabold text-[#201D1D]">Meilleurs produits</h3>
              <p className="text-[13px] text-[#7A808C]">Classement par commandes reçues</p>
            </div>

            <button
              type="button"
              onClick={onCreatePageClick}
              className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#235BF7] text-white text-[13px] font-bold hover:bg-[#1B4AD6] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Nouvelle page
            </button>
          </div>

          {bestProducts.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#94A3B8]">
              Aucune page de vente pour le moment. Cliquez sur « Nouvelle page » pour créer votre
              première page.
            </p>
          ) : (
            <>
              {/* Phone: one card per product */}
              <div className="space-y-2.5 sm:hidden">
                {bestProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-[#ECEFF4]"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[14px] text-[#201D1D] truncate">
                        {product.name}
                      </p>
                      <p className="text-[13px] text-[#7A808C]">
                        {product.sold} · {product.rating} livrées
                      </p>
                      <p className="font-black text-[15px] text-[#059669]">{product.revenue}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablet / desktop: table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#F1F5F9] text-[#94A3B8] font-bold uppercase text-xs tracking-wider">
                      <th className="pb-3 px-3">Produit</th>
                      <th className="pb-3 px-3">Unités vendues</th>
                      <th className="pb-3 px-3">Chiffre d’affaires</th>
                      <th className="pb-3 px-3">Taux de livraison</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8FAFC]">
                    {bestProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 rounded-xl object-cover bg-slate-100 flex-shrink-0"
                            />
                            <span className="font-bold text-[#201D1D]">{product.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#7A808C]">{product.sold}</td>
                        <td className="py-3 px-3 font-black text-[#059669]">{product.revenue}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 font-bold text-[#201D1D]">
                            <Truck className="w-3.5 h-3.5 text-[#235BF7]" />
                            {product.rating}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
