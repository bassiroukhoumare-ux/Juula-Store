'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Table as TableIcon,
  PhoneCall,
  Play,
  Pause,
  Volume2,
  MapPin,
  Package,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronDown,
} from 'lucide-react';
import { OrderLead, OrderStatus } from '@/types/juula';
import { KanbanColumn } from './KanbanColumn';
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
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  orders,
  onOrdersChange,
  focusOrderId = null,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'online' | 'cod'>('all');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
  const [mobileStatusTab, setMobileStatusTab] = useState<'all' | OrderStatus>('all');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'table'>('kanban');

  // Global audio player state for List & Table views
  const [activeAudioOrderId, setActiveAudioOrderId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayAudio = (orderId: string, url: string) => {
    if (activeAudioOrderId === orderId) {
      audioPlayerRef.current?.pause();
      setActiveAudioOrderId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        audioPlayerRef.current.play().catch(() => setActiveAudioOrderId(null));
        setActiveAudioOrderId(orderId);
      }
    }
  };

  const handleMoveStatus = (orderId: string, nextStatus: OrderStatus) => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o));
    onOrdersChange(updated);
  };

  // Deep link: expand the order (mobile list) and bring it into view.
  useEffect(() => {
    if (!focusOrderId) return;
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

    const matchesNeighborhood =
      selectedNeighborhood === 'all' ||
      order.neighborhood.toLowerCase().includes(selectedNeighborhood.toLowerCase());

    const matchesPayment =
      paymentFilter === 'all'
        ? true
        : paymentFilter === 'online'
          ? order.paymentType === 'online_wave' || order.paymentType === 'online_orange'
          : order.paymentType === 'cod';

    return matchesQuery && matchesNeighborhood && matchesPayment;
  });

  const columnsConfig: {
    id: OrderStatus;
    title: string;
    accentColor: string;
    badgeBg: string;
    badgeText: string;
  }[] = [
    {
      id: 'new',
      title: 'Nouvelle demande',
      accentColor: '#235BF7',
      badgeBg: '#235BF7',
      badgeText: '#FFFFFF',
    },
    {
      id: 'confirmed',
      title: 'Confirmé (En route)',
      accentColor: '#0EA5E9',
      badgeBg: '#EFF6FF',
      badgeText: '#0284C7',
    },
    {
      id: 'delivered',
      title: 'Livré & Payé',
      accentColor: '#10B981',
      badgeBg: '#ECFDF5',
      badgeText: '#059669',
    },
    {
      id: 'cancelled',
      title: 'Annulé',
      accentColor: '#E11D48',
      badgeBg: '#FFF1F2',
      badgeText: '#BE123C',
    },
  ];

  const onlineOrdersCount = orders.filter(
    (o) => o.paymentType === 'online_wave' || o.paymentType === 'online_orange',
  ).length;
  const codOrdersCount = orders.filter((o) => o.paymentType === 'cod').length;

  const mobileOrders = filteredOrders.filter((o) =>
    mobileStatusTab === 'all' ? true : o.status === mobileStatusTab,
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Hidden audio player for list/table view playback */}
      <audio ref={audioPlayerRef} onEnded={() => setActiveAudioOrderId(null)} className="hidden" />

      {/* ======================================================== */}
      {/* 1. TOP HEADER & KPI FILTERS (ÉPURÉ, CONTEMPORAIN)        */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#235BF7] bg-[#EEF3FF] px-2.5 py-0.5 rounded-md">
              Pipeline Logistique
            </span>
            <span className="text-xs text-[#7A808C] font-semibold">
              {orders.length} commandes enregistrées
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#201D1D] tracking-tight mt-1">
            Commandes Cash on Delivery & En Ligne
          </h2>
          <p className="text-xs text-[#7A808C] mt-0.5">
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
            <span className="text-[10px] uppercase font-bold tracking-wider">Toutes</span>
            <span
              className={`text-xs font-black px-2 py-0.5 rounded-full ${
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
            <span className="text-[10px] uppercase font-bold tracking-wider">En Ligne</span>
            <span
              className={`text-xs font-black px-2 py-0.5 rounded-full ${
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
            <span className="text-[10px] uppercase font-bold tracking-wider truncate">
              COD Espèces
            </span>
            <span
              className={`text-xs font-black px-2 py-0.5 rounded-full ${
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher client, tél, quartier..."
            icon={<Search className="w-4 h-4 text-[#94A3B8]" />}
          />
        </div>

        {/* Secteurs / Quartiers Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
          {['all', 'Almadies', 'Mermoz', 'Plateau', 'Point E', 'Yoff'].map((nh) => (
            <button
              key={nh}
              type="button"
              onClick={() => setSelectedNeighborhood(nh)}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer
                ${
                  selectedNeighborhood === nh
                    ? 'bg-[#235BF7] text-white shadow-xs'
                    : 'bg-white border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC]'
                }
              `}
            >
              {nh === 'all' ? 'Tous les secteurs' : nh}
            </button>
          ))}
        </div>

        {/* Disposition Switcher (Nouvelle disposition demandée par l'utilisateur) */}
        <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-2xl border border-[#E2E8F0] shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-white text-[#235BF7] shadow-xs'
                : 'text-[#7A808C] hover:text-[#201D1D]'
            }`}
            title="Disposition en colonnes Kanban"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Colonnes</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-[#235BF7] shadow-xs'
                : 'text-[#7A808C] hover:text-[#201D1D]'
            }`}
            title="Disposition en liste logistique épurée"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Liste Épurée</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-[#235BF7] shadow-xs'
                : 'text-[#7A808C] hover:text-[#201D1D]'
            }`}
            title="Disposition en tableau CRM détaillé"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tableau</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. DISPOSITION 1 : COLONNES PIPELINE KANBAN (DÉFAUT)     */}
      {/* ======================================================== */}
      {viewMode === 'kanban' && (
        <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
          {columnsConfig.map((col) => {
            const colOrders = filteredOrders.filter((o) => o.status === col.id);
            return (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                orders={colOrders}
                onMoveStatus={handleMoveStatus}
                accentColor={col.accentColor}
                badgeBg={col.badgeBg}
                badgeText={col.badgeText}
                focusOrderId={focusOrderId}
              />
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. DISPOSITION 2 : LISTE LOGISTIQUE ÉPURÉE (LIGNES CLAIRES)*/}
      {/* (RÉPOND EXACTEMENT À LA DEMANDE DE SIMPLICITÉ & 1 LIGNE)   */}
      {/* ======================================================== */}
      {viewMode === 'list' && (
        <div className="hidden md:block space-y-2.5">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-[28px] p-12 text-center text-xs text-[#94A3B8] border border-[#ECEFF4]">
              Aucune commande ne correspond aux filtres.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const cleanPhone = (order.phone || '').replace(/[^0-9+]/g, '');
              const waMsg = encodeURIComponent(
                `Bonjour ${order.customerName} ! Boutique concernant votre commande #${order.id} (${order.productName} - ${formatFCFA(order.totalAmount || order.amount)}). Pouvez-vous nous confirmer votre disponibilité à ${order.neighborhood} ?`,
              );
              const totalVal = order.totalAmount || order.amount + (order.deliveryFee || 0);
              const isPlaying = activeAudioOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl p-4 transition-all flex items-center justify-between gap-4 ${
                    order.paymentStatus === 'paid'
                      ? 'border-2 border-[#FF7900] ring-1 ring-[#FF7900]/20 shadow-xs'
                      : 'border border-[#E2E8F0] shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-[#235BF7]/40 hover:shadow-md'
                  }`}
                >
                  {/* Section 1 : Statut + ID + Date */}
                  <div className="flex items-center gap-3 w-48 shrink-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        order.status === 'new'
                          ? 'bg-[#235BF7]'
                          : order.status === 'confirmed'
                            ? 'bg-[#0EA5E9]'
                            : order.status === 'delivered'
                              ? 'bg-[#10B981]'
                              : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#235BF7] bg-[#EEF3FF] px-2 py-0.5 rounded-md">
                          {order.id}
                        </span>
                        <span className="text-[11px] text-[#94A3B8]">{order.createdAt}</span>
                      </div>
                      <span className="text-[11px] font-bold text-[#475569] block mt-0.5">
                        {order.status === 'new'
                          ? 'Nouvelle'
                          : order.status === 'confirmed'
                            ? 'En route'
                            : order.status === 'delivered'
                              ? 'Livré & Payé'
                              : 'Annulé'}
                      </span>
                    </div>
                  </div>

                  {/* Section 2 : Client & Quartier (Strictement 1 ligne) */}
                  <div className="w-52 shrink-0 min-w-0">
                    <span
                      className="font-extrabold text-sm text-[#201D1D] block truncate"
                      title={order.customerName}
                    >
                      {order.customerName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#235BF7] font-semibold truncate max-w-full">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {(order.neighborhood.split('(')[0] ?? '').trim()}
                      </span>
                    </span>
                  </div>

                  {/* Section 3 : Note Vocale OU Message Adresse */}
                  <div className="flex-1 min-w-[200px] max-w-[280px]">
                    {order.hasVoiceNote && order.voiceNoteUrl ? (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(order.id, order.voiceNoteUrl!)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isPlaying
                            ? 'bg-[#235BF7] text-white shadow-xs'
                            : 'bg-[#EFF6FF] text-[#235BF7] hover:bg-[#DBEAFE]'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span>Pause (0:38)</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Écouter vocal (0:38)</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span
                        className="text-[11px] text-[#7A808C] italic block truncate"
                        title={order.deliveryNotes || order.deliveryAddress}
                      >
                        « {order.deliveryNotes || order.deliveryAddress || 'Aucune consigne'} »
                      </span>
                    )}
                  </div>

                  {/* Section 4 : Produit (Image + Quantité) & Montant Net */}
                  <div className="w-60 shrink-0 flex items-center gap-3">
                    {order.productImage ? (
                      <img
                        src={order.productImage}
                        alt={order.productName}
                        className="w-10 h-10 rounded-lg object-cover bg-white shrink-0 border border-[#CBD5E1]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#EEF3FF] flex items-center justify-center shrink-0 border border-[#DBEAFE]">
                        <Package className="w-5 h-5 text-[#235BF7]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-sm text-[#201D1D] whitespace-nowrap">
                          {formatFCFA(totalVal)}
                        </span>
                        <span className="text-[10px] font-bold text-[#475569] bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#E2E8F0]">
                          x{order.quantity || 1}
                        </span>
                      </div>
                      <span
                        className="text-[11px] text-[#7A808C] block truncate"
                        title={order.productName}
                      >
                        {order.productName}
                      </span>
                    </div>
                  </div>

                  {/* Section 5 : Mode de règlement */}
                  <div className="w-32 shrink-0">
                    {order.paymentType === 'online_wave' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#235BF7] bg-[#EEF3FF] px-2 py-1 rounded-lg">
                        <CreditCard className="w-3 h-3" />
                        <span>Wave Validé</span>
                      </span>
                    )}
                    {order.paymentType === 'online_orange' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EA580C] bg-[#FFF5EB] px-2 py-1 rounded-lg">
                        <Smartphone className="w-3 h-3" />
                        <span>Orange Validé</span>
                      </span>
                    )}
                    {order.paymentType === 'cod' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-1 rounded-lg">
                        <Banknote className="w-3 h-3" />
                        <span>COD Espèces</span>
                      </span>
                    )}
                  </div>

                  {/* Section 6 : Actions Directes (WhatsApp + Appel) & Sélecteur Statut */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`https://wa.me/${order.whatsappNumber || cleanPhone}?text=${waMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#201D1D] hover:bg-black text-white shadow-xs transition-colors cursor-pointer"
                      title={`WhatsApp avec ${order.customerName}`}
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                    </a>

                    <a
                      href={`tel:${cleanPhone}`}
                      className="p-2 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white shadow-xs transition-colors cursor-pointer"
                      title={`Appeler ${order.customerName} (${cleanPhone})`}
                    >
                      <PhoneCall className="w-4 h-4" />
                    </a>

                    <select
                      value={order.status}
                      onChange={(e) => handleMoveStatus(order.id, e.target.value as OrderStatus)}
                      aria-label="Statut de la commande"
                      className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#334155] cursor-pointer focus:outline-none focus:border-[#235BF7]"
                    >
                      <option value="new">Nouvelle</option>
                      <option value="confirmed">En route</option>
                      <option value="delivered">Livré & Payé</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. DISPOSITION 3 : TABLEAU CRM DÉTAILLÉ                   */}
      {/* ======================================================== */}
      {viewMode === 'table' && (
        <div className="hidden md:block bg-white rounded-[28px] border border-[#ECEFF4] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[#7A808C] font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Commande</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Quartier & Consignes</th>
                  <th className="py-3.5 px-4">Produit</th>
                  <th className="py-3.5 px-4">Règlement</th>
                  <th className="py-3.5 px-4">Total Net</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions Directes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#94A3B8]">
                      Aucune commande ne correspond aux filtres.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const cleanPhone = (order.phone || '').replace(/[^0-9+]/g, '');
                    const waMsg = encodeURIComponent(
                      `Bonjour ${order.customerName} ! Concernant votre commande #${order.id} (${order.productName} - ${formatFCFA(order.totalAmount || order.amount)}). Pouvez-vous nous confirmer votre disponibilité ?`,
                    );
                    const totalVal = order.totalAmount || order.amount + (order.deliveryFee || 0);
                    const isPlaying = activeAudioOrderId === order.id;

                    return (
                      <tr key={order.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#235BF7] whitespace-nowrap">
                          {order.id}
                          <span className="block font-sans font-normal text-[10px] text-[#94A3B8]">
                            {order.createdAt}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-extrabold text-[#201D1D] block truncate max-w-[150px]">
                            {order.customerName}
                          </span>
                          <span className="text-[11px] text-[#7A808C]">{order.phone}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 font-semibold text-[#334155] whitespace-nowrap">
                            <MapPin className="w-3 h-3 text-[#235BF7] shrink-0" />
                            <span className="truncate max-w-[140px]">{order.neighborhood}</span>
                          </div>
                          {order.hasVoiceNote && order.voiceNoteUrl ? (
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(order.id, order.voiceNoteUrl!)}
                              className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#235BF7] bg-[#EEF3FF] hover:bg-[#DBEAFE] px-2 py-0.5 rounded-full cursor-pointer"
                            >
                              {isPlaying ? (
                                <Pause className="w-3 h-3 fill-current" />
                              ) : (
                                <Play className="w-3 h-3 fill-current" />
                              )}
                              <span>Note vocale (0:38)</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#94A3B8] italic block truncate max-w-[160px] mt-0.5">
                              {order.deliveryNotes || 'Standard'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5 max-w-[220px]">
                            {order.productImage ? (
                              <img
                                src={order.productImage}
                                alt={order.productName}
                                className="w-9 h-9 rounded-lg object-cover bg-white shrink-0 border border-[#CBD5E1]"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-[#EEF3FF] flex items-center justify-center shrink-0 border border-[#DBEAFE]">
                                <Package className="w-4 h-4 text-[#235BF7]" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <span
                                className="text-xs font-bold text-[#201D1D] block truncate"
                                title={order.productName}
                              >
                                {order.productName}
                              </span>
                              <span className="text-[10px] font-semibold text-[#7A808C]">
                                Qté :{' '}
                                <strong className="text-[#201D1D]">{order.quantity || 1}</strong>
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {order.paymentType === 'online_wave' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#235BF7]">
                              <CreditCard className="w-3 h-3" />
                              Wave (Validé)
                            </span>
                          )}
                          {order.paymentType === 'online_orange' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EA580C]">
                              <Smartphone className="w-3 h-3" />
                              Orange (Validé)
                            </span>
                          )}
                          {order.paymentType === 'cod' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669]">
                              <Banknote className="w-3 h-3" />
                              Espèces (COD)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-black text-[#201D1D] whitespace-nowrap">
                          {formatFCFA(totalVal)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleMoveStatus(order.id, e.target.value as OrderStatus)
                            }
                            aria-label="Statut de la commande"
                            className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs font-bold text-[#334155] cursor-pointer focus:outline-none focus:border-[#235BF7]"
                          >
                            <option value="new">Nouvelle</option>
                            <option value="confirmed">Confirmé</option>
                            <option value="delivered">Livré & Payé</option>
                            <option value="cancelled">Annulé</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`https://wa.me/${order.whatsappNumber || cleanPhone}?text=${waMsg}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-xl bg-[#201D1D] hover:bg-black text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                              title={`WhatsApp avec ${order.customerName}`}
                              aria-label="WhatsApp"
                            >
                              <WhatsAppIcon className="w-4 h-4" />
                            </a>
                            <a
                              href={`tel:${cleanPhone}`}
                              className="w-8 h-8 rounded-xl bg-[#EEF3FF] hover:bg-[#235BF7] text-[#235BF7] hover:text-white flex items-center justify-center transition-colors border border-[#BFDBFE] shadow-xs cursor-pointer"
                              title={`Appeler ${order.customerName}`}
                              aria-label="Appeler"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. VUE MOBILE ULTRA-RESPONSIVE (ACCORDÉON ÉPURÉ)         */}
      {/* ======================================================== */}
      <div className="md:hidden space-y-3">
        {/* Pills de filtre statut mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all' as const, label: 'Toutes', count: filteredOrders.length },
            {
              id: 'new' as const,
              label: 'Nouvelles',
              count: filteredOrders.filter((o) => o.status === 'new').length,
            },
            {
              id: 'confirmed' as const,
              label: 'En route',
              count: filteredOrders.filter((o) => o.status === 'confirmed').length,
            },
            {
              id: 'delivered' as const,
              label: 'Livrées',
              count: filteredOrders.filter((o) => o.status === 'delivered').length,
            },
            {
              id: 'cancelled' as const,
              label: 'Annulées',
              count: filteredOrders.filter((o) => o.status === 'cancelled').length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileStatusTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                mobileStatusTab === tab.id
                  ? 'bg-[#235BF7] text-white shadow-xs'
                  : 'bg-white border border-[#E2E8F0] text-[#7A808C]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
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
            <div className="bg-white rounded-2xl p-6 text-center text-xs text-[#94A3B8] border border-[#ECEFF4]">
              Aucune commande trouvée pour ces critères.
            </div>
          ) : (
            mobileOrders.map((order) => {
              const isExpanded = !!expandedOrders[order.id];
              const isPaidOnline =
                order.paymentStatus === 'paid' ||
                order.paymentType === 'online_wave' ||
                order.paymentType === 'online_orange';
              const cleanPhone = (order.phone || '').replace(/[^0-9+]/g, '');
              const whatsappUrl = `https://wa.me/${order.whatsappNumber || cleanPhone}?text=${encodeURIComponent(
                `Bonjour ${order.customerName} ! Boutique concernant votre commande #${order.id} (${order.productName}). Pouvez-vous nous confirmer votre heure de livraison à ${order.neighborhood} ?`,
              )}`;

              return (
                <div
                  key={order.id}
                  id={`order-${order.id}`}
                  className={`bg-white rounded-2xl border shadow-xs overflow-hidden transition-all ${order.id === focusOrderId ? 'ring-2 ring-[#235BF7] ' : ''}${
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
                        <span className="font-mono text-[11px] font-bold text-[#235BF7] bg-[#EEF3FF] px-1.5 py-0.5 rounded">
                          {order.id}
                        </span>
                        {isPaidOnline && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#FF7900] text-white">
                            Payé
                          </span>
                        )}
                        <span className="text-[11px] text-[#94A3B8]">{order.createdAt}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <h4 className="text-xs font-black text-[#201D1D] truncate">
                          {order.customerName}
                        </h4>
                        <span className="text-xs font-black text-[#201D1D] whitespace-nowrap">
                          {formatFCFA(order.totalAmount || order.amount + (order.deliveryFee || 0))}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#7A808C] mt-0.5">
                        <MapPin className="w-3 h-3 text-[#235BF7] shrink-0" />
                        <span className="truncate">
                          {(order.neighborhood.split('(')[0] ?? '').trim()}
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
                              className="font-bold text-[#201D1D] text-xs truncate"
                              title={order.productName}
                            >
                              {order.productName}
                            </span>
                            <span className="text-[10px] font-bold text-[#475569] bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#E2E8F0] shrink-0">
                              Qté :{' '}
                              <strong className="text-[#201D1D]">{order.quantity || 1}</strong>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#7A808C]">
                            <span>Règlement :</span>
                            <span className="font-bold text-[#201D1D]">
                              {order.paymentType === 'online_wave'
                                ? 'Wave (En ligne)'
                                : order.paymentType === 'online_orange'
                                  ? 'Orange (En ligne)'
                                  : 'Espèces (COD)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Note vocale ou adresse */}
                      {order.hasVoiceNote && order.voiceNoteUrl ? (
                        <div className="p-2.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[#235BF7] font-bold text-xs">
                            <span className="flex items-center gap-1.5">
                              <Volume2 className="w-3.5 h-3.5" /> Note vocale d'adresse
                            </span>
                            <span className="text-[11px]">0:38</span>
                          </div>
                          <audio src={order.voiceNoteUrl} controls className="h-8 w-full rounded" />
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs space-y-1">
                          <span className="text-[10px] uppercase font-bold text-[#235BF7] flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Adresse précise :
                          </span>
                          <p className="text-[#334155] text-[11px] leading-snug">
                            {order.deliveryAddress || order.neighborhood}
                          </p>
                          {order.deliveryNotes && (
                            <p className="italic text-[#7A808C] text-[10px]">
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
                          className="py-2.5 px-3 rounded-xl bg-[#201D1D] hover:bg-black text-white flex items-center justify-center gap-2 font-bold text-xs shadow-xs transition-colors"
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                          <span>WhatsApp</span>
                        </a>

                        <a
                          href={`tel:${cleanPhone}`}
                          className="py-2.5 px-3 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white flex items-center justify-center gap-2 font-bold text-xs shadow-xs transition-colors"
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
                          className="w-full bg-white border border-[#CBD5E1] rounded-xl py-2 px-3 text-xs font-bold text-[#201D1D] cursor-pointer"
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
      </div>
    </div>
  );
};
