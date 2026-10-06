'use client';

import { SkeletonList } from '@/components/ui/Skeleton';
import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCheck,
  CircleDollarSign,
  Clock,
  Loader2,
  MailOpen,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import type { MerchantNotification } from '@/lib/store/notification-types';

interface NotificationsViewProps {
  items: MerchantNotification[] | null;
  unread: number;
  onAction: (keys: string[] | 'all', action: 'read' | 'unread' | 'delete') => Promise<void>;
  onOpen: (n: MerchantNotification) => void;
}

const KIND: Record<MerchantNotification['kind'], { icon: React.ReactNode; tone: string }> = {
  order: { icon: <ShoppingBag className="w-5 h-5" />, tone: 'bg-[#EEF3FF] text-[#235BF7]' },
  payment: {
    icon: <CircleDollarSign className="w-5 h-5" />,
    tone: 'bg-emerald-50 text-emerald-600',
  },
  action: { icon: <Clock className="w-5 h-5" />, tone: 'bg-amber-50 text-amber-700' },
  alert: { icon: <AlertTriangle className="w-5 h-5" />, tone: 'bg-[#FEF2F2] text-[#DC2626]' },
  info: { icon: <Bell className="w-5 h-5" />, tone: 'bg-[#F1F3F6] text-[#3F4654]' },
};

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  items,
  unread,
  onAction,
  onOpen,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (id: string, keys: string[] | 'all', action: 'read' | 'unread' | 'delete') => {
    setBusy(id);
    try {
      await onAction(keys, action);
    } finally {
      setBusy(null);
    }
  };

  if (!items) {
    return (
      <div className="max-w-3xl">
        <SkeletonList rows={5} />
      </div>
    );
  }

  const visible = filter === 'unread' ? items.filter((n) => !n.read) : items;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`h-10 px-4 rounded-xl text-[14px] font-semibold border cursor-pointer ${
                filter === f
                  ? 'bg-[#201D1D] text-white border-[#201D1D]'
                  : 'bg-white text-[#3F4654] border-[#E3E7EE]'
              }`}
            >
              {f === 'all' ? `Toutes (${items.length})` : `Non lues (${unread})`}
            </button>
          ))}
        </div>
        {unread > 0 && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run('all', 'all', 'read')}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-[#E3E7EE] text-[14px] font-semibold text-[#235BF7] hover:bg-[#F6F7F9] cursor-pointer"
          >
            {busy === 'all' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Tout marquer comme lu
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="py-16 px-6 rounded-[28px] bg-white border border-[#ECEFF4] text-center">
          <span className="mx-auto w-12 h-12 rounded-2xl bg-[#F6F7F9] text-[#9AA0AB] flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </span>
          <p className="mt-3 font-bold text-[#201D1D]">
            {filter === 'unread' ? 'Tout est lu' : 'Aucune notification'}
          </p>
          <p className="mt-1 text-[14px] text-[#7A808C]">
            Vos nouvelles commandes, paiements et retraits apparaîtront ici.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((n) => {
            const kind = KIND[n.kind];
            return (
              <li
                key={n.key}
                className={`p-4 sm:p-5 rounded-[22px] border transition-colors ${
                  n.read ? 'bg-white border-[#ECEFF4]' : 'bg-[#F7F9FF] border-[#DFE8FF]'
                }`}
              >
                <div className="flex gap-3.5">
                  <span
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${kind.tone}`}
                  >
                    {kind.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-[15px] text-[#201D1D]">
                        {!n.read && (
                          <span className="inline-block w-2 h-2 rounded-full bg-[#235BF7] mr-2 align-middle" />
                        )}
                        {n.title}
                      </p>
                      <span className="text-[13px] text-[#9AA0AB] shrink-0">{n.when}</span>
                    </div>
                    <p className="text-[14px] text-[#3F4654]">{n.summary}</p>
                    <ul className="mt-2 space-y-0.5 text-[13px] text-[#7A808C]">
                      {n.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpen(n)}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[13px] font-semibold cursor-pointer"
                      >
                        {n.target.tab === 'wallet' ? 'Voir mes finances' : 'Voir la commande'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void run(n.key, [n.key], n.read ? 'unread' : 'read')}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#E3E7EE] text-[13px] font-semibold text-[#3F4654] hover:bg-white cursor-pointer"
                      >
                        <MailOpen className="w-3.5 h-3.5" />
                        {n.read ? 'Marquer non lu' : 'Marquer comme lu'}
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void run(n.key, [n.key], 'delete')}
                        aria-label="Supprimer la notification"
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[13px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        {busy === n.key ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
