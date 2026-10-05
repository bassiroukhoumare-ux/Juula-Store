'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  GripVertical,
  MapPin,
  Package,
  PhoneCall,
  Play,
  Pause,
  Volume2,
  ArrowLeft,
  X,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { OrderLead, OrderStatus } from '@/types/juula';
import { formatFCFA } from '@/lib/orderUtils';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface KanbanCardProps {
  order: OrderLead;
  onMoveStatus: (orderId: string, nextStatus: OrderStatus) => void;
  /** Open this order's detail modal on mount (email "Voir la commande" link). */
  autoOpen?: boolean;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  order,
  onMoveStatus,
  autoOpen = false,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(autoOpen);

  useEffect(() => {
    if (autoOpen) setShowDetailModal(true);
  }, [autoOpen]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isPaidOnline = order.paymentStatus === 'paid';
  const cleanPhone = (order.phone || '').replace(/[^0-9+]/g, '');

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().catch(() => {
        setIsPlayingAudio(false);
      });
      setIsPlayingAudio(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
  };

  const whatsappMessage = encodeURIComponent(
    `Bonjour ${order.customerName} ! C'est la boutique concernant votre commande #${order.id} (${order.productName} - ${formatFCFA(order.totalAmount || order.amount)}). ${
      isPaidOnline
        ? 'Votre paiement Mobile Money est bien validé. '
        : 'Le règlement se fera en espèces ou Wave à la réception. '
    }Pouvez-vous nous confirmer votre disponibilité à ${order.neighborhood} ?`,
  );

  const whatsappUrl = `https://wa.me/${order.whatsappNumber || cleanPhone}?text=${whatsappMessage}`;
  const telUrl = `tel:${cleanPhone}`;

  const getStatusFlow = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return {
          prev: null,
          next: 'confirmed' as OrderStatus,
          nextLabel: 'Confirmer',
          cancel: 'cancelled' as OrderStatus,
        };
      case 'confirmed':
        return {
          prev: 'new' as OrderStatus,
          next: 'delivered' as OrderStatus,
          nextLabel: 'Marquer Livré',
          cancel: 'cancelled' as OrderStatus,
        };
      case 'delivered':
        return {
          prev: 'confirmed' as OrderStatus,
          next: null,
          nextLabel: null,
          cancel: null,
        };
      case 'cancelled':
        return {
          prev: 'new' as OrderStatus,
          next: null,
          nextLabel: null,
          cancel: null,
        };
    }
  };

  const flow = getStatusFlow(order.status);
  const totalDisplay = order.totalAmount || order.amount + (order.deliveryFee || 0);

  // Clean neighborhood text for strict 1-line display
  const shortNeighborhood = (order.neighborhood.split('(')[0] ?? '').trim() || 'Dakar';

  // Clean address or note text preview (single line)
  const messagePreview =
    order.deliveryNotes || order.deliveryAddress?.split(',')[0] || 'Aucune consigne particulière';

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', order.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onClick={() => setShowDetailModal(true)}
        className={`group relative bg-white rounded-2xl p-3.5 transition-all duration-150 space-y-2.5 cursor-grab active:cursor-grabbing select-none ${
          isPaidOnline
            ? 'border-2 border-[#FF7900] ring-2 ring-[#FF7900]/15 shadow-sm bg-gradient-to-b from-[#FFFDFB] to-white hover:border-[#FF7900]'
            : 'border border-[#E2E8F0] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#235BF7]/40'
        }`}
      >
        {/* ======================================================== */}
        {/* LIGNE 1 : ID COMMANDE + HEURE + BADGE PAIEMENT           */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical className="w-3 h-3 text-[#94A3B8] opacity-50 group-hover:opacity-100 group-hover:text-[#235BF7] transition-colors shrink-0" />
            <span className="font-mono font-bold text-[#235BF7] bg-[#EEF3FF] px-2 py-0.5 rounded-md text-[13px] shrink-0">
              {order.id}
            </span>
            <span className="text-[13px] text-[#94A3B8] truncate">{order.createdAt}</span>
          </div>

          {/* Payment Pill Minimalist (Wave / Orange / COD) */}
          <div className="shrink-0">
            {order.paymentType === 'online_wave' && (
              <span className="inline-flex items-center gap-1 text-xs font-black uppercase text-[#FF7900] bg-[#FFF5EB] px-2 py-0.5 rounded-full border border-[#FF7900]/30 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF7900] animate-pulse" />
                Wave • Payé
              </span>
            )}
            {order.paymentType === 'online_orange' && (
              <span className="inline-flex items-center gap-1 text-xs font-black uppercase text-[#FF7900] bg-[#FFF5EB] px-2 py-0.5 rounded-full border border-[#FF7900]/30 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF7900] animate-pulse" />
                OM • Payé
              </span>
            )}
            {order.paymentType === 'cod' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                COD • Espèces
              </span>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* LIGNE 2 : NOM DU CLIENT + QUARTIER + ICÔNES WHATSAPP/APPEL*/}
        {/* ======================================================== */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span
              className="text-[15px] font-extrabold text-[#201D1D] truncate block leading-tight"
              title={order.customerName}
            >
              {order.customerName}
            </span>
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#475569] mt-0.5">
              <MapPin className="w-3 h-3 text-[#235BF7] shrink-0" />
              <span className="truncate max-w-[130px]">{shortNeighborhood}</span>
            </span>
          </div>

          {/* Contact Direct (Icônes seules : WhatsApp Noir & Appel Bleu) */}
          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 shrink-0">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-xl bg-[#201D1D] hover:bg-black text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
              title={`WhatsApp avec ${order.customerName} (${order.whatsappNumber || cleanPhone})`}
              aria-label="Contacter sur WhatsApp"
            >
              <WhatsAppIcon className="w-4 h-4" />
            </a>

            <a
              href={telUrl}
              className="w-8 h-8 rounded-xl bg-[#EEF3FF] hover:bg-[#235BF7] text-[#235BF7] hover:text-white flex items-center justify-center transition-all border border-[#BFDBFE] shadow-xs active:scale-95 cursor-pointer"
              title={`Appeler ${order.customerName} (${cleanPhone})`}
              aria-label="Appeler le client"
            >
              <PhoneCall className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* ======================================================== */}
        {/* LIGNE 3 : PRODUIT AVEC IMAGE RÉELLE + QUANTITÉ + PRIX    */}
        {/* ======================================================== */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
          {order.productImage ? (
            <img
              src={order.productImage}
              alt={order.productName}
              className="w-11 h-11 rounded-lg object-cover bg-white shrink-0 border border-[#CBD5E1]"
            />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-[#EEF3FF] flex items-center justify-center shrink-0 border border-[#DBEAFE]">
              <Package className="w-5 h-5 text-[#235BF7]" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <span
              className="text-[13px] font-bold text-[#201D1D] block truncate"
              title={order.productName}
            >
              {order.productName}
            </span>
            <div className="flex items-center justify-between text-[13px] mt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-[#475569] bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0] shadow-2xs">
                  Qté : <strong className="text-[#201D1D]">{order.quantity || 1}</strong>
                </span>
                {order.selectedColor && (
                  <span className="text-xs font-bold text-[#235BF7] bg-[#EEF3FF] px-1.5 py-0.5 rounded border border-[#BFDBFE]">
                    {order.selectedColor}
                  </span>
                )}
              </div>
              <span className="font-black text-[#201D1D] text-[13px]">
                {formatFCFA(totalDisplay)}
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* LIGNE 4 : NOTE VOCALE AUDIO OU MESSAGE D'ADRESSE         */}
        {/* ======================================================== */}
        {order.hasVoiceNote && order.voiceNoteUrl ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between p-2 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[13px]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={toggleAudio}
                className="w-7 h-7 rounded-lg bg-[#235BF7] hover:bg-[#1B4AD6] text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer"
                title={isPlayingAudio ? 'Mettre en pause' : 'Écouter la note vocale'}
              >
                {isPlayingAudio ? (
                  <Pause className="w-3 h-3 fill-current" />
                ) : (
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                )}
              </button>
              <div className="min-w-0">
                <span className="text-[13px] font-bold text-[#235BF7] block truncate">
                  Note vocale client
                </span>
                <span className="text-xs text-[#7A808C] flex items-center gap-1">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      isPlayingAudio ? 'bg-emerald-500 animate-pulse' : 'bg-[#94A3B8]'
                    }`}
                  />
                  {isPlayingAudio ? 'En lecture...' : 'Repères audio'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[13px] font-bold text-[#235BF7] shrink-0">
              <Volume2 className="w-3 h-3" />
              <span>0:38</span>
            </div>

            <audio
              ref={audioRef}
              src={order.voiceNoteUrl}
              onEnded={handleAudioEnded}
              className="hidden"
            />
          </div>
        ) : (
          <div
            onClick={() => setShowDetailModal(true)}
            className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] text-[#7A808C] hover:text-[#201D1D] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            title="Cliquer pour afficher les détails complets"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <MessageSquare className="w-3 h-3 text-[#235BF7] shrink-0" />
              <span className="truncate italic">« {messagePreview} »</span>
            </div>
            <ChevronRight className="w-3 h-3 text-[#94A3B8] shrink-0 ml-1" />
          </div>
        )}

        {/* ======================================================== */}
        {/* LIGNE 5 : TRANSITION D'ÉTAPE PIPELINE (ICÔNES SEULES)    */}
        {/* (AUCUN DÉBORDEMENT TEXTUEL - ESPACE RÉDUIT AU MINIMUM)   */}
        {/* ======================================================== */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between"
        >
          {/* Bouton Retour (Icône seule) */}
          {flow.prev ? (
            <button
              type="button"
              onClick={() => onMoveStatus(order.id, flow.prev!)}
              className="w-8 h-8 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#7A808C] hover:text-[#201D1D] hover:bg-[#F1F5F9] transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
              title="Revenir à l'étape précédente"
              aria-label="Étape précédente"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}

          {/* Boutons d'action droite (Icônes seules : Annuler et Valider) */}
          <div className="flex items-center gap-1.5">
            {flow.cancel && (
              <button
                type="button"
                onClick={() => onMoveStatus(order.id, flow.cancel!)}
                className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-500 hover:text-white hover:bg-rose-600 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                title="Annuler la commande"
                aria-label="Annuler la commande"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}

            {order.status === 'new' && (
              <button
                type="button"
                onClick={() => onMoveStatus(order.id, 'confirmed')}
                className="w-8 h-8 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white transition-all flex items-center justify-center shadow-xs active:scale-95 cursor-pointer"
                title="Confirmer la commande (Passer en route)"
                aria-label="Confirmer la commande"
              >
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            )}

            {order.status === 'confirmed' && (
              <button
                type="button"
                onClick={() => onMoveStatus(order.id, 'delivered')}
                className="w-8 h-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center justify-center shadow-xs active:scale-95 cursor-pointer border border-emerald-600"
                title="Marquer comme livré et encaissé"
                aria-label="Marquer comme livré et encaissé"
              >
                <CheckCircle2 className="w-4.5 h-4.5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL DÉTAILS COMPLETS DE LA COMMANDE                    */}
      {/* (PERMET DE GARDER LA CARTE MINIMALISTE SANS PERDRE D'INFO)*/}
      {/* ======================================================== */}
      {showDetailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[28px] p-6 w-full max-w-md border border-[#E2E8F0] shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div>
                <span className="font-mono text-[13px] font-bold text-[#235BF7] bg-[#EEF3FF] px-2.5 py-0.5 rounded-md">
                  {order.id}
                </span>
                <h3 className="text-base font-black text-[#201D1D] mt-1">{order.customerName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-full text-[#7A808C] hover:text-[#201D1D] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informations Produit & Total avec Image */}
            <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-[13px]">
              <div className="flex items-center gap-3">
                {order.productImage ? (
                  <img
                    src={order.productImage}
                    alt={order.productName}
                    className="w-12 h-12 rounded-xl object-cover bg-white shrink-0 border border-[#CBD5E1]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#EEF3FF] flex items-center justify-center shrink-0 border border-[#DBEAFE]">
                    <Package className="w-5 h-5 text-[#235BF7]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-[#201D1D] block truncate">
                    {order.productName}
                  </span>
                  <div className="flex items-center justify-between text-[13px] text-[#7A808C] mt-1">
                    <span className="font-bold bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                      Quantité commandée :{' '}
                      <strong className="text-[#201D1D]">{order.quantity || 1}</strong>
                    </span>
                    <span className="text-[#235BF7] font-black text-[15px]">
                      {formatFCFA(totalDisplay)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[#7A808C] text-[13px] pt-1.5 border-t border-[#E2E8F0]">
                <span>Téléphone client :</span>
                <span className="font-bold text-[#201D1D] font-mono">{order.phone}</span>
              </div>
              <div className="flex items-center justify-between text-[#7A808C] text-[13px]">
                <span>Règlement :</span>
                <span className="font-bold text-[#201D1D]">
                  {order.paymentType === 'online_wave'
                    ? 'Wave (Payé en ligne)'
                    : order.paymentType === 'online_orange'
                      ? 'Orange Money (Payé en ligne)'
                      : 'Espèces à la livraison (COD)'}
                </span>
              </div>
            </div>

            {/* Adresse et Repères */}
            <div className="space-y-1 text-[13px]">
              <span className="font-bold text-[#201D1D] flex items-center gap-1 text-[13px] uppercase tracking-wide">
                <MapPin className="w-3.5 h-3.5 text-[#235BF7]" />
                Adresse de livraison & Repères
              </span>
              <p className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] text-[13px] leading-relaxed">
                {order.deliveryAddress || order.neighborhood}
              </p>
              {order.deliveryNotes && (
                <p className="italic text-[#7A808C] text-[13px] px-1">« {order.deliveryNotes} »</p>
              )}
            </div>

            {/* Note Vocale */}
            {order.hasVoiceNote && order.voiceNoteUrl && (
              <div className="p-3 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] space-y-2">
                <div className="flex items-center justify-between text-[13px] font-bold text-[#235BF7]">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4" />
                    Note vocale d'adresse du client
                  </span>
                  <span>0:38</span>
                </div>
                <audio src={order.voiceNoteUrl} controls className="w-full h-8 rounded" />
              </div>
            )}

            {/* Actions Rapides */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-[#201D1D] hover:bg-black text-white font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>

              <a
                href={telUrl}
                className="py-2.5 px-3 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Appeler</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
