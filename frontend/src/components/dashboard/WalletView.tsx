'use client';

import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Banknote,
  TrendingUp,
  Receipt,
  Smartphone,
  Calendar,
  Filter,
  ArrowDownLeft,
  Download,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WalletState, OrderLead, InflowRecord, PayoutRecord } from '@/types/juula';
import { formatNumber, formatFCFA } from '@/lib/orderUtils';

interface WalletViewProps {
  wallet: WalletState;
  orders?: OrderLead[];
  onOpenPayoutModal: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  wallet,
  orders = [],
  onOpenPayoutModal,
}) => {
  // Time filter for Card 1 (Solde de la journée / période)
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | '2weeks' | 'month'>('day');

  // Active History Tab: Inflows (Encaissements reçus) vs Outflows (Retraits effectués)
  const [historyTab, setHistoryTab] = useState<'inflows' | 'outflows'>('inflows');

  // Filter within Inflows (All, Online, COD)
  const [inflowFilter, setInflowFilter] = useState<'all' | 'online' | 'cod'>('all');

  // Modal for Payout Receipt
  const [selectedReceipt, setSelectedReceipt] = useState<PayoutRecord | null>(null);

  // Calculate dynamic revenues based on time filter
  const getRevenueForFilter = () => {
    switch (timeFilter) {
      case 'day':
        return {
          label: "Recette d'Aujourd'hui",
          amount: wallet.todayRevenue ?? 89700,
          growth: '+18.4% vs hier',
          periodSubtitle: 'Chiffre d’affaires encaissé en 24h',
        };
      case 'week':
        return {
          label: 'Recette des 7 Derniers Jours',
          amount: 342500,
          growth: '+22.1% vs semaine passée',
          periodSubtitle: 'Cumul des ventes sur les 7 derniers jours',
        };
      case '2weeks':
        return {
          label: 'Recette des 14 Derniers Jours',
          amount: 580000,
          growth: '+15.6% vs période précédente',
          periodSubtitle: 'Activité commerciale sur 2 semaines',
        };
      case 'month':
        return {
          label: 'Recette Totale du Mois (Octobre)',
          amount: wallet.monthRevenue ?? 845000,
          growth: '+28.5% vs mois précédent',
          periodSubtitle: 'Volume global encaissé depuis le 1er octobre',
        };
    }
  };

  const periodData = getRevenueForFilter();
  const monthTotal = wallet.monthRevenue ?? 845000;

  // Real-time calculation of delivered COD from orders if present
  const deliveredCodOrders = orders.filter(
    (o) => o.status === 'delivered' && o.paymentType === 'cod'
  );
  const deliveredCodTotal = deliveredCodOrders.reduce(
    (sum, o) => sum + (o.totalAmount || o.amount + (o.deliveryFee || 0)),
    0
  );
  const effectiveCodCollected =
    deliveredCodTotal > 0 ? deliveredCodTotal : wallet.codCollectedAmount ?? 595200;

  // Inflows list
  const rawInflows: InflowRecord[] = wallet.inflowHistory ?? [
    {
      id: 'ENC-008',
      orderId: 'CMD-BDE-000008',
      customerName: 'Fatou Diop',
      neighborhood: 'Almadies',
      source: 'online_wave',
      amount: 26400,
      date: 'Aujourd’hui à 11h20',
      status: 'confirmed',
    },
    {
      id: 'ENC-005',
      orderId: 'CMD-BDE-000005',
      customerName: 'Ibrahima Ndiaye',
      neighborhood: 'Point E',
      source: 'online_orange',
      amount: 26400,
      date: 'Aujourd’hui à 09h40',
      status: 'confirmed',
    },
    {
      id: 'ENC-003',
      orderId: 'CMD-BDE-000003',
      customerName: 'Ousmane Cissé',
      neighborhood: 'Guédiawaye Hamo 4',
      source: 'cod_cash',
      amount: 26900,
      date: 'Aujourd’hui à 10h15',
      status: 'confirmed',
    },
    {
      id: 'ENC-002',
      orderId: 'CMD-BDE-000002',
      customerName: 'Khady Seck',
      neighborhood: 'Yoff Virage',
      source: 'online_wave',
      amount: 39900,
      date: 'Aujourd’hui à 09h30',
      status: 'confirmed',
    },
    {
      id: 'ENC-001',
      orderId: 'CMD-BDE-000007',
      customerName: 'Moussa Ba',
      neighborhood: 'Mermoz',
      source: 'cod_cash',
      amount: 39900,
      date: 'Hier à 17h10',
      status: 'confirmed',
    },
    {
      id: 'ENC-000',
      orderId: 'CMD-BDE-000004',
      customerName: 'Mariama Sarr',
      neighborhood: 'Plateau',
      source: 'cod_cash',
      amount: 29900,
      date: 'Hier à 14h25',
      status: 'confirmed',
    },
  ];

  const filteredInflows = rawInflows.filter((item) => {
    if (inflowFilter === 'all') return true;
    if (inflowFilter === 'online') {
      return item.source === 'online_wave' || item.source === 'online_orange';
    }
    return item.source === 'cod_cash';
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BANNER (GESTION TRÉSORERIE)                */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-white border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF4FF] text-[#1E60F8] text-xs font-bold uppercase tracking-wider">
            <Wallet className="w-3.5 h-3.5" />
            <span>Gestion Financière & Trésorerie</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            Portefeuille & Retraits Marchand
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-xl">
            Suivi des recettes, encaissements Wave / Orange Money / Espèces & virements marchands vers vos comptes.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={onOpenPayoutModal}
          disabled={wallet.availableBalance <= 0}
          icon={<ArrowUpRight className="w-5 h-5 stroke-[2.5]" />}
          className="shadow-sm cursor-pointer"
        >
          Demander un virement immédiat
        </Button>
      </div>

      {/* ======================================================== */}
      {/* 2. LES 4 CARTES FINANCIÈRES CLÉS (DEMANDE UTILISATEUR)   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARTE 1 : SOLDE DU JOUR / PÉRIODE AVEC FILTRES ET SYNCHRO MOIS */}
        <div className="bg-white rounded-3xl p-5 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] border-t-4 border-t-[#1E60F8] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] truncate">
                {periodData.label}
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#EFF4FF] text-[#1E60F8] flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Quick Period Filter Pills */}
            <div className="flex items-center gap-1 mt-2 bg-[#F1F5F9] p-1 rounded-xl">
              {[
                { id: 'day' as const, label: 'Jour' },
                { id: 'week' as const, label: '7J' },
                { id: '2weeks' as const, label: '14J' },
                { id: 'month' as const, label: 'Mois' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTimeFilter(p.id)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold text-center transition-all cursor-pointer ${
                    timeFilter === p.id
                      ? 'bg-white text-[#1E60F8] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-baseline gap-1.5 mt-3">
              <span className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
                {formatFCFA(periodData.amount)}
              </span>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
              <TrendingUp className="w-3 h-3" />
              {periodData.growth}
            </span>
          </div>

          {/* Synchronized Month Balance Tracker */}
          <div className="pt-2.5 border-t border-[#F1F5F9] mt-2 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#64748B] font-semibold">Cumul ce mois (Octobre) :</span>
              <span className="font-extrabold text-[#0F172A]">{formatFCFA(monthTotal)}</span>
            </div>
            <p className="text-[10px] text-[#94A3B8] leading-tight">
              Synchronisé en temps réel avec vos ventes
            </p>
          </div>
        </div>

        {/* CARTE 2 : SOLDE EN LIGNE DISPONIBLE (RETIRABLE IMMÉDIATEMENT) */}
        <div className="bg-white rounded-3xl p-5 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] border-t-4 border-t-[#10B981] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Solde En Ligne Disponible
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
                {formatFCFA(wallet.availableBalance)}
              </span>
            </div>

            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Fonds garantis par Wave & Orange Money prêts au virement immédiat.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={onOpenPayoutModal}
            disabled={wallet.availableBalance <= 0}
            icon={<ArrowUpRight className="w-3.5 h-3.5" />}
            className="cursor-pointer"
          >
            Transférer vers Mobile Money
          </Button>
        </div>

        {/* CARTE 3 : TOTAL ENCAISSÉ EN ESPÈCES (CASH ON DELIVERY - LIVRAISONS CONFIRMÉES) */}
        <div className="bg-white rounded-3xl p-5 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] border-t-4 border-t-[#0EA5E9] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Encaissé en Espèces (COD)
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#EFF6FF] text-[#0EA5E9] flex items-center justify-center shrink-0">
                <Banknote className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
                {formatFCFA(effectiveCodCollected)}
              </span>
            </div>

            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Argent remis en main propre par les coursiers après livraison à Dakar.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#0284C7] font-bold bg-[#F0F9FF] p-2 rounded-xl border border-[#BAE6FD]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#0284C7]" />
            <span className="truncate">Livraisons confirmées & encaissées</span>
          </div>
        </div>

        {/* CARTE 4 : TOTAL DES RETRAITS EFFECTUÉS (SORTIES DE FONDS MARCHAND) */}
        <div className="bg-white rounded-3xl p-5 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] border-t-4 border-t-[#6366F1] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Total Retraits Effectués
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#EEF2FF] text-[#6366F1] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
                {formatFCFA(wallet.totalWithdrawn)}
              </span>
            </div>

            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Cumul total viré sur vos comptes marchands Wave / Orange Money.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#059669] font-bold bg-[#ECFDF5] p-2 rounded-xl border border-[#A7F3D0]">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#10B981]" />
            <span className="truncate">{wallet.payoutHistory.length} virements réalisés • 0 incident</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. HISTORIQUE CLAIREMENT SÉPARÉ EN 2 SECTIONS DISTINCTES */}
      {/* (DEMANDE DE L'UTILISATEUR : BIEN SÉPARER RETRAITS & VERSEMENTS)*/}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-5">
        {/* En-tête avec Navigation par Onglets Distincts */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#0F172A]">
              Journal des Flux Financiers
            </h3>
            <p className="text-xs text-[#64748B]">
              Séparation transparente entre encaissements clients reçus et retraits marchands
            </p>
          </div>

          {/* Sélecteur d'Onglets Principal (Entrées vs Sorties) */}
          <div className="flex items-center gap-1.5 bg-[#F1F5F9] p-1.5 rounded-2xl border border-[#E2E8F0] shrink-0">
            <button
              type="button"
              onClick={() => setHistoryTab('inflows')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                historyTab === 'inflows'
                  ? 'bg-white text-[#1E60F8] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>Versements & Encaissements</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  historyTab === 'inflows'
                    ? 'bg-[#EFF4FF] text-[#1E60F8]'
                    : 'bg-[#E2E8F0] text-[#64748B]'
                }`}
              >
                {rawInflows.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setHistoryTab('outflows')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                historyTab === 'outflows'
                  ? 'bg-white text-[#1E60F8] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-[#1E60F8]" />
              <span>Retraits Marchand</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  historyTab === 'outflows'
                    ? 'bg-[#EFF4FF] text-[#1E60F8]'
                    : 'bg-[#E2E8F0] text-[#64748B]'
                }`}
              >
                {wallet.payoutHistory.length}
              </span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION A : VERSEMENTS & ENCAISSEMENTS REÇUS (ENTRÉES)   */}
        {/* ======================================================== */}
        {historyTab === 'inflows' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Filtres par source d'encaissement */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#64748B] flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filtrer :
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInflowFilter('all')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      inflowFilter === 'all'
                        ? 'bg-[#0F172A] text-white shadow-xs'
                        : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:bg-white'
                    }`}
                  >
                    Tous ({rawInflows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInflowFilter('online')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      inflowFilter === 'online'
                        ? 'bg-[#1E60F8] text-white shadow-xs'
                        : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:bg-white'
                    }`}
                  >
                    En Ligne Wave / Orange
                  </button>
                  <button
                    type="button"
                    onClick={() => setInflowFilter('cod')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      inflowFilter === 'cod'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:bg-white'
                    }`}
                  >
                    Espèces Livraisons (COD)
                  </button>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-[#64748B]">
                Total affiché :{' '}
                <span className="font-black text-[#0F172A]">
                  {formatFCFA(filteredInflows.reduce((sum, i) => sum + i.amount, 0))}
                </span>
              </span>
            </div>

            {/* Table des Encaissements */}
            <div className="overflow-x-auto rounded-2xl border border-[#F1F5F9]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[#64748B] font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Réf. Commande</th>
                    <th className="py-3 px-4">Client & Secteur</th>
                    <th className="py-3 px-4">Canal d'encaissement</th>
                    <th className="py-3 px-4">Date & Heure</th>
                    <th className="py-3 px-4">Montant Net</th>
                    <th className="py-3 px-4 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F8FAFC]">
                  {filteredInflows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#94A3B8]">
                        Aucun encaissement trouvé pour ce filtre.
                      </td>
                    </tr>
                  ) : (
                    filteredInflows.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#1E60F8] whitespace-nowrap">
                          {item.orderId}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-extrabold text-[#0F172A] block">
                            {item.customerName}
                          </span>
                          <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-[#1E60F8]" />
                            {item.neighborhood}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.source === 'online_wave' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#EFF4FF] text-[#1E60F8]">
                              <CreditCard className="w-3 h-3" />
                              Wave (En ligne)
                            </span>
                          )}
                          {item.source === 'online_orange' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FFF5EB] text-[#EA580C]">
                              <Smartphone className="w-3 h-3" />
                              Orange Money (En ligne)
                            </span>
                          )}
                          {item.source === 'cod_cash' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#ECFDF5] text-[#059669]">
                              <Banknote className="w-3 h-3" />
                              Espèces Livraison (COD)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="py-3.5 px-4 font-black text-sm text-emerald-600 whitespace-nowrap">
                          +{formatFCFA(item.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Encaissé & Validé</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION B : RETRAITS & VIREMENTS MARCHAND (SORTIES)      */}
        {/* ======================================================== */}
        {historyTab === 'outflows' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Virements automatiques via API Wave & Orange Money
              </span>

              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenPayoutModal}
                disabled={wallet.availableBalance <= 0}
                icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                className="cursor-pointer"
              >
                Nouveau virement
              </Button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#F1F5F9]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[#64748B] font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Réf. Virement</th>
                    <th className="py-3 px-4">Opérateur</th>
                    <th className="py-3 px-4">Numéro Destinataire</th>
                    <th className="py-3 px-4">Date de virement</th>
                    <th className="py-3 px-4">Montant Décaissé</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Reçu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F8FAFC]">
                  {wallet.payoutHistory.map((payout) => (
                    <tr key={payout.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F172A] whitespace-nowrap">
                        {payout.reference}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            payout.provider === 'wave'
                              ? 'bg-[#EFF4FF] text-[#1E60F8]'
                              : 'bg-[#FFF5EB] text-[#EA580C]'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {payout.provider === 'wave' ? 'Wave Sénégal' : 'Orange Money'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#0F172A] whitespace-nowrap">
                        {payout.phoneNumber}
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                        {payout.date}
                      </td>
                      <td className="py-3.5 px-4 font-black text-sm text-[#0F172A] whitespace-nowrap">
                        {formatFCFA(payout.amount)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Virement Effectué</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(payout)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Voir reçu</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL : REÇU OFFICIEL DE VIREMENT MARCHAND               */}
      {/* ======================================================== */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 w-full max-w-md border border-[#E2E8F0] shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Preuve de Virement API
                </span>
                <h3 className="text-base font-black text-[#0F172A] mt-1">
                  Reçu de Virement Marchand
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded-full text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-center space-y-1">
              <span className="text-xs text-[#64748B] font-semibold">Montant viré avec succès</span>
              <h2 className="text-2xl font-black text-[#0F172A]">
                {formatFCFA(selectedReceipt.amount)}
              </h2>
              <span className="text-[11px] font-bold text-emerald-600 block">
                Statut : Transaction confirmée par l'opérateur
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Référence transaction :</span>
                <span className="font-mono font-bold text-[#0F172A]">{selectedReceipt.reference}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Opérateur financier :</span>
                <span className="font-bold text-[#0F172A]">
                  {selectedReceipt.provider === 'wave' ? 'Wave Sénégal' : 'Orange Money'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Compte destinataire :</span>
                <span className="font-bold text-[#0F172A]">{selectedReceipt.phoneNumber}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Date & Heure :</span>
                <span className="font-semibold text-[#0F172A]">{selectedReceipt.date}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              Fermer le reçu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
