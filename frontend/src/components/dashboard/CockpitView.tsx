'use client';

import React, { useState } from 'react';
import {
  Eye,
  Users,
  MousePointer,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  ChevronDown,
  ArrowUpRight,
  Sparkles,
  Star,
  CheckCircle2,
  Clock,
  Layers,
  Wand2,
  Maximize2,
  CreditCard,
  Banknote,
  Smartphone,
  ExternalLink,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KpiMetrics, OrderLead, FunnelPageConfig, WalletState } from '@/types/juula';
import { formatNumber } from '@/lib/orderUtils';
import { HeaderWidgetsState } from '@/components/dashboard/Header';

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
  selectedPeriod?: string;
  selectedDateRange?: string;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  kpis,
  wallet,
  funnelConfig,
  recentOrders,
  onCreatePageClick,
  onOpenRecharge,
  onOpenPayoutModal,
  onOpenStorefrontPreview,
  onOpenKanban,
  onOpenWallet,
  activeWidgets = {
    kpiCards: true,
    profitChart: true,
    segmentation: true,
    activeDays: true,
    deliveryRate: true,
    aiAssistant: true,
    bestProducts: true,
  },
  selectedPeriod = '30 derniers jours',
  selectedDateRange = '1 Jan, 2026 - 4 Oct, 2026',
}) => {
  const [selectedDay, setSelectedDay] = useState('Mar');
  const [aiGeneratedTip, setAiGeneratedTip] = useState<string | null>(null);

  // Dynamic metrics & spline chart points based on selected period
  const periodData = React.useMemo(() => {
    const periodLower = (selectedPeriod || '').toLowerCase();
    if (periodLower.includes('aujourd')) {
      return {
        views: '845',
        viewsChange: '▲ 12,4%',
        viewsPositive: true,
        viewsPrevious: 'vs 752 hier',
        visitors: '312',
        visitorsChange: '▲ 9,1%',
        visitorsPositive: true,
        visitorsPrevious: 'vs 286 hier',
        clicks: '142',
        clicksChange: '▼ 4,2%',
        clicksPositive: false,
        clicksPrevious: 'vs 148 hier',
        orders: '58',
        ordersChange: '▲ 18,2%',
        ordersPositive: true,
        ordersPrevious: 'vs 49 hier',
        totalRevenue: 89700,
        revenueChange: '▲ 18,2%',
        points: [
          { label: '08h', date: 'Aujourd’hui 08h', revenue: '14 500 FCFA', growth: '+5,2%', cx: 40, cy: 135 },
          { label: '11h', date: 'Aujourd’hui 11h', revenue: '38 000 FCFA', growth: '+12,0%', cx: 150, cy: 110 },
          { label: '14h', date: 'Aujourd’hui 14h', revenue: '59 500 FCFA', growth: '+18,4%', cx: 250, cy: 85 },
          { label: '17h', date: 'Aujourd’hui 17h', revenue: '89 700 FCFA', growth: '+24,1%', cx: 470, cy: 60 },
          { label: '20h', date: 'Aujourd’hui 20h', revenue: '112 400 FCFA', growth: '+28,5%', cx: 590, cy: 40 },
        ],
      };
    }
    if (periodLower.includes('7')) {
      return {
        views: '4 210',
        viewsChange: '▲ 14,2%',
        viewsPositive: true,
        viewsPrevious: 'vs 3 680 semaine préc.',
        visitors: '1 680',
        visitorsChange: '▲ 11,5%',
        visitorsPositive: true,
        visitorsPrevious: 'vs 1 506 semaine préc.',
        clicks: '710',
        clicksChange: '▼ 5,1%',
        clicksPositive: false,
        clicksPrevious: 'vs 748 semaine préc.',
        orders: '318',
        ordersChange: '▲ 8,7%',
        ordersPositive: true,
        ordersPrevious: 'vs 292 semaine préc.',
        totalRevenue: 178500,
        revenueChange: '▲ 15,4%',
        points: [
          { label: 'Lun', date: '29 Sept', revenue: '48 000 FCFA', growth: '+8,1%', cx: 40, cy: 130 },
          { label: 'Mar', date: '30 Sept', revenue: '82 000 FCFA', growth: '+14,3%', cx: 150, cy: 105 },
          { label: 'Mer', date: '1 Oct', revenue: '115 000 FCFA', growth: '+17,5%', cx: 250, cy: 85 },
          { label: 'Jeu', date: '2 Oct', revenue: '148 000 FCFA', growth: '+21,0%', cx: 470, cy: 65 },
          { label: 'Ven', date: '3 Oct', revenue: '178 500 FCFA', growth: '+25,4%', cx: 590, cy: 45 },
        ],
      };
    }
    // Default 30 jours, 14 jours or Ce mois
    return {
      views: '16,431',
      viewsChange: '▲ 15,5%',
      viewsPositive: true,
      viewsPrevious: 'vs 14,653 période précédente',
      visitors: '6,225',
      visitorsChange: '▲ 8,4%',
      visitorsPositive: true,
      visitorsPrevious: 'vs 5,732 période précédente',
      clicks: '2,832',
      clicksChange: '▼ 10,5%',
      clicksPositive: false,
      clicksPrevious: 'vs 3,294 période précédente',
      orders: '1,224',
      ordersChange: '▲ 4,4%',
      ordersPositive: true,
      ordersPrevious: 'vs 1,186 période précédente',
      totalRevenue: wallet.availableBalance,
      revenueChange: '▲ 24,4%',
      points: [
        { label: '1 Jan', date: '1 Jan 2026', revenue: '65 000 FCFA', growth: '+8,4%', cx: 40, cy: 135 },
        { label: '8 Jan', date: '8 Jan 2026', revenue: '115 000 FCFA', growth: '+14,2%', cx: 150, cy: 115 },
        { label: '15 Jan', date: '15 Jan 2026', revenue: '168 000 FCFA', growth: '+19,1%', cx: 250, cy: 85 },
        { label: '22 Jan', date: '22 Jan 2026', revenue: '224 500 FCFA', growth: '+22,8%', cx: 470, cy: 65 },
        { label: '29 Jan', date: '29 Jan 2026', revenue: '249 800 FCFA', growth: '+24,4%', cx: 590, cy: 45 },
      ],
    };
  }, [selectedPeriod, wallet.availableBalance]);

  const splinePoints = periodData.points;

  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    date: string;
    revenue: string;
    growth: string;
    cx: number;
    cy: number;
  } | null>(periodData.points[3] || null);

  // Sync hovered point when period changes
  React.useEffect(() => {
    if (periodData.points[3]) {
      setHoveredPoint(periodData.points[3]);
    }
  }, [periodData]);

  const activeDaysList = [
    { day: 'Dim', height: 45, value: '3 120 000 F', full: 'Dimanche' },
    { day: 'Lun', height: 70, value: '4 850 000 F', full: 'Lundi' },
    { day: 'Mar', height: 95, value: '8 162 000 F', full: 'Mardi (Pic de ventes)' },
    { day: 'Mer', height: 55, value: '3 940 000 F', full: 'Mercredi' },
    { day: 'Jeu', height: 60, value: '4 410 000 F', full: 'Jeudi' },
    { day: 'Ven', height: 80, value: '5 620 000 F', full: 'Vendredi' },
    { day: 'Sam', height: 65, value: '4 190 000 F', full: 'Samedi' },
  ];

  // Best selling products table matching Shopeers
  const bestProducts = [
    {
      id: '#83009',
      name: 'Montre Automatique Royale Saphir Noire',
      image: funnelConfig.mediaItems[0]?.url || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=120&q=80',
      sold: '2,310 vendus',
      revenue: '57 519 000 FCFA',
      rating: '5.0',
    },
    {
      id: '#83001',
      name: 'Duo Sérum Éclat Pure Niacinamide 10%',
      image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=120&q=80',
      sold: '1,230 vendus',
      revenue: '23 985 000 FCFA',
      rating: '4.8',
    },
    {
      id: '#83004',
      name: 'Pack Sneakers Pro Streetwear Dakar',
      image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=120&q=80',
      sold: '812 vendus',
      revenue: '24 278 800 FCFA',
      rating: '4.7',
    },
  ];

  const handleGenerateAiTip = () => {
    setAiGeneratedTip(
      'Analyse IA : Votre pic de conversion est le mardi entre 19h et 22h. Augmentez votre budget ads TikTok de 25% sur ce créneau pour capturer 14 commandes COD supplémentaires.'
    );
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
          <div className="bg-white rounded-3xl p-3.5 sm:p-5 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-[#64748B] truncate">Vues de la Page</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EFF4FF] text-[#1E60F8] flex items-center justify-center shrink-0">
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                {periodData.views}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full ${
                  periodData.viewsPositive
                    ? 'text-[#059669] bg-[#ECFDF5]'
                    : 'text-[#E11D48] bg-[#FFF1F2]'
                }`}
              >
                {periodData.viewsChange}
              </span>
            </div>

            <p className="text-[10px] sm:text-[11px] text-[#94A3B8] truncate">
              {periodData.viewsPrevious}
            </p>
          </div>

          {/* Card 2: Visitors */}
          <div className="bg-white rounded-3xl p-3.5 sm:p-5 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-[#64748B] truncate">Visiteurs Uniques</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EFF4FF] text-[#1E60F8] flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                {periodData.visitors}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full ${
                  periodData.visitorsPositive
                    ? 'text-[#059669] bg-[#ECFDF5]'
                    : 'text-[#E11D48] bg-[#FFF1F2]'
                }`}
              >
                {periodData.visitorsChange}
              </span>
            </div>

            <p className="text-[10px] sm:text-[11px] text-[#94A3B8] truncate">
              {periodData.visitorsPrevious}
            </p>
          </div>

          {/* Card 3: Click */}
          <div className="bg-white rounded-3xl p-3.5 sm:p-5 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-[#64748B] truncate">Clics sur Offre</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EFF4FF] text-[#1E60F8] flex items-center justify-center shrink-0">
                <MousePointer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                {periodData.clicks}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full ${
                  periodData.clicksPositive
                    ? 'text-[#059669] bg-[#ECFDF5]'
                    : 'text-[#E11D48] bg-[#FFF1F2]'
                }`}
              >
                {periodData.clicksChange}
              </span>
            </div>

            <p className="text-[10px] sm:text-[11px] text-[#94A3B8] truncate">
              {periodData.clicksPrevious}
            </p>
          </div>

          {/* Card 4: Orders */}
          <div className="bg-white rounded-3xl p-3.5 sm:p-5 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-[#64748B] truncate">Commandes Reçues</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EFF4FF] text-[#1E60F8] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                {periodData.orders}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full ${
                  periodData.ordersPositive
                    ? 'text-[#059669] bg-[#ECFDF5]'
                    : 'text-[#E11D48] bg-[#FFF1F2]'
                }`}
              >
                {periodData.ordersChange}
              </span>
            </div>

            <p className="text-[10px] sm:text-[11px] text-[#94A3B8] truncate">
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
                <div className="bg-white rounded-3xl p-6 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#64748B] block truncate">
                        Bénéfice & Chiffre d'Affaires Total
                      </span>
                      {/* Strictly on a single line / whitespace-nowrap */}
                      <div className="flex flex-wrap items-baseline gap-2.5 mt-1 whitespace-nowrap">
                        <span className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight whitespace-nowrap">
                          {formatNumber(periodData.totalRevenue)} {wallet.currency}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#059669] whitespace-nowrap">
                          <span>{periodData.revenueChange}</span>
                          <span className="text-[#94A3B8] font-normal">vs période préc.</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={onOpenPayoutModal}
                        className="px-3 py-1.5 rounded-xl bg-[#EFF4FF] hover:bg-[#DBEAFE] text-[#1E60F8] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Retirer vers Wave / OM
                      </button>
                      <button className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive SVG Area Chart with draw animation & point tooltips */}
                  <div className="relative pt-4">
                    {/* Interactive Tooltip pill floating above curve - GUARANTEED single line & responsive bounds */}
                    {hoveredPoint && (
                      <div
                        className={`absolute z-20 pointer-events-none -top-3.5 transition-all duration-150 bg-[#0F172A] text-white px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xl flex items-center gap-1.5 sm:gap-2 border border-white/10 whitespace-nowrap flex-nowrap shrink-0 ${
                          (hoveredPoint.cx / 600) > 0.75
                            ? '-translate-x-[85%]'
                            : (hoveredPoint.cx / 600) < 0.25
                            ? '-translate-x-[15%]'
                            : '-translate-x-1/2'
                        }`}
                        style={{ left: `${(hoveredPoint.cx / 600) * 100}%` }}
                      >
                        <span className="text-[10px] sm:text-[11px] text-white/70 whitespace-nowrap">{hoveredPoint.date} :</span>
                        <span className="text-emerald-300 font-black text-[11px] sm:text-xs whitespace-nowrap">{hoveredPoint.revenue}</span>
                        <span className="text-[9px] sm:text-[10px] text-emerald-400 font-extrabold bg-emerald-500/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {hoveredPoint.growth}
                        </span>
                      </div>
                    )}

                    <svg viewBox="0 0 600 180" className="w-full h-44 overflow-visible">
                      <defs>
                        <linearGradient id="blueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1E60F8" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#1E60F8" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal dotted gridlines */}
                      <line x1="0" y1="30" x2="600" y2="30" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="75" x2="600" y2="75" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="120" x2="600" y2="120" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="160" x2="600" y2="160" stroke="#E2E8F0" strokeWidth="1" />

                      {/* Left Y-axis labels */}
                      <text x="5" y="34" fill="#94A3B8" fontSize="10" fontWeight="600">15M</text>
                      <text x="5" y="79" fill="#94A3B8" fontSize="10" fontWeight="600">10M</text>
                      <text x="5" y="124" fill="#94A3B8" fontSize="10" fontWeight="600">5M</text>
                      <text x="5" y="158" fill="#94A3B8" fontSize="10" fontWeight="600">0</text>

                      {/* Spline Area */}
                      <path
                        d="M 40 135 C 90 140, 110 110, 150 115 C 190 120, 210 90, 250 85 C 290 80, 310 100, 350 70 C 390 40, 420 80, 470 65 C 520 50, 560 60, 590 45 L 590 160 L 40 160 Z"
                        fill="url(#blueAreaGrad)"
                      />

                      {/* Spline Line with smooth entrance animation */}
                      <path
                        d="M 40 135 C 90 140, 110 110, 150 115 C 190 120, 210 90, 250 85 C 290 80, 310 100, 350 70 C 390 40, 420 80, 470 65 C 520 50, 560 60, 590 45"
                        fill="none"
                        stroke="#1E60F8"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />

                      {/* Interactive Points on curve */}
                      {splinePoints.map((pt, idx) => {
                        const isHovered = hoveredPoint?.label === pt.label;
                        return (
                          <g
                            key={idx}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPoint(pt)}
                          >
                            {/* Invisible hover zone */}
                            <circle cx={pt.cx} cy={pt.cy} r="18" fill="transparent" />
                            {/* Visible point */}
                            <circle
                              cx={pt.cx}
                              cy={pt.cy}
                              r={isHovered ? '7' : '4.5'}
                              fill="#FFFFFF"
                              stroke="#1E60F8"
                              strokeWidth={isHovered ? '3.5' : '2.5'}
                              className="transition-all duration-150"
                            />
                            {isHovered && (
                              <circle
                                cx={pt.cx}
                                cy={pt.cy}
                                r="12"
                                fill="none"
                                stroke="#1E60F8"
                                strokeOpacity="0.3"
                                strokeWidth="2"
                                className="animate-ping"
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* X-axis date labels */}
                    <div className="flex justify-between text-[11px] font-semibold text-[#94A3B8] px-10 pt-2">
                      {splinePoints.map((p) => (
                        <span
                          key={p.label}
                          onClick={() => setHoveredPoint(p)}
                          className={`cursor-pointer transition-colors ${
                            hoveredPoint?.label === p.label ? 'text-[#1E60F8] font-black' : 'hover:text-[#0F172A]'
                          }`}
                        >
                          {p.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Customers Segmentation Card */}
              {activeWidgets.segmentation && (
                <div className="bg-white rounded-3xl p-6 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#64748B] block">
                        Segmentation des Commandes & Clients
                      </span>
                      <span className="text-[11px] text-[#94A3B8]">
                        4 878 clients uniques enregistrés à Dakar
                      </span>
                    </div>
                    <button className="p-1 text-[#94A3B8] hover:text-[#0F172A]">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4 pt-1">
                    {/* Segment 1 : COD Espèces */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-md bg-[#1E60F8] shadow-xs shrink-0" />
                          <span className="font-bold text-[#0F172A] truncate">
                            <span className="hidden sm:inline">Commandes </span>Cash on Delivery (COD)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-black text-[#0F172A]">2 884</span>
                          <span className="text-[10px] font-black bg-[#EFF4FF] text-[#1E60F8] px-2 py-0.5 rounded-md">
                            58%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[#E2E8F0] h-2 sm:h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#1E60F8] h-full rounded-full transition-all duration-700" style={{ width: '58%' }} />
                      </div>
                    </div>

                    {/* Segment 2 : Wave Sénégal */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-md bg-[#10B981] shadow-xs shrink-0" />
                          <span className="font-bold text-[#0F172A] truncate">
                            <span className="hidden sm:inline">Paiements en Ligne </span>Wave Sénégal
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-black text-[#0F172A]">1 432</span>
                          <span className="text-[10px] font-black bg-[#ECFDF5] text-[#059669] px-2 py-0.5 rounded-md">
                            29%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[#E2E8F0] h-2 sm:h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#10B981] h-full rounded-full transition-all duration-700" style={{ width: '29%' }} />
                      </div>
                    </div>

                    {/* Segment 3 : Orange Money */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-md bg-[#FF7900] shadow-xs shrink-0" />
                          <span className="font-bold text-[#0F172A] truncate">
                            <span className="hidden sm:inline">Paiements en Ligne </span>Orange Money
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-black text-[#0F172A]">562</span>
                          <span className="text-[10px] font-black bg-[#FFF5EB] text-[#FF7900] px-2 py-0.5 rounded-md">
                            13%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[#E2E8F0] h-2 sm:h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#FF7900] h-full rounded-full transition-all duration-700" style={{ width: '13%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right Column (4 cols): Most Day Active, Dotted Arc Gauge, AI Assistant */}
          {(activeWidgets.activeDays || activeWidgets.deliveryRate || activeWidgets.aiAssistant) && (
            <div
              className={`${
                !activeWidgets.profitChart && !activeWidgets.segmentation
                  ? 'lg:col-span-12'
                  : 'lg:col-span-4'
              } space-y-6`}
            >
              {/* Card 1: Most Day Active (Interactive bar chart with amounts) */}
              {activeWidgets.activeDays && (
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#64748B] block">Journées les Plus Actives</span>
                      <span className="text-[10px] text-[#94A3B8]">Cliquez sur un jour pour voir le volume</span>
                    </div>
                    <button className="text-[#94A3B8] hover:text-[#0F172A] p-1">
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
                              <span className="text-[9px] sm:text-[10px] font-black text-[#1E60F8] bg-[#EFF4FF] px-1 sm:px-1.5 py-0.5 rounded-md -mb-1 animate-pulse whitespace-nowrap shadow-xs">
                                {item.value}
                              </span>
                            )}
                            <div
                              className={`w-full max-w-[28px] rounded-xl transition-all ${
                                isSelected
                                  ? 'bg-[#1E60F8] shadow-[0_4px_12px_rgba(30,96,248,0.3)] scale-105'
                                  : 'bg-[#F1F5F9] hover:bg-[#CBD5E1]'
                              }`}
                              style={{ height: `${item.height}px` }}
                              title={`${item.full} : ${item.value}`}
                            />
                            <span
                              className={`text-[10px] font-bold ${
                                isSelected ? 'text-[#1E60F8]' : 'text-[#94A3B8]'
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
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5 text-center">
                  <div className="flex items-center justify-between text-left">
                    <div>
                      <span className="text-xs font-bold text-[#64748B] block">Taux de Livraison Réussie</span>
                      <span className="text-[10px] text-[#94A3B8]">Performance des expéditions Dakar</span>
                    </div>
                    <button className="text-[#94A3B8] hover:text-[#0F172A] p-1">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Semicircular Solid Gauge SVG with perfect geometry & target marker */}
                  <div className="relative flex flex-col items-center justify-center pt-2 pb-0">
                    <svg viewBox="0 0 260 145" className="w-56 sm:w-64 max-w-full h-32 sm:h-36 overflow-visible">
                      <defs>
                        <linearGradient id="deliveryGaugeGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#059669" />
                          <stop offset="65%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#00D084" />
                        </linearGradient>
                        <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#10B981" floodOpacity="0.25" />
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
                          stroke="#1E60F8"
                          strokeWidth="2.5"
                          className="drop-shadow-xs"
                        />
                      </g>

                      {/* Active solid emerald progress arc (68% of 301.6 = 205.1) */}
                      <path
                        d="M 34 130 A 96 96 0 0 1 226 130"
                        fill="none"
                        stroke="url(#deliveryGaugeGrad)"
                        strokeWidth="16"
                        strokeLinecap="round"
                        strokeDasharray="205.1 302"
                        filter="url(#gaugeShadow)"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>

                    {/* Perfectly centered 68% stat inside the arc dome with ZERO collision */}
                    <div className="absolute top-7 sm:top-8 inset-x-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                      <span className="text-4xl sm:text-5xl font-black text-[#0F172A] tracking-tight leading-none drop-shadow-2xs">
                        68%
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#94A3B8] mt-1.5">
                        Taux Actuel
                      </span>
                    </div>
                  </div>

                  {/* Clean, spacious status pill & target comparison below arc */}
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-xs font-bold shadow-2xs">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>En bonne voie pour 80%</span>
                    </div>

                    {/* Quick Metrics Breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-left pt-1 border-t border-[#F1F5F9]">
                      <div className="bg-[#F8FAFC] rounded-2xl p-2.5 border border-[#E2E8F0]/70">
                        <span className="text-[10px] font-bold text-[#64748B] block uppercase tracking-wider">Colis Livrés</span>
                        <span className="text-sm font-black text-[#0F172A]">832 <span className="text-[10px] text-emerald-600 font-bold">+12%</span></span>
                      </div>
                      <div className="bg-[#F8FAFC] rounded-2xl p-2.5 border border-[#E2E8F0]/70">
                        <span className="text-[10px] font-bold text-[#64748B] block uppercase tracking-wider">Objectif Cible</span>
                        <span className="text-sm font-black text-[#1E60F8]">80% <span className="text-[10px] text-[#94A3B8] font-normal">cible</span></span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={onOpenKanban}
                      className="w-full py-2.5 px-4 rounded-2xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 group cursor-pointer"
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
                <div className="bg-white rounded-3xl p-5 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#1E60F8]" />
                      <span className="text-xs font-bold text-[#0F172A]">Assistant IA Juula</span>
                    </div>
                    <button
                      onClick={handleGenerateAiTip}
                      className="text-[#94A3B8] hover:text-[#0F172A]"
                      title="Agrandir"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 p-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    {/* 3D Blue Sphere matching Shopeers */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0F2B6B] via-[#1E60F8] to-[#93C5FD] shadow-[0_6px_16px_rgba(30,96,248,0.4)] flex-shrink-0 flex items-center justify-center ring-4 ring-white" />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#0F172A] leading-tight">
                        Optimiseur de Ventes & Accroches
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        Générez vos textes pubs en 1 clic
                      </p>
                    </div>
                  </div>

                  {aiGeneratedTip ? (
                    <p className="text-xs text-[#0F172A] bg-[#EFF4FF] p-3 rounded-xl border border-[#BFDBFE] leading-relaxed animate-in fade-in">
                      {aiGeneratedTip}
                    </p>
                  ) : (
                    <button
                      onClick={handleGenerateAiTip}
                      className="w-full py-2 px-3 rounded-xl bg-[#EFF4FF] hover:bg-[#DBEAFE] text-[#1E60F8] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
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
        <div className="bg-white rounded-3xl p-6 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-sm font-extrabold text-[#0F172A]">
                Meilleurs Tunnels & Produits de Vente
              </h3>
              <p className="text-xs text-[#64748B]">
                Classement par volume de commandes encaissées
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onCreatePageClick}
                className="px-3 py-1.5 rounded-xl bg-[#1E60F8] text-white text-xs font-bold hover:bg-[#164ED0] transition-colors"
              >
                + Nouveau Tunnel
              </button>
              <button className="text-[#94A3B8] hover:text-[#0F172A]">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F1F5F9] text-[#94A3B8] font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-3">ID</th>
                  <th className="pb-3 px-3">Nom du Produit</th>
                  <th className="pb-3 px-3">Unités Vendues</th>
                  <th className="pb-3 px-3">Chiffre d'Affaires</th>
                  <th className="pb-3 px-3">Note / Avis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {bestProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#64748B]">
                      {product.id}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-10 h-10 rounded-xl object-cover bg-slate-100 flex-shrink-0"
                        />
                        <span className="font-bold text-[#0F172A]">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#64748B]">
                      {product.sold}
                    </td>
                    <td className="py-3 px-3 font-black text-[#059669]">
                      {product.revenue}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 font-bold text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{product.rating}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
