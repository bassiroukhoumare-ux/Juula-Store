'use client';

import React, { useState } from 'react';
import { OrderLead, OrderStatus } from '@/types/juula';
import { KanbanCard } from './KanbanCard';
import { formatFCFA } from '@/lib/orderUtils';

interface KanbanColumnProps {
  id: OrderStatus;
  title: string;
  orders: OrderLead[];
  onMoveStatus: (orderId: string, nextStatus: OrderStatus) => void;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  focusOrderId?: string | null | undefined;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  orders,
  onMoveStatus,
  accentColor,
  badgeBg,
  badgeText,
  focusOrderId,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const totalAmount = orders.reduce(
    (sum, o) => sum + (o.totalAmount || o.amount + (o.deliveryFee || 0)),
    0,
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const orderId = e.dataTransfer.getData('text/plain');
    if (orderId) {
      onMoveStatus(orderId, id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex-1 min-w-[300px] max-w-[360px] bg-[#F8FAFC] border rounded-[28px] p-4 flex flex-col h-[calc(100vh-210px)] transition-all duration-200
        ${
          isDragOver
            ? 'border-[#235BF7] ring-2 ring-[#235BF7]/20 bg-[#EEF3FF] scale-[1.01]'
            : 'border-[#ECEFF4] shadow-xs'
        }
      `}
    >
      {/* Column Header */}
      <div className="pb-3 mb-3 border-b border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <h3 className="text-sm font-extrabold text-[#201D1D] tracking-tight">{title}</h3>
        </div>

        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: badgeBg, color: badgeText }}
        >
          {orders.length}
        </span>
      </div>

      {/* Sub-header with total amount */}
      <div className="flex items-center justify-between text-[11px] text-[#7A808C] px-1 mb-3">
        <span>Total de l'étape :</span>
        <span className="font-extrabold text-[#201D1D]">{formatFCFA(totalAmount)}</span>
      </div>

      {/* Card List Scrollable */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {orders.length === 0 ? (
          <div
            className={`
              h-44 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 text-center transition-colors
              ${isDragOver ? 'border-[#235BF7] bg-white' : 'border-[#CBD5E1]'}
            `}
          >
            <p className="text-xs text-[#94A3B8] font-medium">
              {isDragOver ? 'Déposer la commande ici' : 'Glissez une commande ici'}
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <KanbanCard
              key={order.id}
              order={order}
              onMoveStatus={onMoveStatus}
              autoOpen={order.id === focusOrderId}
            />
          ))
        )}
      </div>
    </div>
  );
};
