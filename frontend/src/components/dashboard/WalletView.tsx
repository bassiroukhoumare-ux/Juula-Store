'use client';

import React, { useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Filter,
  Phone,
  Search,
  ShoppingBag,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { WalletState, OrderLead } from '@/types/juula';
import { formatFCFA } from '@/lib/orderUtils';

interface WalletViewProps {
  wallet: WalletState;
  orders?: OrderLead[];
  onOpenPayoutModal?: () => void;
}

type OrderFilter = 'all' | 'paid_delivered' | 'pending' | 'cancelled';

export const WalletView: React.FC<WalletViewProps> = ({ wallet: _wallet, orders = [] }) => {
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Calculs des métriques financières
  const {
    paidDeliveredOrders,
    totalCollected,
    pendingPaymentOrders,
    totalPending,
    cancelledOrders,
    totalCancelled,
  } = useMemo(() => {
    let collected = 0;
    let pending = 0;
    let cancelled = 0;

    const paidDelivered: OrderLead[] = [];
    const pendingList: OrderLead[] = [];
    const cancelledList: OrderLead[] = [];

    for (const o of orders) {
      const amount = o.totalAmount ?? o.amount + (o.deliveryFee || 0);

      if (o.status === 'cancelled' || o.paymentStatus === 'refunded') {
        cancelled += amount;
        cancelledList.push(o);
      } else if (
        o.status === 'delivered' ||
        o.paymentStatus === 'paid' ||
        o.paymentStatus === 'paid_direct'
      ) {
        collected += amount;
        paidDelivered.push(o);
      } else {
        // Juste commandé, pas encore livré ni payé
        pending += amount;
        pendingList.push(o);
      }
    }

    return {
      paidDeliveredOrders: paidDelivered,
      totalCollected: collected,
      pendingPaymentOrders: pendingList,
      totalPending: pending,
      cancelledOrders: cancelledList,
      totalCancelled: cancelled,
    };
  }, [orders]);

  // 2. Filtrage des commandes selon l'onglet et la recherche
  const displayedOrders = useMemo(() => {
    let list = orders;
    if (filter === 'paid_delivered') {
      list = paidDeliveredOrders;
    } else if (filter === 'pending') {
      list = pendingPaymentOrders;
    } else if (filter === 'cancelled') {
      list = cancelledOrders;
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.trim().toLowerCase();
    return list.filter(
      (o) =>
        o.customerName?.toLowerCase().includes(query) ||
        o.id?.toLowerCase().includes(query) ||
        o.phone?.includes(query) ||
        o.city?.toLowerCase().includes(query) ||
        o.productName?.toLowerCase().includes(query),
    );
  }, [orders, filter, paidDeliveredOrders, pendingPaymentOrders, cancelledOrders, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ────────────────── 1. EN-TÊTE PRINCIPAL ────────────────── */}
      <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <h2 className="text-2xl sm:text-3xl font-black text-[#201D1D] tracking-tight">
          Juula Finance
        </h2>
        <p className="mt-1 text-sm text-[#7A808C]">
          Suivi en temps réel de vos encaissements, des montants en attente et de l'historique
          financier de vos commandes.
        </p>
      </div>

      {/* ────────────────── 2. LES 4 GRANDS CHIFFRES CLÉS ────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Ventes totales encaissées */}
        <div className="p-3.5 sm:p-5 rounded-[22px] sm:rounded-[24px] bg-white border border-[#ECEFF4] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-[#7A808C] leading-snug">
                <span className="hidden sm:inline">Ventes totales encaissées</span>
                <span className="sm:hidden">Encaissé</span>
              </span>
              <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </span>
            </div>
            <p className="mt-2 sm:mt-3 text-lg sm:text-2xl lg:text-3xl font-black text-[#201D1D] tracking-tight tabular-nums break-words">
              {formatFCFA(totalCollected)}
            </p>
          </div>
          <p className="mt-1.5 text-[11px] sm:text-xs font-semibold text-[#7A808C] flex items-center gap-1">
            <span className="hidden sm:inline">
              {paidDeliveredOrders.length} commande(s) livrée(s) ou payée(s)
            </span>
            <span className="sm:hidden truncate">
              {paidDeliveredOrders.length} payée(s)/livrée(s)
            </span>
          </p>
        </div>

        {/* Reste à être payé / En attente */}
        <div className="p-3.5 sm:p-5 rounded-[22px] sm:rounded-[24px] bg-white border border-[#ECEFF4] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-[#7A808C] leading-snug">
                <span className="hidden sm:inline">Reste à être payé</span>
                <span className="sm:hidden">Reste à payer</span>
              </span>
              <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </span>
            </div>
            <p className="mt-2 sm:mt-3 text-lg sm:text-2xl lg:text-3xl font-black text-[#201D1D] tracking-tight tabular-nums break-words">
              {formatFCFA(totalPending)}
            </p>
          </div>
          <p className="mt-1.5 text-[11px] sm:text-xs font-semibold text-[#7A808C] flex items-center gap-1">
            <span className="hidden sm:inline">
              {pendingPaymentOrders.length} commande(s) pas encore livrée(s)
            </span>
            <span className="sm:hidden truncate">{pendingPaymentOrders.length} à livrer</span>
          </p>
        </div>

        {/* Commandes annulées */}
        <div className="p-3.5 sm:p-5 rounded-[22px] sm:rounded-[24px] bg-white border border-[#ECEFF4] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-[#7A808C] leading-snug">
                <span className="hidden sm:inline">Commandes annulées</span>
                <span className="sm:hidden">Annulées</span>
              </span>
              <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <XCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </span>
            </div>
            <p className="mt-2 sm:mt-3 text-lg sm:text-2xl lg:text-3xl font-black text-[#201D1D] tracking-tight tabular-nums break-words">
              {formatFCFA(totalCancelled)}
            </p>
          </div>
          <p className="mt-1.5 text-[11px] sm:text-xs font-semibold text-[#7A808C] truncate">
            <span className="hidden sm:inline">
              {cancelledOrders.length} commande(s) annulée(s)
            </span>
            <span className="sm:hidden">{cancelledOrders.length} annulée(s)</span>
          </p>
        </div>

        {/* Total volume commandes */}
        <div className="p-3.5 sm:p-5 rounded-[22px] sm:rounded-[24px] bg-white border border-[#ECEFF4] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-[#7A808C] leading-snug">
                Total commandes
              </span>
              <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </span>
            </div>
            <p className="mt-2 sm:mt-3 text-lg sm:text-2xl lg:text-3xl font-black text-[#201D1D] tracking-tight tabular-nums break-words">
              {orders.length}
            </p>
          </div>
          <p className="mt-1.5 text-[11px] sm:text-xs font-semibold text-[#7A808C] truncate">
            Toutes confondues
          </p>
        </div>
      </div>

      {/* ────────────────── 3. HISTORIQUE DES COMMANDES AVEC FILTRAGE ────────────────── */}
      <div className="bg-white rounded-[28px] p-5 sm:p-6 border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-5">
        {/* En-tête des filtres */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
          <div>
            <h3 className="text-lg font-black text-[#201D1D]">
              Historique des Commandes & Statuts Financiers
            </h3>
            <p className="text-xs sm:text-[13px] text-[#7A808C]">
              Visualisez le détail de vos commandes livrées, en cours de livraison ou annulées.
            </p>
          </div>

          {/* Barre de recherche rapide */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-[#9AA0AB] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher client, réf..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#201D1D] placeholder:text-[#9AA0AB] focus:outline-none focus:border-[#235BF7] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Boutons d'onglets de filtrage */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#7A808C] flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filtrer :
          </span>

          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-[#201D1D] text-white shadow-xs'
                : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#7A808C] hover:bg-white'
            }`}
          >
            Toutes ({orders.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('paid_delivered')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'paid_delivered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-[#F8FAFC] border border-[#E2E8F0] text-emerald-700 hover:bg-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Livrées & Payées ({paidDeliveredOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-[#F8FAFC] border border-[#E2E8F0] text-amber-700 hover:bg-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>En cours / À livrer ({pendingPaymentOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('cancelled')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'cancelled'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-[#F8FAFC] border border-[#E2E8F0] text-red-700 hover:bg-white'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Annulées ({cancelledOrders.length})</span>
          </button>
        </div>

        {/* ── Table Responsive ── */}
        {displayedOrders.length === 0 ? (
          <div className="py-12 text-center text-[#9AA0AB] space-y-2">
            <ShoppingBag className="w-8 h-8 mx-auto text-[#CBD5E1]" />
            <p className="text-sm font-bold text-[#64748B]">
              Aucune commande trouvée pour ce filtre.
            </p>
            <p className="text-xs text-[#94A3B8]">
              {orders.length === 0
                ? 'Vos futures commandes apparaîtront ici dès que vos clients commanderont.'
                : 'Essayez de changer de filtre ou de vider votre recherche.'}
            </p>
          </div>
        ) : (
          <>
            {/* Version Mobile (Cartes) */}
            <div className="space-y-3 sm:hidden">
              {displayedOrders.map((o) => {
                const total = o.totalAmount ?? o.amount + (o.deliveryFee || 0);
                const isPaid =
                  o.status === 'delivered' ||
                  o.paymentStatus === 'paid' ||
                  o.paymentStatus === 'paid_direct';
                const isCancelled = o.status === 'cancelled' || o.paymentStatus === 'refunded';

                return (
                  <div
                    key={o.id}
                    className="p-4 rounded-2xl border border-[#ECEFF4] bg-white space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-xs text-[#235BF7] tabular-nums">
                        #{o.sequenceNumber || o.id.slice(-6)}
                      </span>
                      <span className="font-black text-base text-[#201D1D] tabular-nums">
                        {formatFCFA(total)}
                      </span>
                    </div>

                    <div>
                      <p className="font-black text-sm text-[#201D1D]">{o.customerName}</p>
                      <p className="text-xs text-[#7A808C] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-[#235BF7]" />
                        <span>{o.phone || o.whatsappNumber}</span>
                        {o.city && <span>· {o.city}</span>}
                      </p>
                    </div>

                    <p className="text-xs text-[#475569] font-medium bg-[#F8FAFC] p-2 rounded-xl">
                      {o.productName} {o.quantity ? `×${o.quantity}` : ''}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F1F5F9] text-[11px]">
                      {/* Statut Livraison */}
                      {o.status === 'delivered' ? (
                        <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700">
                          Livrée
                        </span>
                      ) : isCancelled ? (
                        <span className="px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-700">
                          Annulée
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800">
                          En cours / À livrer
                        </span>
                      )}

                      {/* Statut Financier */}
                      {isPaid ? (
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Encaissé
                        </span>
                      ) : isCancelled ? (
                        <span className="font-bold text-slate-500">Non encaissé</span>
                      ) : (
                        <span className="font-bold text-amber-700 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Reste à payer
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Version Desktop (Tableau) */}
            <div className="hidden sm:block overflow-x-auto rounded-2xl border border-[#F1F5F9]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[#7A808C] font-black uppercase tracking-wider">
                    <th className="py-3 px-4">Commande</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Produit(s)</th>
                    <th className="py-3 px-4">Mode de règlement</th>
                    <th className="py-3 px-4">Livraison</th>
                    <th className="py-3 px-4">État financier</th>
                    <th className="py-3 px-4 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F8FAFC]">
                  {displayedOrders.map((o) => {
                    const total = o.totalAmount ?? o.amount + (o.deliveryFee || 0);
                    const isPaid =
                      o.status === 'delivered' ||
                      o.paymentStatus === 'paid' ||
                      o.paymentStatus === 'paid_direct';
                    const isCancelled = o.status === 'cancelled' || o.paymentStatus === 'refunded';

                    return (
                      <tr key={o.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-extrabold text-[#235BF7] tabular-nums block">
                            #{o.sequenceNumber || o.id.slice(-6)}
                          </span>
                          <span className="text-[11px] text-[#9AA0AB]">
                            {o.createdAt || 'Récemment'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-[#201D1D] block">{o.customerName}</span>
                          <span className="text-[11px] text-[#7A808C] flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-[#235BF7]" />
                            {o.phone || o.whatsappNumber}
                            {o.city && <span>· {o.city}</span>}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-[200px] truncate">
                          <span className="font-semibold text-[#201D1D] block truncate">
                            {o.productName}
                          </span>
                          {o.quantity && o.quantity > 1 && (
                            <span className="text-[11px] text-[#7A808C]">
                              Quantité : {o.quantity}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {o.paymentType === 'cod' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-[#3F4654]">
                              <Banknote className="w-3 h-3" /> Espèces à la livraison
                            </span>
                          ) : o.paymentType.startsWith('online_') ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#EEF3FF] text-[#235BF7]">
                              <CreditCard className="w-3 h-3" /> Mobile Money (En ligne)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700">
                              <Smartphone className="w-3 h-3" /> Direct marchand
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {o.status === 'delivered' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" /> Livrée
                            </span>
                          ) : isCancelled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700">
                              <XCircle className="w-3 h-3" /> Annulée
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800">
                              <Clock className="w-3 h-3" /> En cours
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" /> Encaissé
                            </span>
                          ) : isCancelled ? (
                            <span className="text-slate-400 font-medium">Non encaissé</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                              <Clock className="w-3 h-3" /> Reste à payer
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-black text-sm text-[#201D1D] tabular-nums">
                          {formatFCFA(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
