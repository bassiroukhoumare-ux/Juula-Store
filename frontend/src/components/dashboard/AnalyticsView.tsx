'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Package, Radio, Settings2 } from 'lucide-react';
import type { OrderLead } from '@/types/juula';
import { formatFCFA } from '@/lib/orderUtils';
import type { PeriodRange } from '@/lib/store/period';
import { api } from '@/lib/api';
import type { StorePixels } from '@/lib/store/pixels';
import { useStoreAnalytics } from '@/components/dashboard/analytics/useStoreAnalytics';
import {
  AbandonedPanel,
  CountriesPanel,
  SourcesPanel,
  StatTile,
} from '@/components/dashboard/analytics/TrafficPanels';

interface AnalyticsViewProps {
  /** Selected dashboard period (header « Filtrer »). */
  range: PeriodRange;
  /** Orders of that period. */
  orders: OrderLead[];
  onOpenSettings: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ range, orders, onOpenSettings }) => {
  const [pixels, setPixels] = useState({ facebook: false, tiktok: false });
  useEffect(() => {
    api<{ store: StorePixels }>('/api/store')
      .then(({ store }) =>
        setPixels({
          facebook: Boolean(store.facebookPixelId),
          tiktok: Boolean(store.tiktokPixelId),
        }),
      )
      .catch(() => undefined);
  }, []);
  const { data, loading, error } = useStoreAnalytics({ from: range.start, to: range.end });

  const delivered = orders.filter((o) => o.status === 'delivered').length;
  const liveOrders = orders.filter((o) => o.status !== 'cancelled');
  const revenue = liveOrders.reduce((s, o) => s + (o.totalAmount ?? o.amount), 0);
  const basket = liveOrders.length > 0 ? Math.round(revenue / liveOrders.length) : 0;

  if (loading && !data) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#235BF7]" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="py-16 text-center rounded-[28px] bg-white border border-[#ECEFF4] text-[14px] text-[#7A808C]">
        Impossible de charger les statistiques. Vérifiez votre connexion et réessayez.
      </div>
    );
  }

  const t = data.totals;
  const funnel = [
    { label: 'Visiteurs', value: t.visitors },
    { label: 'Clics « Commander »', value: t.checkoutOpens },
    { label: 'Commandes', value: t.orders },
    { label: 'Livrées', value: delivered },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));
  const products = [...data.products].sort((a, b) => b.revenue - a.revenue || b.views - a.views);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#201D1D] tracking-tight">
          Performances
        </h2>
        <p className="text-[14px] text-[#7A808C]">
          {range.label} · visites de vos pages de vente et commandes
        </p>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Visiteurs uniques" value={String(t.visitors)} hint={`${t.views} vues`} />
        <StatTile label="Clics « Commander »" value={String(t.checkoutOpens)} />
        <StatTile
          label="Commandes"
          value={String(t.orders)}
          hint={`${t.conversionRate}% de conversion`}
        />
        <StatTile
          label="Chiffre d’affaires"
          value={formatFCFA(revenue)}
          hint={`Panier moyen ${formatFCFA(basket)}`}
        />
      </div>

      {/* Funnel */}
      <div className="p-4 sm:p-5 rounded-[22px] bg-white border border-[#ECEFF4] space-y-3">
        <h3 className="text-[15px] font-extrabold text-[#201D1D]">Parcours d’achat</h3>
        <div className="space-y-2.5">
          {funnel.map((step, i) => {
            const prev = i > 0 ? funnel[i - 1]!.value : 0;
            const rate = i > 0 && prev > 0 ? Math.round((step.value / prev) * 100) : null;
            return (
              <div key={step.label} className="space-y-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#201D1D]">{step.label}</span>
                  <span className="tabular-nums text-[#7A808C]">
                    <strong className="text-[#201D1D]">{step.value}</strong>
                    {rate !== null && (
                      <span className="ml-1.5 text-xs">({rate}% de l’étape précédente)</span>
                    )}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#F1F3F6] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#235BF7]"
                    style={{ width: `${(step.value / funnelMax) * 100}%`, opacity: 1 - i * 0.18 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sources + countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SourcesPanel data={data} />
        <CountriesPanel data={data} />
      </div>

      {/* Per product */}
      <div className="p-4 sm:p-5 rounded-[22px] bg-white border border-[#ECEFF4] space-y-3">
        <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-[#201D1D]">
          <span className="w-8 h-8 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center">
            <Package className="w-4 h-4" />
          </span>
          Performances par produit
        </h3>
        {products.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[#9AA0AB]">
            Aucun produit pour le moment.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-[#F1F3F6] md:hidden">
              {products.map((p) => (
                <li key={p.id} className="py-3 flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#F1F3F6] overflow-hidden shrink-0">
                    {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[14px] text-[#201D1D] truncate">{p.name}</p>
                    <p className="text-[13px] text-[#7A808C]">
                      {p.views} vues · {p.checkoutOpens} clics · {p.orders} commandes ·{' '}
                      {p.conversionRate}%
                    </p>
                    <p className="text-[14px] font-extrabold text-[#059669]">
                      {formatFCFA(p.revenue)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-[#9AA0AB] border-b border-[#F1F3F6]">
                    <th className="py-2.5 pr-3 font-bold">Produit</th>
                    <th className="py-2.5 px-3 font-bold text-right">Vues</th>
                    <th className="py-2.5 px-3 font-bold text-right">Visiteurs</th>
                    <th className="py-2.5 px-3 font-bold text-right">Clics</th>
                    <th className="py-2.5 px-3 font-bold text-right">Commandes</th>
                    <th className="py-2.5 px-3 font-bold text-right">Conversion</th>
                    <th className="py-2.5 px-3 font-bold text-right">Non finalisées</th>
                    <th className="py-2.5 pl-3 font-bold text-right">Chiffre d’affaires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F6F7F9]">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-xl bg-[#F1F3F6] overflow-hidden shrink-0">
                            {p.image && (
                              <img src={p.image} alt="" className="w-full h-full object-cover" />
                            )}
                          </span>
                          <span className="font-bold text-[#201D1D]">{p.name}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">{p.views}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{p.visitors}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{p.checkoutOpens}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold">{p.orders}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{p.conversionRate}%</td>
                      <td className="py-3 px-3 text-right tabular-nums">{p.abandoned}</td>
                      <td className="py-3 pl-3 text-right tabular-nums font-extrabold text-[#059669]">
                        {formatFCFA(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <AbandonedPanel data={data} />

      {/* Ad pixels */}
      <div className="p-4 sm:p-5 rounded-[22px] bg-white border border-[#ECEFF4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-[15px] font-extrabold text-[#201D1D]">Pixels publicitaires</h3>
            <p className="text-[13px] text-[#7A808C]">
              Vos visites et commandes sont aussi envoyées à Facebook et TikTok pour optimiser vos
              publicités.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { label: 'Pixel Facebook', on: pixels.facebook },
                { label: 'Pixel TikTok', on: pixels.tiktok },
              ].map((px) => (
                <span
                  key={px.label}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-semibold ${
                    px.on ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F1F3F6] text-[#7A808C]'
                  }`}
                >
                  {px.on && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {px.label} : {px.on ? 'connecté' : 'non connecté'}
                </span>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E3E7EE] text-[13px] font-bold text-[#201D1D] hover:bg-[#F6F7F9] cursor-pointer"
        >
          <Settings2 className="w-4 h-4 text-[#235BF7]" />
          Configurer les pixels
        </button>
      </div>
    </div>
  );
};
