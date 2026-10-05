'use client';

import React from 'react';
import { Globe2, Share2, UserX } from 'lucide-react';
import type { StoreAnalytics } from '@/lib/store/analytics-types';

const SOURCE_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  tiktok: '#111111',
  whatsapp: '#25D366',
  google: '#EA4335',
  youtube: '#FF0000',
  snapchat: '#F7CB00',
  twitter: '#111111',
  linkedin: '#0A66C2',
  telegram: '#26A5E4',
  direct: '#235BF7',
};

export const StatTile: React.FC<{ label: string; value: string; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <div className="min-w-0 p-4 rounded-2xl bg-white border border-[#ECEFF4]">
    <p className="text-[13px] font-semibold text-[#7A808C] truncate">{label}</p>
    <p className="mt-1 text-xl sm:text-2xl font-extrabold text-[#201D1D] tracking-tight tabular-nums">
      {value}
    </p>
    {hint && <p className="mt-0.5 text-xs text-[#9AA0AB]">{hint}</p>}
  </div>
);

interface BarItem {
  key: string;
  label: string;
  value: number;
  color?: string;
  badge?: string;
}

const BarList: React.FC<{
  title: string;
  icon: React.ReactNode;
  items: BarItem[];
  emptyText: string;
}> = ({ title, icon, items, emptyText }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div className="p-4 sm:p-5 rounded-[22px] bg-white border border-[#ECEFF4] space-y-3">
      <h4 className="flex items-center gap-2 text-[15px] font-extrabold text-[#201D1D]">
        <span className="w-8 h-8 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center">
          {icon}
        </span>
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[#9AA0AB]">{emptyText}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="flex items-center gap-2 min-w-0">
                  {item.badge ? (
                    <span className="shrink-0 w-7 text-center text-[11px] font-bold text-[#3F4654] bg-[#F1F3F6] rounded-md py-0.5">
                      {item.badge}
                    </span>
                  ) : (
                    <span
                      className="shrink-0 w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color ?? '#235BF7' }}
                    />
                  )}
                  <span className="font-semibold text-[#201D1D] truncate">{item.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-[#7A808C]">
                  <strong className="text-[#201D1D]">{item.value}</strong>{' '}
                  <span className="text-xs">({Math.round((item.value / total) * 100)}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#F1F3F6] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(item.value / max) * 100}%`,
                    backgroundColor: item.color ?? '#235BF7',
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const CountriesPanel: React.FC<{ data: StoreAnalytics }> = ({ data }) => (
  <BarList
    title="Pays des visiteurs"
    icon={<Globe2 className="w-4 h-4" />}
    emptyText="Aucune visite sur cette période."
    items={data.countries.map((c) => ({
      key: c.code ?? 'unknown',
      label: c.label,
      value: c.visitors,
      badge: c.code ?? '—',
    }))}
  />
);

export const SourcesPanel: React.FC<{ data: StoreAnalytics }> = ({ data }) => (
  <BarList
    title="Canaux d’acquisition"
    icon={<Share2 className="w-4 h-4" />}
    emptyText="Aucune visite sur cette période."
    items={data.sources.map((s) => ({
      key: s.source,
      label: s.label,
      value: s.visitors,
      color: SOURCE_COLORS[s.source] ?? '#9AA0AB',
    }))}
  />
);

/** Local Senegalese number typed by the customer → wa.me digits. */
function waDigits(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.length === 9 ? `221${d}` : d;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export const AbandonedPanel: React.FC<{ data: StoreAnalytics; showProduct?: boolean }> = ({
  data,
  showProduct = true,
}) => (
  <div className="p-4 sm:p-5 rounded-[22px] bg-white border border-[#ECEFF4] space-y-3">
    <div>
      <h4 className="flex items-center gap-2 text-[15px] font-extrabold text-[#201D1D]">
        <span className="w-8 h-8 rounded-xl bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center">
          <UserX className="w-4 h-4" />
        </span>
        Commandes non finalisées ({data.abandoned.length})
      </h4>
      <p className="mt-1 text-[13px] text-[#7A808C]">
        Clients qui ont commencé à remplir le formulaire sans valider. Relancez-les.
      </p>
    </div>
    {data.abandoned.length === 0 ? (
      <p className="py-6 text-center text-[13px] text-[#9AA0AB]">
        Aucun formulaire abandonné sur cette période.
      </p>
    ) : (
      <ul className="divide-y divide-[#F1F3F6]">
        {data.abandoned.map((a) => (
          <li key={a.id} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-[14px] text-[#201D1D] truncate">
                {a.customerName || 'Client anonyme'}
                {a.phone && (
                  <span className="ml-2 font-semibold text-[#3F4654] tabular-nums">{a.phone}</span>
                )}
              </p>
              <p className="text-[13px] text-[#7A808C] truncate">
                {showProduct && a.productName ? `${a.productName} · ` : ''}
                {a.address ? `${a.address} · ` : ''}
                {dateFmt.format(new Date(a.updatedAt))}
              </p>
            </div>
            {a.phone && (
              <a
                href={`https://wa.me/${waDigits(a.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-3 py-2 rounded-xl bg-[#EEF3FF] text-[#235BF7] text-[13px] font-bold hover:bg-[#DBEAFE] transition-colors"
              >
                Relancer
              </a>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);
