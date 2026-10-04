'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShoppingBag,
  Users,
  Eye,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  Smartphone,
  Share2,
} from 'lucide-react';
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
  const funnelSteps = [
    { label: 'Visiteurs sur la Vitrine', count: 16431, percent: 100, drop: '0%' },
    { label: 'Clics sur "Commander"', count: 2832, percent: 17.2, drop: '-82.8%' },
    { label: 'Formulaires Renseignés', count: 1580, percent: 9.6, drop: '-44.2%' },
    { label: 'Commandes Confirmées', count: 1224, percent: 7.4, drop: '-22.5%' },
    { label: 'Colis Livrés & Encaissés', count: 1072, percent: 6.5, drop: '-12.4%' },
  ];

  const channels = [
    { name: 'TikTok Ads (Vidéos Verticales)', share: 64, orders: 783, revenue: '19 500 000 FCFA', roi: 'x4.8' },
    { name: 'WhatsApp Business & Statuts', share: 22, orders: 269, revenue: '6 700 000 FCFA', roi: 'Organique' },
    { name: 'Instagram & Facebook Ads', share: 14, orders: 172, revenue: '4 280 000 FCFA', roi: 'x3.2' },
  ];

  const neighborhoodsPerformance = [
    { name: 'Almadies & Ngor', rate: 94, volume: '412 colis', color: '#10B981' },
    { name: 'Mermoz & Sacré-Cœur', rate: 89, volume: '320 colis', color: '#10B981' },
    { name: 'Dakar Plateau & Point E', rate: 86, volume: '290 colis', color: '#1E60F8' },
    { name: 'Yoff Virage & Ouakam', rate: 82, volume: '210 colis', color: '#1E60F8' },
    { name: 'Guédiawaye & Parcelles', rate: 74, volume: '145 colis', color: '#F59E0B' },
    { name: 'Pikine & Banlieue', rate: 68, volume: '110 colis', color: '#F59E0B' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1E60F8] bg-[#EFF4FF] px-2.5 py-0.5 rounded-md">
              Analyses & Performances
            </span>
            <span className="text-xs text-[#64748B] font-semibold">
              Données temps réel
            </span>
          </div>
          <h2 className="text-2xl font-black text-[#0F172A] tracking-tight mt-1">
            Performances des Ventes & Entonnoir
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Analysez la rentabilité de vos campagnes publicitaires et identifiez les zones à fort taux d'encaissement.
          </p>
        </div>

        <button
          onClick={onOpenStorefrontPreview}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-white text-xs font-bold text-[#0F172A] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ExternalLink className="w-4 h-4 text-[#1E60F8]" />
          <span>Tester le Tunnel Client</span>
        </button>
      </div>

      {/* 4 Sales KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-[#E5E9F0] shadow-xs space-y-2">
          <span className="text-xs font-semibold text-[#64748B]">Taux de Conversion Global</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0F172A]">7,4%</span>
            <span className="text-[10px] font-extrabold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
              ▲ +1,8%
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">74 commandes pour 1 000 visiteurs</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#E5E9F0] shadow-xs space-y-2">
          <span className="text-xs font-semibold text-[#64748B]">Panier Moyen</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0F172A]">26 400 F</span>
            <span className="text-[10px] font-extrabold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
              ▲ +3,2%
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">Articles + frais de livraison</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#E5E9F0] shadow-xs space-y-2">
          <span className="text-xs font-semibold text-[#64748B]">Délai Moyen de Livraison</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#1E60F8]">2h 45min</span>
            <span className="text-[10px] font-extrabold text-[#1E60F8] bg-[#EFF4FF] px-2 py-0.5 rounded-full">
              Dakar Urbain
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">Du clic à l'encaissement</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#E5E9F0] shadow-xs space-y-2">
          <span className="text-xs font-semibold text-[#64748B]">Taux d'Annulation COD</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0F172A]">12,4%</span>
            <span className="text-[10px] font-extrabold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
              Excellent
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">Moyenne marché Afrique : ~28%</p>
        </div>
      </div>

      {/* Funnel Step-by-Step Visualization : Courbe Graphique Haute-Fidélité + Légende */}
      <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1E60F8] animate-pulse" />
              <h3 className="text-base font-black text-[#0F172A]">
                Courbe de Conversion de l'Entonnoir (Funnel Immersif)
              </h3>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Visualisation continue du flux d'acheteurs : de la vue vidéo jusqu'au paiement final en espèces ou Wave.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-xl text-xs font-bold text-[#0F172A]">
            <Target className="w-3.5 h-3.5 text-[#1E60F8]" />
            <span>Taux de conversion final : <strong className="text-[#059669]">6,5%</strong></span>
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

          <svg
            viewBox="0 0 1000 300"
            className="w-full h-auto overflow-visible relative z-10"
          >
            <defs>
              {/* Gradient for area fill under the curve */}
              <linearGradient id="funnelCurveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
                <stop offset="25%" stopColor="#7C3AED" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#0891B2" stopOpacity="0.20" />
                <stop offset="75%" stopColor="#D97706" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.25" />
              </linearGradient>

              {/* Stroke gradient */}
              <linearGradient id="funnelStrokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="25%" stopColor="#7C3AED" />
                <stop offset="50%" stopColor="#0891B2" />
                <stop offset="75%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>

              {/* Glow filter for the curve */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Smooth Bézier Curved Area Fill */}
            <path
              d="M 60 45 C 170 45, 170 155, 280 155 C 390 155, 390 200, 500 200 C 610 200, 610 220, 720 220 C 830 220, 830 232, 940 232 L 940 280 L 60 280 Z"
              fill="url(#funnelCurveGradient)"
            />

            {/* Baseline axis */}
            <line x1="40" y1="280" x2="960" y2="280" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />

            {/* Vertical Guide Lines to Nodes */}
            <line x1="60" y1="45" x2="60" y2="280" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
            <line x1="280" y1="155" x2="280" y2="280" stroke="#7C3AED" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
            <line x1="500" y1="200" x2="500" y2="280" stroke="#0891B2" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
            <line x1="720" y1="220" x2="720" y2="280" stroke="#D97706" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
            <line x1="940" y1="232" x2="940" y2="280" stroke="#059669" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />

            {/* Main Smooth Curved Stroke */}
            <path
              d="M 60 45 C 170 45, 170 155, 280 155 C 390 155, 390 200, 500 200 C 610 200, 610 220, 720 220 C 830 220, 830 232, 940 232"
              fill="none"
              stroke="url(#funnelStrokeGradient)"
              strokeWidth="4.5"
              strokeLinecap="round"
              filter="url(#glow)"
            />

            {/* Milestone Node 1: Visiteurs (100%) */}
            <g className="cursor-pointer group">
              <circle cx="60" cy="45" r="14" fill="#2563EB" opacity="0.2" className="animate-ping" />
              <circle cx="60" cy="45" r="8" fill="#2563EB" stroke="#FFFFFF" strokeWidth="3" />
              <rect x="15" y="10" width="90" height="26" rx="6" fill="#1E293B" opacity="0.95" />
              <text x="60" y="27" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">
                16 431 (100%)
              </text>
            </g>

            {/* Milestone Node 2: Clics (17.2%) */}
            <g className="cursor-pointer group">
              <circle cx="280" cy="155" r="14" fill="#7C3AED" opacity="0.2" className="animate-ping" />
              <circle cx="280" cy="155" r="8" fill="#7C3AED" stroke="#FFFFFF" strokeWidth="3" />
              <rect x="235" y="118" width="90" height="26" rx="6" fill="#1E293B" opacity="0.95" />
              <text x="280" y="135" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">
                2 832 (17.2%)
              </text>
            </g>

            {/* Milestone Node 3: Formulaires (9.6%) */}
            <g className="cursor-pointer group">
              <circle cx="500" cy="200" r="14" fill="#0891B2" opacity="0.2" className="animate-ping" />
              <circle cx="500" cy="200" r="8" fill="#0891B2" stroke="#FFFFFF" strokeWidth="3" />
              <rect x="455" y="163" width="90" height="26" rx="6" fill="#1E293B" opacity="0.95" />
              <text x="500" y="180" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">
                1 580 (9.6%)
              </text>
            </g>

            {/* Milestone Node 4: Confirmées (7.4%) */}
            <g className="cursor-pointer group">
              <circle cx="720" cy="220" r="14" fill="#D97706" opacity="0.2" className="animate-ping" />
              <circle cx="720" cy="220" r="8" fill="#D97706" stroke="#FFFFFF" strokeWidth="3" />
              <rect x="675" y="183" width="90" height="26" rx="6" fill="#1E293B" opacity="0.95" />
              <text x="720" y="200" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">
                1 224 (7.4%)
              </text>
            </g>

            {/* Milestone Node 5: Encaissées (6.5%) */}
            <g className="cursor-pointer group">
              <circle cx="940" cy="232" r="16" fill="#059669" opacity="0.25" className="animate-ping" />
              <circle cx="940" cy="232" r="9" fill="#059669" stroke="#FFFFFF" strokeWidth="3" />
              <rect x="895" y="195" width="90" height="26" rx="6" fill="#059669" opacity="0.95" />
              <text x="940" y="212" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">
                1 072 (6.5%)
              </text>
            </g>
          </svg>
        </div>

        {/* Color-Coded Explanatory Legend (5 Stages Breakdown Cards) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B]">
              Légende détaillée de la courbe par étape
            </h4>
            <span className="text-[11px] text-[#94A3B8]">
              Cliquez ou survolez un jalon pour suivre la déperdition
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Stage 1 */}
            <div className="p-3.5 rounded-2xl bg-[#EFF4FF] border border-[#BFDBFE]/70 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[10px] font-black">
                  1
                </span>
                <span className="text-[10px] font-extrabold text-[#2563EB] bg-white px-2 py-0.5 rounded-md border border-[#BFDBFE]">
                  100% trafic
                </span>
              </div>
              <h5 className="text-xs font-black text-[#0F172A] leading-tight">
                Visiteurs Vitrine
              </h5>
              <p className="text-sm font-black text-[#2563EB] mt-0.5">
                16 431
              </p>
              <p className="text-[10px] text-[#64748B] mt-1 line-clamp-2">
                Spectateurs ayant visionné la vidéo produit sur TikTok & WhatsApp.
              </p>
            </div>

            {/* Stage 2 */}
            <div className="p-3.5 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE]/70 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-5 h-5 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[10px] font-black">
                  2
                </span>
                <span className="text-[10px] font-extrabold text-red-600 bg-white px-1.5 py-0.5 rounded-md border border-red-200">
                  -82,8%
                </span>
              </div>
              <h5 className="text-xs font-black text-[#0F172A] leading-tight">
                Clics "Commander"
              </h5>
              <p className="text-sm font-black text-[#7C3AED] mt-0.5">
                2 832 (17,2%)
              </p>
              <p className="text-[10px] text-[#64748B] mt-1 line-clamp-2">
                Intention d'achat marquée en ouvrant le module de commande.
              </p>
            </div>

            {/* Stage 3 */}
            <div className="p-3.5 rounded-2xl bg-[#ECFEFF] border border-[#A5F3FC]/70 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-5 h-5 rounded-full bg-[#0891B2] text-white flex items-center justify-center text-[10px] font-black">
                  3
                </span>
                <span className="text-[10px] font-extrabold text-amber-700 bg-white px-1.5 py-0.5 rounded-md border border-amber-200">
                  -44,2%
                </span>
              </div>
              <h5 className="text-xs font-black text-[#0F172A] leading-tight">
                Formulaires Saisis
              </h5>
              <p className="text-sm font-black text-[#0891B2] mt-0.5">
                1 580 (9,6%)
              </p>
              <p className="text-[10px] text-[#64748B] mt-1 line-clamp-2">
                Nom, numéro de téléphone et quartier à Dakar renseignés.
              </p>
            </div>

            {/* Stage 4 */}
            <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]/70 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-5 h-5 rounded-full bg-[#D97706] text-white flex items-center justify-center text-[10px] font-black">
                  4
                </span>
                <span className="text-[10px] font-extrabold text-amber-700 bg-white px-1.5 py-0.5 rounded-md border border-amber-200">
                  -22,5%
                </span>
              </div>
              <h5 className="text-xs font-black text-[#0F172A] leading-tight">
                Commandes Validées
              </h5>
              <p className="text-sm font-black text-[#D97706] mt-0.5">
                1 224 (7,4%)
              </p>
              <p className="text-[10px] text-[#64748B] mt-1 line-clamp-2">
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
              <h5 className="text-xs font-black text-[#0F172A] leading-tight">
                Colis Livrés & Encaissés
              </h5>
              <p className="text-sm font-black text-[#059669] mt-0.5">
                1 072 (6,5%)
              </p>
              <p className="text-[10px] text-[#64748B] mt-1 line-clamp-2">
                Fonds encaissés sur Wave ou remis en espèces par le livreur.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Acquisition Channels & Neighborhood Delivery Success */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acquisition Channels */}
        <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-[#0F172A]">Canaux d'Acquisition Rentables</h3>
            <p className="text-xs text-[#64748B]">D'où proviennent vos commandes les plus rentables.</p>
          </div>

          <div className="space-y-3">
            {channels.map((ch, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F172A]">{ch.name}</span>
                  <span className="font-mono font-black text-[#1E60F8] bg-[#EFF4FF] px-2 py-0.5 rounded-md">
                    {ch.roi}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span>{ch.orders} commandes générées</span>
                  <span className="font-bold text-[#0F172A]">{ch.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Neighborhood Delivery Success */}
        <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-[#0F172A]">Taux d'Encaissement par Quartier</h3>
            <p className="text-xs text-[#64748B]">Fiabilité de livraison et collecte COD par zone à Dakar.</p>
          </div>

          <div className="space-y-2.5">
            {neighborhoodsPerformance.map((nh, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F8FAFC] transition-colors text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#1E60F8]" />
                  <span className="font-bold text-[#0F172A]">{nh.name}</span>
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
        </div>
      </div>
    </div>
  );
};
