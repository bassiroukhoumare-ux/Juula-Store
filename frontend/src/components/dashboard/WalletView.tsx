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
  Filter,
  ArrowDownLeft,
  MapPin,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WalletState, OrderLead, InflowRecord, PayoutRecord } from '@/types/juula';
import { formatFCFA } from '@/lib/orderUtils';

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
          amount: wallet.todayRevenue ?? 0,
          growth: (wallet.todayRevenue ?? 0) > 0 ? '+100%' : '0%',
          periodSubtitle: 'Chiffre d’affaires encaissé en 24h',
        };
      case 'week':
        return {
          label: 'Recette des 7 Derniers Jours',
          amount: wallet.monthRevenue ?? 0,
          growth: (wallet.monthRevenue ?? 0) > 0 ? '+100%' : '0%',
          periodSubtitle: 'Cumul des ventes sur les 7 derniers jours',
        };
      case '2weeks':
        return {
          label: 'Recette des 14 Derniers Jours',
          amount: wallet.monthRevenue ?? 0,
          growth: (wallet.monthRevenue ?? 0) > 0 ? '+100%' : '0%',
          periodSubtitle: 'Activité commerciale sur 2 semaines',
        };
      case 'month':
        return {
          label: 'Recette Totale du Mois',
          amount: wallet.monthRevenue ?? 0,
          growth: (wallet.monthRevenue ?? 0) > 0 ? '+100%' : '0%',
          periodSubtitle: 'Volume global encaissé ce mois',
        };
    }
  };

  const periodData = getRevenueForFilter();
  const monthTotal = wallet.monthRevenue || 0;

  // Real-time calculation of delivered COD from orders if present
  const deliveredCodOrders = orders.filter(
    (o) => o.status === 'delivered' && o.paymentType === 'cod',
  );
  const deliveredCodTotal = deliveredCodOrders.reduce(
    (sum, o) => sum + (o.totalAmount || o.amount + (o.deliveryFee || 0)),
    0,
  );
  const effectiveCodCollected =
    deliveredCodTotal > 0 ? deliveredCodTotal : wallet.codCollectedAmount || 0;

  // Inflows list
  const rawInflows: InflowRecord[] = wallet.inflowHistory || [];

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-[28px] bg-white border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF3FF] text-[#235BF7] text-[13px] font-bold uppercase tracking-wider">
            <Wallet className="w-3.5 h-3.5" />
            <span>Gestion Financière & Trésorerie</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#201D1D] tracking-tight">
            Portefeuille & Retraits Marchand
          </h2>
          <p className="text-[13px] sm:text-[15px] text-[#7A808C] max-w-xl">
            Suivi des recettes, encaissements Wave / Orange Money / Espèces & virements marchands
            vers vos comptes.
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
        <div className="bg-white rounded-[28px] p-5 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] border-t-4 border-t-[#235BF7] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold uppercase tracking-wider text-[#7A808C] truncate">
                {periodData.label}
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
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
                  className={`flex-1 py-1 rounded-lg text-xs font-extrabold text-center transition-all cursor-pointer ${
                    timeFilter === p.id
                      ? 'bg-white text-[#235BF7] shadow-xs'
                      : 'text-[#7A808C] hover:text-[#201D1D]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-baseline gap-1.5 mt-3">
              <span className="text-2xl lg:text-3xl font-black text-[#201D1D] tracking-tight">
                {formatFCFA(periodData.amount)}
              </span>
            </div>

            <span className="inline-flex items-center gap-1 text-[13px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
              <TrendingUp className="w-3 h-3" />
              {periodData.growth}
            </span>
          </div>

          {/* Synchronized Month Balance Tracker */}
          <div className="pt-2.5 border-t border-[#F1F5F9] mt-2 space-y-1">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#7A808C] font-semibold">Cumul ce mois (Octobre) :</span>
              <span className="font-extrabold text-[#201D1D]">{formatFCFA(monthTotal)}</span>
            </div>
            <p className="text-xs text-[#94A3B8] leading-tight">
              Synchronisé en temps réel avec vos ventes
            </p>
          </div>
        </div>

        {/* CARTE 2 : SOLDE EN LIGNE DISPONIBLE (RETIRABLE IMMÉDIATEMENT) */}
        <div className="bg-white rounded-[28px] p-5 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] border-t-4 border-t-[#10B981] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wider text-[#7A808C]">
                Solde En Ligne Disponible
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl lg:text-3xl font-black text-[#201D1D] tracking-tight">
                {formatFCFA(wallet.availableBalance)}
              </span>
            </div>

            <p className="text-[13px] text-[#7A808C] mt-1.5 leading-relaxed">
              Paiements en ligne retirables {wallet.payoutHoldHours ?? 72} h après leur réception.
            </p>
            {(wallet.pendingOnlineAmount ?? 0) > 0 && (
              <div className="mt-2 flex items-start gap-1.5 text-[13px] font-bold text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-xl">
                <Clock className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>
                  + {formatFCFA(wallet.pendingOnlineAmount ?? 0)} en attente
                  {wallet.nextReleaseAt
                    ? ` · prochain déblocage le ${new Date(wallet.nextReleaseAt).toLocaleString(
                        'fr-FR',
                        {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        },
                      )}`
                    : ''}
                </span>
              </div>
            )}
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
        <div className="bg-white rounded-[28px] p-5 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] border-t-4 border-t-[#0EA5E9] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wider text-[#7A808C]">
                Encaissé en Espèces (COD)
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#EFF6FF] text-[#0EA5E9] flex items-center justify-center shrink-0">
                <Banknote className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl lg:text-3xl font-black text-[#201D1D] tracking-tight">
                {formatFCFA(effectiveCodCollected)}
              </span>
            </div>

            <p className="text-[13px] text-[#7A808C] mt-1.5 leading-relaxed">
              Argent remis en main propre par les coursiers après livraison à Dakar.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[13px] text-[#0284C7] font-bold bg-[#F0F9FF] p-2 rounded-xl border border-[#BAE6FD]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#0284C7]" />
            <span className="truncate">Livraisons confirmées & encaissées</span>
          </div>
        </div>

        {/* CARTE 4 : TOTAL DES RETRAITS EFFECTUÉS (SORTIES DE FONDS MARCHAND) */}
        <div className="bg-white rounded-[28px] p-5 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] border-t-4 border-t-[#6366F1] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-wider text-[#7A808C]">
                Total Retraits Effectués
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#EEF2FF] text-[#6366F1] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl lg:text-3xl font-black text-[#201D1D] tracking-tight">
                {formatFCFA(wallet.totalWithdrawn)}
              </span>
            </div>

            <p className="text-[13px] text-[#7A808C] mt-1.5 leading-relaxed">
              Cumul total viré sur vos comptes marchands Wave / Orange Money.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[13px] text-[#059669] font-bold bg-[#ECFDF5] p-2 rounded-xl border border-[#A7F3D0]">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#10B981]" />
            <span className="truncate">
              {wallet.payoutHistory.length} virements réalisés • 0 incident
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. HISTORIQUE CLAIREMENT SÉPARÉ EN 2 SECTIONS DISTINCTES */}
      {/* (DEMANDE DE L'UTILISATEUR : BIEN SÉPARER RETRAITS & VERSEMENTS)*/}
      {/* ======================================================== */}
      <div className="bg-white rounded-[28px] p-6 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-5">
        {/* En-tête avec Navigation par Onglets Distincts */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#201D1D]">
              Journal des Flux Financiers
            </h3>
            <p className="text-[13px] text-[#7A808C]">
              Séparation transparente entre encaissements clients reçus et retraits marchands
            </p>
          </div>

          {/* Sélecteur d'Onglets Principal (Entrées vs Sorties) */}
          <div className="flex items-center gap-1.5 bg-[#F1F5F9] p-1.5 rounded-2xl border border-[#E2E8F0] shrink-0">
            <button
              type="button"
              onClick={() => setHistoryTab('inflows')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                historyTab === 'inflows'
                  ? 'bg-white text-[#235BF7] shadow-xs'
                  : 'text-[#7A808C] hover:text-[#201D1D]'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>Versements & Encaissements</span>
              <span
                className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                  historyTab === 'inflows'
                    ? 'bg-[#EEF3FF] text-[#235BF7]'
                    : 'bg-[#E2E8F0] text-[#7A808C]'
                }`}
              >
                {rawInflows.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setHistoryTab('outflows')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                historyTab === 'outflows'
                  ? 'bg-white text-[#235BF7] shadow-xs'
                  : 'text-[#7A808C] hover:text-[#201D1D]'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-[#235BF7]" />
              <span>Retraits Marchand</span>
              <span
                className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                  historyTab === 'outflows'
                    ? 'bg-[#EEF3FF] text-[#235BF7]'
                    : 'bg-[#E2E8F0] text-[#7A808C]'
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
                <span className="text-[13px] font-bold text-[#7A808C] flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filtrer :
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInflowFilter('all')}
                    className={`px-3 py-1 rounded-xl text-[13px] font-bold transition-colors cursor-pointer ${
                      inflowFilter === 'all'
                        ? 'bg-[#201D1D] text-white shadow-xs'
                        : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#7A808C] hover:bg-white'
                    }`}
                  >
                    Tous ({rawInflows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInflowFilter('online')}
                    className={`px-3 py-1 rounded-xl text-[13px] font-bold transition-colors cursor-pointer ${
                      inflowFilter === 'online'
                        ? 'bg-[#235BF7] text-white shadow-xs'
                        : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#7A808C] hover:bg-white'
                    }`}
                  >
                    En Ligne Wave / Orange
                  </button>
                  <button
                    type="button"
                    onClick={() => setInflowFilter('cod')}
                    className={`px-3 py-1 rounded-xl text-[13px] font-bold transition-colors cursor-pointer ${
                      inflowFilter === 'cod'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#7A808C] hover:bg-white'
                    }`}
                  >
                    Espèces Livraisons (COD)
                  </button>
                </div>
              </div>

              <span className="text-[13px] font-semibold text-[#7A808C]">
                Total affiché :{' '}
                <span className="font-black text-[#201D1D]">
                  {formatFCFA(filteredInflows.reduce((sum, i) => sum + i.amount, 0))}
                </span>
              </span>
            </div>

            {/* Table des Encaissements */}
            <div className="overflow-x-auto rounded-2xl border border-[#F1F5F9]">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[#7A808C] font-bold uppercase text-xs tracking-wider">
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
                        <td className="py-3.5 px-4 font-mono font-bold text-[#235BF7] whitespace-nowrap">
                          {item.orderId}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-extrabold text-[#201D1D] block">
                            {item.customerName}
                          </span>
                          <span className="text-[13px] text-[#7A808C] flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-[#235BF7]" />
                            {item.neighborhood}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.source === 'online_wave' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-bold bg-[#EEF3FF] text-[#235BF7]">
                              <CreditCard className="w-3 h-3" />
                              Wave (En ligne)
                            </span>
                          )}
                          {item.source === 'online_orange' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-bold bg-[#FFF5EB] text-[#EA580C]">
                              <Smartphone className="w-3 h-3" />
                              Orange Money (En ligne)
                            </span>
                          )}
                          {item.source === 'cod_cash' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-bold bg-[#ECFDF5] text-[#059669]">
                              <Banknote className="w-3 h-3" />
                              Espèces Livraison (COD)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#7A808C] whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="py-3.5 px-4 font-black text-[15px] text-emerald-600 whitespace-nowrap">
                          +{formatFCFA(item.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-full">
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[#7A808C] font-bold uppercase text-xs tracking-wider">
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
                  {wallet.payoutHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#94A3B8]">
                        Aucun virement ou retrait effectué pour le moment.
                      </td>
                    </tr>
                  ) : (
                    wallet.payoutHistory.map((payout) => (
                      <tr key={payout.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#201D1D] whitespace-nowrap">
                          {payout.reference}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-bold ${
                              payout.provider === 'wave'
                                ? 'bg-[#EEF3FF] text-[#235BF7]'
                                : 'bg-[#FFF5EB] text-[#EA580C]'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {payout.provider === 'wave' ? 'Wave Sénégal' : 'Orange Money'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#201D1D] whitespace-nowrap">
                          {payout.phoneNumber}
                        </td>
                        <td className="py-3.5 px-4 text-[#7A808C] whitespace-nowrap">
                          {payout.date}
                        </td>
                        <td className="py-3.5 px-4 font-black text-[15px] text-[#201D1D] whitespace-nowrap">
                          {formatFCFA(payout.amount)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {payout.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 text-[13px] font-bold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Virement Effectué</span>
                            </span>
                          ) : payout.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 text-[13px] font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
                              <span>Échoué — montant recrédité</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[13px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                              <Clock className="w-3 h-3" />
                              <span>En cours</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(payout)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] font-bold text-[13px] transition-colors cursor-pointer"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Voir reçu</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
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
            className="bg-white rounded-[28px] p-6 w-full max-w-md border border-[#E2E8F0] shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Preuve de Virement API
                </span>
                <h3 className="text-base font-black text-[#201D1D] mt-1">
                  Reçu de Virement Marchand
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded-full text-[#7A808C] hover:text-[#201D1D] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-center space-y-1">
              <span className="text-[13px] text-[#7A808C] font-semibold">
                Montant viré avec succès
              </span>
              <h2 className="text-2xl font-black text-[#201D1D]">
                {formatFCFA(selectedReceipt.amount)}
              </h2>
              <span className="text-[13px] font-bold text-emerald-600 block">
                Statut : Transaction confirmée par l'opérateur
              </span>
            </div>

            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#7A808C]">Référence transaction :</span>
                <span className="font-mono font-bold text-[#201D1D]">
                  {selectedReceipt.reference}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#7A808C]">Opérateur financier :</span>
                <span className="font-bold text-[#201D1D]">
                  {selectedReceipt.provider === 'wave' ? 'Wave Sénégal' : 'Orange Money'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#7A808C]">Compte destinataire :</span>
                <span className="font-bold text-[#201D1D]">{selectedReceipt.phoneNumber}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#7A808C]">Date & Heure :</span>
                <span className="font-semibold text-[#201D1D]">{selectedReceipt.date}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-2.5 rounded-xl bg-[#201D1D] text-white text-[13px] font-bold hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              Fermer le reçu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
