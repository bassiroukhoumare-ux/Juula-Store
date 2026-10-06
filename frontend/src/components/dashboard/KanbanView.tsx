'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Folder,
  FolderOpen,
  MapPin,
  Package,
  PhoneCall,
  Search,
  Volume2,
} from 'lucide-react';
import { OrderLead, OrderStatus } from '@/types/juula';
import { Input } from '@/components/ui/Input';
import { formatFCFA } from '@/lib/orderUtils';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface KanbanViewProps {
  orders: OrderLead[];
  onOrdersChange: (orders: OrderLead[]) => void;
  onOpenStorefrontPreview: () => void;
  /** Order to open/expand on arrival (deep link from the "new order" email). */
  focusOrderId?: string | null;
  /** Search typed in the dashboard header. */
  searchQuery?: string;
  /** Direct payment (merchant's own link): mark the money as received. */
  onConfirmDirectPayment?: (reference: string) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  orders,
  onOrdersChange,
  focusOrderId = null,
  onConfirmDirectPayment,
  searchQuery: externalSearch = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  useEffect(() => setSearchQuery(externalSearch), [externalSearch]);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'online' | 'cod'>('all');
  const [mobileStatusTab, setMobileStatusTab] = useState<'all' | OrderStatus>('all');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  // Day folders: today's orders stay in the main list; each finished day
  // becomes a folder (« 4 octobre 2026 ») that opens on that day's orders.
  const [openDay, setOpenDay] = useState<string | null>(null);

  const handleMoveStatus = (orderId: string, nextStatus: OrderStatus) => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o));
    onOrdersChange(updated);
  };

  // Deep link: expand the order (opening its day folder) and bring it into view.
  useEffect(() => {
    if (!focusOrderId) return;
    const target = orders.find((o) => o.id === focusOrderId);
    const key = target ? dayKeyOf(target) : todayKey();
    setOpenDay(key === todayKey() ? null : key);
    setExpandedOrders((prev) => ({ ...prev, [focusOrderId]: true }));
    const t = setTimeout(() => {
      document
        .getElementById(`order-${focusOrderId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => clearTimeout(t);
  }, [focusOrderId]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesQuery =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.neighborhood.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phone.includes(searchQuery) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPayment =
      paymentFilter === 'all'
        ? true
        : paymentFilter === 'online'
          ? order.paymentType === 'online_wave' || order.paymentType === 'online_orange'
          : order.paymentType === 'cod';

    return matchesQuery && matchesPayment;
  });

  const onlineOrdersCount = orders.filter(
    (o) => o.paymentType === 'online_wave' || o.paymentType === 'online_orange',
  ).length;
  const codOrdersCount = orders.filter((o) => o.paymentType === 'cod').length;

  const searching = searchQuery.trim().length > 0;
  const today = todayKey();
  // Searching looks into every day; otherwise the open folder, or today.
  const scopedOrders = searching
    ? filteredOrders
    : filteredOrders.filter((o) => dayKeyOf(o) === (openDay ?? today));
  const dayFolders = useMemo(() => {
    const map = new Map<string, OrderLead[]>();
    for (const o of filteredOrders) {
      const key = dayKeyOf(o);
      if (key === today) continue;
      map.set(key, [...(map.get(key) ?? []), o]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, list]) => ({
        key,
        label: dayLabel(key),
        count: list.length,
        newCount: list.filter((o) => o.status === 'new').length,
        total: list
          .filter((o) => o.status !== 'cancelled')
          .reduce((sum, o) => sum + (o.totalAmount || o.amount), 0),
      }));
  }, [filteredOrders, today]);

  const mobileOrders = scopedOrders.filter((o) =>
    mobileStatusTab === 'all' ? true : o.status === mobileStatusTab,
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Hidden audio player for list/table view playback */}

      {/* ======================================================== */}
      {/* 1. TOP HEADER & KPI FILTERS (ÉPURÉ, CONTEMPORAIN)        */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#235BF7] bg-[#EEF3FF] px-2.5 py-0.5 rounded-md">
              Pipeline Logistique
            </span>
            <span className="text-[13px] text-[#7A808C] font-semibold">
              {orders.length} commandes enregistrées
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#201D1D] tracking-tight mt-1">
            Commandes Cash on Delivery & En Ligne
          </h2>
          <p className="text-[13px] text-[#7A808C] mt-0.5">
            Suivi des expéditions Dakar, contact client instantané & encaissements.
          </p>
        </div>

        {/* Filter counters (Toutes / En Ligne / COD) */}
        <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setPaymentFilter('all')}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 px-3 py-2 rounded-2xl border text-left transition-all cursor-pointer ${
              paymentFilter === 'all'
                ? 'bg-white border-[#235BF7] ring-2 ring-[#235BF7]/15 shadow-xs text-[#235BF7]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#7A808C] hover:bg-white'
            }`}
          >
            <span className="text-xs uppercase font-bold tracking-wider">Toutes</span>
            <span
              className={`text-[13px] font-black px-2 py-0.5 rounded-full ${
                paymentFilter === 'all' ? 'bg-[#235BF7] text-white' : 'bg-[#E2E8F0] text-[#201D1D]'
              }`}
            >
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentFilter('online')}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 px-3 py-2 rounded-2xl border text-left transition-all cursor-pointer ${
              paymentFilter === 'online'
                ? 'bg-[#EEF3FF] border-[#235BF7] ring-2 ring-[#235BF7]/15 shadow-xs text-[#235BF7]'
                : 'bg-white border-[#E2E8F0] text-[#7A808C] hover:bg-[#F8FAFC]'
            }`}
          >
            <span className="text-xs uppercase font-bold tracking-wider">En Ligne</span>
            <span
              className={`text-[13px] font-black px-2 py-0.5 rounded-full ${
                paymentFilter === 'online'
                  ? 'bg-[#235BF7] text-white'
                  : 'bg-[#EEF3FF] text-[#235BF7]'
              }`}
            >
              {onlineOrdersCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentFilter('cod')}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 px-3 py-2 rounded-2xl border text-left transition-all cursor-pointer ${
              paymentFilter === 'cod'
                ? 'bg-white border-[#201D1D] ring-2 ring-[#201D1D]/15 shadow-xs text-[#201D1D]'
                : 'bg-white border-[#E2E8F0] text-[#7A808C] hover:bg-[#F8FAFC]'
            }`}
          >
            <span className="text-xs uppercase font-bold tracking-wider truncate">Espèces</span>
            <span
              className={`text-[13px] font-black px-2 py-0.5 rounded-full ${
                paymentFilter === 'cod' ? 'bg-[#201D1D] text-white' : 'bg-[#F1F5F9] text-[#334155]'
              }`}
            >
              {codOrdersCount}
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. RECHERCHE, SECTEURS ET SÉLECTEUR DE DISPOSITION       */}
      {/* (COLONNES KANBAN / LISTE LOGISTIQUE / TABLEAU CRM)       */}
      {/* ======================================================== */}
      <div className="flex items-center gap-3">
        <div className="w-full sm:max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un client, un téléphone, une adresse…"
            icon={<Search className="w-4 h-4 text-[#94A3B8]" />}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. LISTE DES COMMANDES (MÊME AFFICHAGE MOBILE / ORDINATEUR) */}
      {/* ======================================================== */}
      <div className="space-y-3">
        {/* Current scope: today, an opened day folder, or search results */}
        {openDay && !searching ? (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white border border-[#ECEFF4]">
            <button
              type="button"
              onClick={() => setOpenDay(null)}
              className="inline-flex items-center gap-2 h-10 px-3 rounded-xl text-[14px] font-semibold text-[#235BF7] hover:bg-[#EEF3FF] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Toutes les journées
            </button>
            <span className="flex items-center gap-2 text-[15px] font-bold text-[#201D1D] pr-2">
              <FolderOpen className="w-4 h-4 text-[#235BF7]" />
              {dayLabel(openDay)}
            </span>
          </div>
        ) : (
          <h3 className="text-[15px] font-extrabold text-[#201D1D] px-1">
            {searching ? 'Résultats de la recherche' : `Aujourd’hui · ${dayLabel(today)}`}
          </h3>
        )}

        {/* Filtre par statut */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all' as const, label: 'Toutes', count: scopedOrders.length },
            {
              id: 'new' as const,
              label: 'Nouvelles',
              count: scopedOrders.filter((o) => o.status === 'new').length,
            },
            {
              id: 'confirmed' as const,
              label: 'En route',
              count: scopedOrders.filter((o) => o.status === 'confirmed').length,
            },
            {
              id: 'delivered' as const,
              label: 'Livrées',
              count: scopedOrders.filter((o) => o.status === 'delivered').length,
            },
            {
              id: 'cancelled' as const,
              label: 'Annulées',
              count: scopedOrders.filter((o) => o.status === 'cancelled').length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileStatusTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                mobileStatusTab === tab.id
                  ? 'bg-[#235BF7] text-white shadow-xs'
                  : 'bg-white border border-[#E2E8F0] text-[#7A808C]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-1.5 py-0.2 rounded-full ${
                  mobileStatusTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F1F5F9] text-[#201D1D]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Lignes de commandes mobile */}
        <div className="space-y-2">
          {mobileOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-[13px] text-[#94A3B8] border border-[#ECEFF4]">
              {searching || openDay
                ? 'Aucune commande trouvée pour ces critères.'
                : 'Aucune commande aujourd’hui pour le moment. Les commandes des jours passés sont rangées dans les dossiers ci-dessous.'}
            </div>
          ) : (
            mobileOrders.map((order) => {
              const isExpanded = !!expandedOrders[order.id];
              // Only a payment confirmed by the server counts as paid.
              const isPaidOnline = order.paymentStatus === 'paid';
              const paymentBadge =
                order.paymentStatus === 'paid'
                  ? { label: 'Payé', cls: 'bg-[#FF7900] text-white' }
                  : order.paymentStatus === 'paid_direct'
                    ? { label: 'Payé (direct)', cls: 'bg-emerald-600 text-white' }
                    : order.paymentStatus === 'pending_direct'
                      ? { label: 'Paiement à vérifier', cls: 'bg-amber-100 text-amber-800' }
                      : order.paymentStatus === 'pending_online'
                        ? { label: 'Paiement en cours', cls: 'bg-[#F1F3F6] text-[#3F4654]' }
                        : null;
              const cleanPhone = (order.phone || '').replace(/[^0-9+]/g, '');
              const whatsappUrl = `https://wa.me/${order.whatsappNumber || cleanPhone}?text=${encodeURIComponent(
                `Bonjour ${order.customerName} ! Boutique concernant votre commande #${order.id} (${order.productName}). Pouvez-vous nous confirmer votre heure de livraison à ${order.neighborhood} ?`,
              )}`;

              return (
                <div
                  key={order.id}
                  id={`order-${order.id}`}
                  className={`relative bg-white rounded-2xl border shadow-xs overflow-hidden transition-all ${order.status === 'new' ? 'before:absolute before:left-0 before:inset-y-0 before:w-1.5 before:bg-[#235BF7] bg-[#F7F9FF] ' : ''}${order.id === focusOrderId ? 'ring-2 ring-[#235BF7] ' : ''}${
                    isPaidOnline
                      ? 'border-2 border-[#FF7900] ring-2 ring-[#FF7900]/15'
                      : 'border-[#ECEFF4]'
                  }`}
                >
                  <div
                    onClick={() => toggleExpand(order.id)}
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#F8FAFC] select-none"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-[13px] font-bold text-[#235BF7] bg-[#EEF3FF] px-1.5 py-0.5 rounded">
                          {order.id}
                        </span>
                        {order.status === 'new' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-extrabold uppercase tracking-wide bg-[#235BF7] text-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" /> Nouvelle
                          </span>
                        )}
                        {paymentBadge && (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${paymentBadge.cls}`}
                          >
                            {paymentBadge.label}
                          </span>
                        )}
                        <span className="text-[13px] text-[#94A3B8]">{order.createdAt}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <h4 className="text-[13px] font-black text-[#201D1D] truncate">
                          {order.customerName}
                        </h4>
                        <span className="text-[13px] font-black text-[#201D1D] whitespace-nowrap">
                          {formatFCFA(order.totalAmount || order.amount + (order.deliveryFee || 0))}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[13px] text-[#7A808C] mt-0.5 min-w-0">
                        <MapPin className="w-3 h-3 text-[#235BF7] shrink-0" />
                        <span className="truncate">
                          {(order.neighborhood.split('(')[0] ?? '').trim()}
                        </span>
                        <span className="hidden md:inline truncate">
                          · {order.productName}
                          {(order.quantity ?? 1) > 1 ? ` ×${order.quantity}` : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                        isExpanded
                          ? 'bg-[#235BF7] text-white rotate-180'
                          : 'bg-[#F1F5F9] text-[#7A808C]'
                      }`}
                      aria-label="Voir les détails"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-3.5 pb-4 pt-2 border-t border-[#F1F5F9] space-y-3 bg-[#FAFCFF] animate-in slide-in-from-top-2 duration-150">
                      {/* Produit avec Image & Quantité */}
                      <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] flex items-center gap-3">
                        {order.productImage ? (
                          <img
                            src={order.productImage}
                            alt={order.productName}
                            className="w-12 h-12 rounded-lg object-cover bg-white shrink-0 border border-[#CBD5E1]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#EEF3FF] flex items-center justify-center shrink-0 border border-[#DBEAFE]">
                            <Package className="w-6 h-6 text-[#235BF7]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="font-bold text-[#201D1D] text-[13px] truncate"
                              title={order.productName}
                            >
                              {order.productName}
                            </span>
                            <span className="text-xs font-bold text-[#475569] bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#E2E8F0] shrink-0">
                              Qté :{' '}
                              <strong className="text-[#201D1D]">{order.quantity || 1}</strong>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[13px] text-[#7A808C]">
                            <span>Règlement :</span>
                            <span className="font-bold text-[#201D1D]">
                              {order.paymentType === 'online_wave'
                                ? 'Wave (En ligne)'
                                : order.paymentType === 'online_orange'
                                  ? 'Orange (En ligne)'
                                  : order.paymentType === 'direct'
                                    ? `Direct · ${order.paymentMethodName ?? 'lien du vendeur'}`
                                    : 'Espèces (COD)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {order.items && order.items.length > 1 && (
                        <ul className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] divide-y divide-[#F1F5F9]">
                          {order.items.map((item) => (
                            <li
                              key={item.productId}
                              className="py-1.5 flex items-center gap-2.5 text-[13px]"
                            >
                              <span className="w-8 h-8 rounded-md overflow-hidden bg-[#F1F5F9] shrink-0">
                                {item.image && (
                                  <img
                                    src={item.image}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </span>
                              <span className="flex-1 min-w-0 truncate font-semibold text-[#201D1D]">
                                {item.name}
                              </span>
                              <span className="text-[#7A808C] shrink-0">×{item.quantity}</span>
                              <span className="font-bold text-[#201D1D] shrink-0 tabular-nums">
                                {formatFCFA(item.lineTotal)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {order.paymentStatus === 'pending_direct' && onConfirmDirectPayment && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-[13px] text-amber-800">
                            Le client devait payer via {order.paymentMethodName ?? 'votre lien'}.
                            Vérifiez la réception sur votre compte.
                          </span>
                          <button
                            type="button"
                            onClick={() => onConfirmDirectPayment(order.id)}
                            className="shrink-0 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold cursor-pointer"
                          >
                            J’ai reçu le paiement
                          </button>
                        </div>
                      )}

                      {/* Note vocale ou adresse */}
                      {order.hasVoiceNote && order.voiceNoteUrl ? (
                        <div className="p-2.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[13px] space-y-1.5">
                          <div className="flex items-center justify-between text-[#235BF7] font-bold text-[13px]">
                            <span className="flex items-center gap-1.5">
                              <Volume2 className="w-3.5 h-3.5" /> Note vocale d'adresse
                            </span>
                            <span className="text-[13px]">0:38</span>
                          </div>
                          <audio src={order.voiceNoteUrl} controls className="h-8 w-full rounded" />
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[13px] space-y-1">
                          <span className="text-xs uppercase font-bold text-[#235BF7] flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Adresse précise :
                          </span>
                          <p className="text-[#334155] text-[13px] leading-snug">
                            {order.deliveryAddress || order.neighborhood}
                          </p>
                          {order.deliveryNotes && (
                            <p className="italic text-[#7A808C] text-xs">
                              « {order.deliveryNotes} »
                            </p>
                          )}
                        </div>
                      )}

                      {/* WhatsApp (Noir) + Appel (Bleu) */}
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 rounded-xl bg-[#201D1D] hover:bg-black text-white flex items-center justify-center gap-2 font-bold text-[13px] shadow-xs transition-colors"
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                          <span>WhatsApp</span>
                        </a>

                        <a
                          href={`tel:${cleanPhone}`}
                          className="py-2.5 px-3 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white flex items-center justify-center gap-2 font-bold text-[13px] shadow-xs transition-colors"
                        >
                          <PhoneCall className="w-4 h-4" />
                          <span>Appeler</span>
                        </a>
                      </div>

                      {/* Changement rapide de statut */}
                      <div className="pt-1">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleMoveStatus(order.id, e.target.value as OrderStatus)
                          }
                          aria-label="Statut de la commande"
                          className="w-full bg-white border border-[#CBD5E1] rounded-xl py-2 px-3 text-[13px] font-bold text-[#201D1D] cursor-pointer"
                        >
                          <option value="new">Étape 1 : Nouvelle demande</option>
                          <option value="confirmed">Étape 2 : Confirmé (En route)</option>
                          <option value="delivered">Étape 3 : Livré & Payé</option>
                          <option value="cancelled">Étape 4 : Annulé</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Day folders (finished days) */}
        {!searching && !openDay && dayFolders.length > 0 && (
          <div className="pt-4 space-y-3">
            <h3 className="text-[15px] font-extrabold text-[#201D1D] px-1">Journées précédentes</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {dayFolders.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => {
                    setOpenDay(d.key);
                    setMobileStatusTab('all');
                  }}
                  className="text-left p-4 rounded-2xl bg-white border border-[#ECEFF4] hover:border-[#BFD0FD] hover:bg-[#F7F9FF] transition-colors cursor-pointer"
                >
                  <span className="flex items-center justify-between">
                    <Folder className="w-6 h-6 text-[#235BF7]" />
                    {d.newCount > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#235BF7] text-white">
                        {d.newCount} nouvelle{d.newCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                  <span className="mt-3 block text-[15px] font-bold text-[#201D1D]">{d.label}</span>
                  <span className="block text-[13px] text-[#7A808C]">
                    {d.count} commande{d.count > 1 ? 's' : ''} · {formatFCFA(d.total)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Day of an order (Dakar = UTC all year): "2026-10-04". */
function dayKeyOf(order: OrderLead): string {
  return order.createdAtIso ? order.createdAtIso.slice(0, 10) : todayKey();
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "2026-10-04" → "Dimanche 4 octobre 2026". */
function dayLabel(key: string): string {
  const label = DAY_FORMAT.format(new Date(`${key}T12:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
