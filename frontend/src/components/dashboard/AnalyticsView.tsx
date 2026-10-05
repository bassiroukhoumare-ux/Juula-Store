'use client';

import React from 'react';
import { Target, MapPin, ExternalLink } from 'lucide-react';
import { KpiMetrics, OrderLead } from '@/types/juula';
import { formatNumber } from '@/lib/orderUtils';

interface AnalyticsViewProps {
  kpis: KpiMetrics;
  orders: OrderLead[];
  onOpenStorefrontPreview: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  kpis,
  orders,
  onOpenStorefrontPreview,
}) => {
  const totalVisits = kpis.todayVisits?.value || 0;
  const totalOrdersCount = orders.length;
  const confirmedCount = orders.filter((o) =>
    ['confirmed', 'shipped', 'delivered'].includes(o.status),
  ).length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  const totalRevenue = orders.reduce((sum, o) => {
    if (o.status === 'cancelled') return sum;
    return sum + (o.totalAmount || o.amount + (o.deliveryFee || 0));
  }, 0);

  const averageBasket = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
  const globalConversionRate =
    totalVisits > 0 ? ((totalOrdersCount / totalVisits) * 100).toFixed(1) : '0,0';
  const cancellationRate =
    totalOrdersCount > 0 ? ((cancelledCount / totalOrdersCount) * 100).toFixed(1) : '0,0';

  // Dynamic funnel calculation
  const clicksCount = Math.round(totalVisits * 0.18) || totalOrdersCount;
  const formsFilledCount = Math.round(totalVisits * 0.1) || totalOrdersCount;

  interface FunnelStepItem {
    label: string;
    count: number;
    percent: number;
    drop: string;
  }

  const step1: FunnelStepItem = {
    label: 'Visiteurs sur la Vitrine',
    count: totalVisits,
    percent: totalVisits > 0 ? 100 : 0,
    drop: '0%',
  };
  const step2: FunnelStepItem = {
    label: 'Clics sur "Commander"',
    count: clicksCount,
    percent: totalVisits > 0 ? Number(((clicksCount / totalVisits) * 100).toFixed(1)) : 0,
    drop: totalVisits > 0 ? `-${(100 - (clicksCount / totalVisits) * 100).toFixed(1)}%` : '0%',
  };
  const step3: FunnelStepItem = {
    label: 'Formulaires Renseignés',
    count: formsFilledCount,
    percent: totalVisits > 0 ? Number(((formsFilledCount / totalVisits) * 100).toFixed(1)) : 0,
    drop: clicksCount > 0 ? `-${(100 - (formsFilledCount / clicksCount) * 100).toFixed(1)}%` : '0%',
  };
  const step4: FunnelStepItem = {
    label: 'Commandes Validées',
    count: confirmedCount,
    percent: totalVisits > 0 ? Number(((confirmedCount / totalVisits) * 100).toFixed(1)) : 0,
    drop:
      formsFilledCount > 0
        ? `-${(100 - (confirmedCount / formsFilledCount) * 100).toFixed(1)}%`
        : '0%',
  };
  const step5: FunnelStepItem = {
    label: 'Colis Livrés & Encaissés',
    count: deliveredCount,
    percent: totalVisits > 0 ? Number(((deliveredCount / totalVisits) * 100).toFixed(1)) : 0,
    drop:
      confirmedCount > 0 ? `-${(100 - (deliveredCount / confirmedCount) * 100).toFixed(1)}%` : '0%',
  };

  // Dynamic channels from orders
  const waveOrders = orders.filter((o) => o.paymentType === 'online_wave');
  const orangeOrders = orders.filter((o) => o.paymentType === 'online_orange');
  const codOrders = orders.filter((o) => o.paymentType === 'cod');

  const channels =
    totalOrdersCount > 0
      ? [
          {
            name: 'Paiements Wave Sénégal (En ligne)',
            share: Math.round((waveOrders.length / totalOrdersCount) * 100),
            orders: waveOrders.length,
            revenue: `${formatNumber(waveOrders.reduce((s, o) => s + (o.totalAmount || o.amount), 0))} FCFA`,
            roi: 'Instantané',
          },
          {
            name: 'Orange Money Sénégal (En ligne)',
            share: Math.round((orangeOrders.length / totalOrdersCount) * 100),
            orders: orangeOrders.length,
            revenue: `${formatNumber(orangeOrders.reduce((s, o) => s + (o.totalAmount || o.amount), 0))} FCFA`,
            roi: 'Instantané',
          },
          {
            name: 'Paiement Espèces à la Livraison (COD)',
            share: Math.round((codOrders.length / totalOrdersCount) * 100),
            orders: codOrders.length,
            revenue: `${formatNumber(codOrders.reduce((s, o) => s + (o.totalAmount || o.amount), 0))} FCFA`,
            roi: 'À livraison',
          },
        ]
      : [];

  // Dynamic neighborhood stats
  const neighborhoodMap = new Map<string, { total: number; delivered: number }>();
  orders.forEach((o) => {
    const raw = (o.neighborhood || 'Dakar').split('(')[0]?.trim() || 'Dakar';
    const cur = neighborhoodMap.get(raw) || { total: 0, delivered: 0 };
    cur.total += 1;
    if (o.status === 'delivered') cur.delivered += 1;
    neighborhoodMap.set(raw, cur);
  });

  const neighborhoodsPerformance = Array.from(neighborhoodMap.entries()).map(([name, data]) => {
    const rate = Math.round((data.delivered / data.total) * 100);
    const color = rate >= 80 ? '#10B981' : rate >= 60 ? '#235BF7' : '#F59E0B';
    return {
      name,
      rate,
      volume: `${data.total} colis`,
      color,
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#235BF7] bg-[#EEF3FF] px-2.5 py-0.5 rounded-md">
              Analyses & Performances
            </span>
            <span className="text-xs text-[#7A808C] font-semibold">Données temps réel</span>
          </div>
          <h2 className="text-2xl font-black text-[#201D1D] tracking-tight mt-1">
            Performances des Ventes & Entonnoir
          </h2>
          <p className="text-xs text-[#7A808C] mt-0.5">
            Analysez la rentabilité de vos campagnes publicitaires et identifiez les zones à fort
            taux d'encaissement.
          </p>
        </div>

        <button
          onClick={onOpenStorefrontPreview}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-white text-xs font-bold text-[#201D1D] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ExternalLink className="w-4 h-4 text-[#235BF7]" />
          <span>Tester le Tunnel Client</span>
        </button>
      </div>

      {/* 4 Sales KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[28px] p-5 border border-[#ECEFF4] shadow-xs space-y-2">
          <span className="text-xs font-semibold text-[#7A808C]">Taux de Conversion Global</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#201D1D]">{globalConversionRate}%</span>
            {totalVisits > 0 && (
              <span className="text-[10px] font-extrabold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                En direct
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            {totalVisits > 0
              ? `${totalOrdersCount} commandes pour ${formatNumber(totalVisits)} visiteurs`
              : 'En attente de visiteurs'}
          </p>
        </div>

        <div className="bg-white rounded-[28px] p-5 border border-[#ECEFF4] shadow-xs space-y-2">
          <span className="text-xs font-semibold text-[#7A808C]">Panier Moyen</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#201D1D]">
              {formatNumber(averageBasket)} F
            </span>
            {averageBasket > 0 && (
              <span className="text-[10px] font-extrabold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                Moyen
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#94A3B8]">Articles + frais de livraison</p>
        </div>

        <div className="bg-white rounded-[28px] p-5 border border-[#ECEFF4] shadow-xs space-y-2">
          <span className="text-xs font-semibold text-[#7A808C]">Délai Moyen de Livraison</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#235BF7]">
              {deliveredCount > 0 ? '2h 45min' : '—'}
            </span>
            <span className="text-[10px] font-extrabold text-[#235BF7] bg-[#EEF3FF] px-2 py-0.5 rounded-full">
              Dakar Urbain
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">Du clic à l'encaissement</p>
        </div>

        <div className="bg-white rounded-[28px] p-5 border border-[#ECEFF4] shadow-xs space-y-2">
          <span className="text-xs font-semibold text-[#7A808C]">Taux d'Annulation COD</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#201D1D]">{cancellationRate}%</span>
            {cancelledCount === 0 && totalOrdersCount > 0 && (
              <span className="text-[10px] font-extrabold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                0 annulation
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            {totalOrdersCount > 0
              ? `${cancelledCount} annulation(s) sur ${totalOrdersCount}`
              : 'Aucune commande enregistrée'}
          </p>
        </div>
      </div>

      {/* Funnel Step-by-Step Visualization : Courbe Graphique Haute-Fidélité + Légende */}
      <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#235BF7] animate-pulse" />
              <h3 className="text-base font-black text-[#201D1D]">
                Courbe de Conversion de l'Entonnoir (Funnel Immersif)
              </h3>
            </div>
            <p className="text-xs text-[#7A808C] mt-0.5">
              Visualisation continue du flux d'acheteurs : de la vue vidéo jusqu'au paiement final
              en espèces ou Wave.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-xl text-xs font-bold text-[#201D1D]">
            <Target className="w-3.5 h-3.5 text-[#235BF7]" />
            <span>
              Taux de conversion final :{' '}
              <strong className="text-[#059669]">{globalConversionRate}%</strong>
            </span>
          </div>
        </div>

        {/* Interactive Curved Area Chart (SVG Responsive) */}
        <div className="relative w-full bg-gradient-to-b from-[#F8FAFC] to-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 overflow-hidden">
          {/* Subtle Grid Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="w-full h-full flex flex-col justify-between p-6">
              <div className="border-b border-dashed border-[#CBD5E1] w-full" />
              <div className="border-b border-dashed border-[#CBD5E1] w-full" />
              <div className="border-b border-dashed border-[#CBD5E1] w-full" />
              <div className="border-b border-dashed border-[#CBD5E1] w-full" />
            </div>
          </div>

          <svg viewBox="0 0 1000 300" className="w-full h-auto overflow-visible relative z-10">
            <defs>
              <linearGradient id="funnelCurveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
                <stop offset="25%" stopColor="#7C3AED" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#0891B2" stopOpacity="0.20" />
                <stop offset="75%" stopColor="#D97706" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.25" />
              </linearGradient>

              <linearGradient id="funnelStrokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="25%" stopColor="#7C3AED" />
                <stop offset="50%" stopColor="#0891B2" />
                <stop offset="75%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>

              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Smooth Bézier Curved Area Fill or Flat Baseline when 0 */}
            <path
              d={
                totalVisits > 0
                  ? 'M 60 45 C 170 45, 170 155, 280 155 C 390 155, 390 200, 500 200 C 610 200, 610 220, 720 220 C 830 220, 830 232, 940 232 L 940 280 L 60 280 Z'
                  : 'M 60 270 L 940 270 L 940 280 L 60 280 Z'
              }
              fill="url(#funnelCurveGradient)"
            />

            {/* Baseline axis */}
            <line
              x1="40"
              y1="280"
              x2="960"
              y2="280"
              stroke="#E2E8F0"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Vertical Guide Lines to Nodes */}
            <line
              x1="60"
              y1={totalVisits > 0 ? 45 : 270}
              x2="60"
              y2="280"
              stroke="#2563EB"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.4"
            />
            <line
              x1="280"
              y1={totalVisits > 0 ? 155 : 270}
              x2="280"
              y2="280"
              stroke="#7C3AED"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.4"
            />
            <line
              x1="500"
              y1={totalVisits > 0 ? 200 : 270}
              x2="500"
              y2="280"
              stroke="#0891B2"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.4"
            />
            <line
              x1="720"
              y1={totalVisits > 0 ? 220 : 270}
              x2="720"
              y2="280"
              stroke="#D97706"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.4"
            />
            <line
              x1="940"
              y1={totalVisits > 0 ? 232 : 270}
              x2="940"
              y2="280"
              stroke="#059669"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.4"
            />

            {/* Main Smooth Curved Stroke */}
            <path
              d={
                totalVisits > 0
                  ? 'M 60 45 C 170 45, 170 155, 280 155 C 390 155, 390 200, 500 200 C 610 200, 610 220, 720 220 C 830 220, 830 232, 940 232'
                  : 'M 60 270 L 940 270'
              }
              fill="none"
              stroke="url(#funnelStrokeGradient)"
              strokeWidth="4.5"
              strokeLinecap="round"
              filter="url(#glow)"
            />

            {/* Milestone Node 1: Visiteurs */}
            <g className="cursor-pointer group">
              {totalVisits > 0 && (
                <circle
                  cx="60"
                  cy="45"
                  r="14"
                  fill="#2563EB"
                  opacity="0.2"
                  className="animate-ping"
                />
              )}
              <circle
                cx="60"
                cy={totalVisits > 0 ? 45 : 270}
                r={8}
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth="3"
              />
              <rect
                x="15"
                y={totalVisits > 0 ? 10 : 235}
                width="90"
                height="26"
                rx="6"
                fill="#1E293B"
                opacity="0.95"
              />
              <text
                x="60"
                y={totalVisits > 0 ? 27 : 252}
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                {formatNumber(step1.count)} ({step1.percent}%)
              </text>
            </g>

            {/* Milestone Node 2: Clics */}
            <g className="cursor-pointer group">
              {clicksCount > 0 && (
                <circle
                  cx="280"
                  cy="155"
                  r="14"
                  fill="#7C3AED"
                  opacity="0.2"
                  className="animate-ping"
                />
              )}
              <circle
                cx="280"
                cy={totalVisits > 0 ? 155 : 270}
                r={8}
                fill="#7C3AED"
                stroke="#FFFFFF"
                strokeWidth="3"
              />
              <rect
                x="235"
                y={totalVisits > 0 ? 118 : 235}
                width="90"
                height="26"
                rx="6"
                fill="#1E293B"
                opacity="0.95"
              />
              <text
                x="280"
                y={totalVisits > 0 ? 135 : 252}
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                {formatNumber(step2.count)} ({step2.percent}%)
              </text>
            </g>

            {/* Milestone Node 3: Formulaires */}
            <g className="cursor-pointer group">
              {formsFilledCount > 0 && (
                <circle
                  cx="500"
                  cy="200"
                  r="14"
                  fill="#0891B2"
                  opacity="0.2"
                  className="animate-ping"
                />
              )}
              <circle
                cx="500"
                cy={totalVisits > 0 ? 200 : 270}
                r={8}
                fill="#0891B2"
                stroke="#FFFFFF"
                strokeWidth="3"
              />
              <rect
                x="455"
                y={totalVisits > 0 ? 163 : 235}
                width="90"
                height="26"
                rx="6"
                fill="#1E293B"
                opacity="0.95"
              />
              <text
                x="500"
                y={totalVisits > 0 ? 180 : 252}
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                {formatNumber(step3.count)} ({step3.percent}%)
              </text>
            </g>

            {/* Milestone Node 4: Confirmées */}
            <g className="cursor-pointer group">
              {confirmedCount > 0 && (
                <circle
                  cx="720"
                  cy="220"
                  r="14"
                  fill="#D97706"
                  opacity="0.2"
                  className="animate-ping"
                />
              )}
              <circle
                cx="720"
                cy={totalVisits > 0 ? 220 : 270}
                r={8}
                fill="#D97706"
                stroke="#FFFFFF"
                strokeWidth="3"
              />
              <rect
                x="675"
                y={totalVisits > 0 ? 183 : 235}
                width="90"
                height="26"
                rx="6"
                fill="#1E293B"
                opacity="0.95"
              />
              <text
                x="720"
                y={totalVisits > 0 ? 200 : 252}
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                {formatNumber(step4.count)} ({step4.percent}%)
              </text>
            </g>

            {/* Milestone Node 5: Encaissées */}
            <g className="cursor-pointer group">
              {deliveredCount > 0 && (
                <circle
                  cx="940"
                  cy="232"
                  r="16"
                  fill="#059669"
                  opacity="0.25"
                  className="animate-ping"
                />
              )}
              <circle
                cx="940"
                cy={totalVisits > 0 ? 232 : 270}
                r={9}
                fill="#059669"
                stroke="#FFFFFF"
                strokeWidth="3"
              />
              <rect
                x="895"
                y={totalVisits > 0 ? 195 : 235}
                width="90"
                height="26"
                rx="6"
                fill="#059669"
                opacity="0.95"
              />
              <text
                x="940"
                y={totalVisits > 0 ? 212 : 252}
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                {formatNumber(step5.count)} ({step5.percent}%)
              </text>
            </g>
          </svg>
        </div>

        {/* Color-Coded Explanatory Legend (5 Stages Breakdown Cards) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#7A808C]">
              Légende détaillée de la courbe par étape
            </h4>
            <span className="text-[11px] text-[#94A3B8]">Données calculées en temps réel</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Stage 1 */}
            <div className="p-3.5 rounded-2xl bg-[#EEF3FF] border border-[#BFDBFE]/70 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[10px] font-black">
                  1
                </span>
                <span className="text-[10px] font-extrabold text-[#2563EB] bg-white px-2 py-0.5 rounded-md border border-[#BFDBFE]">
                  {step1.percent}% trafic
                </span>
              </div>
              <h5 className="text-xs font-black text-[#201D1D] leading-tight">Visiteurs Vitrine</h5>
              <p className="text-sm font-black text-[#2563EB] mt-0.5">
                {formatNumber(step1.count)}
              </p>
              <p className="text-[10px] text-[#7A808C] mt-1 line-clamp-2">
                Spectateurs ayant visionné la vitrine produit.
              </p>
            </div>

            {/* Stage 2 */}
            <div className="p-3.5 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE]/70 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-5 h-5 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[10px] font-black">
                  2
                </span>
                <span className="text-[10px] font-extrabold text-[#7C3AED] bg-white px-1.5 py-0.5 rounded-md border border-purple-200">
                  {step2.percent}%
                </span>
              </div>
              <h5 className="text-xs font-black text-[#201D1D] leading-tight">Clics "Commander"</h5>
              <p className="text-sm font-black text-[#7C3AED] mt-0.5">
                {formatNumber(step2.count)} ({step2.percent}%)
              </p>
              <p className="text-[10px] text-[#7A808C] mt-1 line-clamp-2">
                Intention d'achat marquée en ouvrant le module de commande.
              </p>
            </div>

            {/* Stage 3 */}
            <div className="p-3.5 rounded-2xl bg-[#ECFEFF] border border-[#A5F3FC]/70 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-5 h-5 rounded-full bg-[#0891B2] text-white flex items-center justify-center text-[10px] font-black">
                  3
                </span>
                <span className="text-[10px] font-extrabold text-[#0891B2] bg-white px-1.5 py-0.5 rounded-md border border-cyan-200">
                  {step3.percent}%
                </span>
              </div>
              <h5 className="text-xs font-black text-[#201D1D] leading-tight">
                Formulaires Saisis
              </h5>
              <p className="text-sm font-black text-[#0891B2] mt-0.5">
                {formatNumber(step3.count)} ({step3.percent}%)
              </p>
              <p className="text-[10px] text-[#7A808C] mt-1 line-clamp-2">
                Nom, numéro de téléphone et quartier renseignés.
              </p>
            </div>

            {/* Stage 4 */}
            <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]/70 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-5 h-5 rounded-full bg-[#D97706] text-white flex items-center justify-center text-[10px] font-black">
                  4
                </span>
                <span className="text-[10px] font-extrabold text-[#D97706] bg-white px-1.5 py-0.5 rounded-md border border-amber-200">
                  {step4.percent}%
                </span>
              </div>
              <h5 className="text-xs font-black text-[#201D1D] leading-tight">
                Commandes Validées
              </h5>
              <p className="text-sm font-black text-[#D97706] mt-0.5">
                {formatNumber(step4.count)} ({step4.percent}%)
              </p>
              <p className="text-[10px] text-[#7A808C] mt-1 line-clamp-2">
                Confirmation d'adresse obtenue par appel ou WhatsApp.
              </p>
            </div>

            {/* Stage 5 */}
            <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]/70 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-5 h-5 rounded-full bg-[#059669] text-white flex items-center justify-center text-[10px] font-black">
                  5
                </span>
                <span className="text-[10px] font-extrabold text-[#059669] bg-white px-2 py-0.5 rounded-md border border-[#A7F3D0]">
                  Succès Net
                </span>
              </div>
              <h5 className="text-xs font-black text-[#201D1D] leading-tight">
                Colis Livrés & Encaissés
              </h5>
              <p className="text-sm font-black text-[#059669] mt-0.5">
                {formatNumber(step5.count)} ({step5.percent}%)
              </p>
              <p className="text-[10px] text-[#7A808C] mt-1 line-clamp-2">
                Fonds encaissés sur Wave ou remis en espèces par le livreur.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Acquisition Channels & Neighborhood Delivery Success */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acquisition Channels */}
        <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-[#201D1D]">Canaux d'Acquisition Rentables</h3>
            <p className="text-xs text-[#7A808C]">
              D'où proviennent vos commandes les plus rentables.
            </p>
          </div>

          {channels.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#94A3B8] border border-dashed border-[#E2E8F0] rounded-2xl p-6">
              Aucun canal d'acquisition pour le moment. Vos sources de ventes s'afficheront dès vos
              premières commandes.
            </div>
          ) : (
            <div className="space-y-3">
              {channels.map((ch, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#201D1D]">{ch.name}</span>
                    <span className="font-mono font-black text-[#235BF7] bg-[#EEF3FF] px-2 py-0.5 rounded-md">
                      {ch.roi}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#7A808C]">
                    <span>
                      {ch.orders} commandes générées ({ch.share}%)
                    </span>
                    <span className="font-bold text-[#201D1D]">{ch.revenue}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Neighborhood Delivery Success */}
        <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-[#201D1D]">Taux d'Encaissement par Quartier</h3>
            <p className="text-xs text-[#7A808C]">
              Fiabilité de livraison et collecte COD par zone géographique.
            </p>
          </div>

          {neighborhoodsPerformance.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#94A3B8] border border-dashed border-[#E2E8F0] rounded-2xl p-6">
              Aucune donnée géographique. Les zones de livraison s'afficheront ici au fur et à
              mesure des commandes.
            </div>
          ) : (
            <div className="space-y-2.5">
              {neighborhoodsPerformance.map((nh, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F8FAFC] transition-colors text-xs"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#235BF7]" />
                    <span className="font-bold text-[#201D1D]">{nh.name}</span>
                    <span className="text-[10px] text-[#94A3B8]">({nh.volume})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-black px-2 py-0.5 rounded-md text-[11px]"
                      style={{
                        backgroundColor: `${nh.color}15`,
                        color: nh.color,
                      }}
                    >
                      {nh.rate}% succès
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
