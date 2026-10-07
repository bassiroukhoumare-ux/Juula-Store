'use client';

import React, { useState } from 'react';
import {
  BadgeCheck,
  Banknote,
  Hourglass,
  MessageCircle,
  Repeat,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  AreaChart,
  Badge,
  Card,
  IconBubble,
  Kpi,
  Loading,
  dateTimeFmt,
  fShort,
  fcfa,
  useAdminData,
  ErrorBox,
  SearchBox,
  useDebounced,
} from './ui';

export type Period = 7 | 30 | 90;
export type SubFilter = 'all' | 'paid' | 'pending' | 'failed' | 'abandoned';

// ─────────────────────────────────────────────────────────────────────────
// Abonnements
// ─────────────────────────────────────────────────────────────────────────
interface SubsData {
  feePercent: number;
  net: { total: number; gross: number; fees: number; thisMonth: number; lastMonth: number };
  fees: { total: number; thisMonth: number; ifAllRenew: number };
  kpis: {
    totalGross: number;
    paymentsCount: number;
    thisMonth: number;
    lastMonth: number;
    mrr: number;
    activeStores: number;
    pendingCount: number;
    pendingAmount: number;
  };
  chart: { total: number; count: number; series: { day: string; value: number }[] };
  expiring: {
    id: string;
    name: string;
    subdomain: string | null;
    whatsapp: string | null;
    ownerName: string | null;
    email: string;
    daysLeft: number;
  }[];
  list: {
    id: string;
    storeName: string;
    subdomain: string | null;
    email: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed' | 'abandoned' | 'manual';
    note: string | null;
    createdAt: string;
    expiresAt: string | null;
  }[];
}

const SUB_BADGE: Record<
  SubsData['list'][number]['status'],
  { label: string; tone: 'green' | 'amber' | 'red' | 'grey' | 'violet' }
> = {
  paid: { label: 'Payé', tone: 'green' },
  pending: { label: 'En attente', tone: 'amber' },
  failed: { label: 'Échoué', tone: 'red' },
  abandoned: { label: 'Abandonné', tone: 'grey' },
  manual: { label: 'Manuel / Offert', tone: 'violet' },
};

export const SubscriptionsTab: React.FC<{ period: Period; status: SubFilter; tick: number }> = ({
  period,
  status,
  tick,
}) => {
  const { data, error } = useAdminData<SubsData>(
    `/api/adminom/subscriptions?period=${period}&status=${status}`,
    tick,
  );
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const d = data;
  const waText = (name: string) =>
    encodeURIComponent(
      `Bonjour, votre boutique ${name} sur Juula s’éteint bientôt. Renouvelez votre abonnement (3 900 FCFA) depuis votre tableau de bord pour rester en ligne 👉 https://www.juula.store/dashboard`,
    );

  return (
    <div className="space-y-4">
      {/* Money cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-[var(--a-muted)]">Mon argent réel</p>
              <p className="mt-1 text-[30px] sm:text-[36px] font-extrabold tabular-nums text-emerald-500 leading-tight">
                {fcfa(d.net.total)}
              </p>
            </div>
            <IconBubble tone="bg-emerald-500/12 text-emerald-500">
              <ShieldCheck className="w-5 h-5" />
            </IconBubble>
          </div>
          <dl className="mt-4 space-y-2 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-[var(--a-muted)]">Encaissé par Moneriz</dt>
              <dd className="font-semibold tabular-nums">{fcfa(d.net.gross)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--a-muted)]">Frais Moneriz</dt>
              <dd className="font-semibold tabular-nums text-rose-500">- {fcfa(d.net.fees)}</dd>
            </div>
          </dl>
          <p className="mt-4 pt-3 border-t border-[var(--a-border)] text-[13px] text-[var(--a-muted)]">
            Ce mois : {fcfa(d.net.thisMonth)} · mois dernier : {fcfa(d.net.lastMonth)}
          </p>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-[var(--a-muted)]">
                Ce que garde Moneriz
              </p>
              <p className="mt-1 text-[30px] sm:text-[36px] font-extrabold tabular-nums text-orange-500 leading-tight">
                {fcfa(d.fees.total)}
              </p>
            </div>
            <IconBubble tone="bg-orange-500/12 text-orange-500">
              <Scissors className="w-5 h-5" />
            </IconBubble>
          </div>
          <dl className="mt-4 space-y-2 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-[var(--a-muted)]">Taux appliqué</dt>
              <dd className="font-semibold tabular-nums">
                {d.feePercent.toLocaleString('fr-FR')} %
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--a-muted)]">Ce mois</dt>
              <dd className="font-semibold tabular-nums">{fcfa(d.fees.thisMonth)}</dd>
            </div>
          </dl>
          <p className="mt-4 pt-3 border-t border-[var(--a-border)] text-[13px] text-[var(--a-muted)]">
            Si tout se renouvelle : {fcfa(d.fees.ifAllRenew)} par mois
          </p>
        </Card>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi
          label="Encaissé total"
          value={fShort(d.kpis.totalGross)}
          hint={`${d.kpis.paymentsCount} paiement${d.kpis.paymentsCount > 1 ? 's' : ''} depuis le début`}
          icon={<Wallet className="w-5 h-5" />}
          tone="bg-violet-500/12 text-violet-500"
        />
        <Kpi
          label="Ce mois"
          value={fShort(d.kpis.thisMonth)}
          hint={`mois dernier : ${fShort(d.kpis.lastMonth)}`}
          icon={<TrendingUp className="w-5 h-5" />}
          tone="bg-emerald-500/12 text-emerald-500"
        />
        <Kpi
          label="Récurrent / mois"
          value={fShort(d.kpis.mrr)}
          hint={`si tout se renouvelle · ${d.kpis.activeStores} boutique${d.kpis.activeStores > 1 ? 's' : ''}`}
          icon={<Repeat className="w-5 h-5" />}
          tone="bg-sky-500/12 text-sky-500"
        />
        <Kpi
          label="En attente"
          value={String(d.kpis.pendingCount)}
          valueClass="text-rose-500"
          hint={`${fShort(d.kpis.pendingAmount)} jamais réglés`}
          icon={<Hourglass className="w-5 h-5" />}
          tone="bg-orange-500/12 text-orange-500"
        />
      </div>

      {/* Chart + to relaunch */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-[16px] font-extrabold">Recettes des abonnements</h3>
              <p className="text-[13px] text-[var(--a-muted)]">
                {period} jours · {d.chart.count} paiement{d.chart.count > 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-[22px] font-extrabold tabular-nums">{fShort(d.chart.total)}</p>
          </div>
          <div className="mt-3">
            <AreaChart series={d.chart.series} />
          </div>
        </Card>
        <Card>
          <h3 className="text-[16px] font-extrabold">À relancer cette semaine</h3>
          {d.expiring.length === 0 ? (
            <div className="mt-6 text-center">
              <BadgeCheck className="mx-auto w-9 h-9 text-emerald-500" />
              <p className="mt-2 text-[14px] text-[var(--a-muted)]">
                Aucune boutique ne s’éteint dans les 7 jours. Rien à faire aujourd’hui.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {d.expiring.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--a-soft)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold truncate">{s.name}</p>
                    <p className="text-[12px] text-[var(--a-muted)]">
                      {s.daysLeft <= 0
                        ? 'S’éteint aujourd’hui'
                        : `S’éteint dans ${s.daysLeft} jour${s.daysLeft > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  {s.whatsapp ? (
                    <a
                      href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}?text=${waText(s.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#25D366] text-white text-[13px] font-semibold"
                    >
                      <MessageCircle className="w-4 h-4" /> Relancer
                    </a>
                  ) : (
                    <a
                      href={`mailto:${s.email}`}
                      className="shrink-0 text-[13px] font-semibold text-[#235BF7]"
                    >
                      Email
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* History */}
      <Card className="!p-0 overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--a-border)]">
          <h3 className="text-[16px] font-extrabold">Historique des abonnements</h3>
          <p className="text-[13px] text-[var(--a-muted)]">{d.list.length} sur la période</p>
        </div>
        {d.list.length === 0 ? (
          <p className="px-6 py-10 text-center text-[14px] text-[var(--a-muted)]">
            Aucun abonnement pour ces filtres.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--a-border)]">
            {d.list.map((s) => {
              const b = SUB_BADGE[s.status];
              return (
                <li key={s.id} className="px-5 sm:px-6 py-3.5 flex items-center gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold truncate">{s.storeName}</p>
                    <p className="text-[12px] text-[var(--a-muted)] truncate">
                      {[s.email, dateTimeFmt.format(new Date(s.createdAt)), s.note]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col-reverse items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
                    <Badge tone={b.tone}>{b.label}</Badge>
                    <p className="sm:w-24 text-right text-[15px] font-bold tabular-nums">
                      {s.status === 'manual' ? 'Offert' : fShort(s.amount)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Tableau de bord
// ─────────────────────────────────────────────────────────────────────────
interface OverviewData {
  merchants: number;
  newMerchants: number;
  stores: number;
  liveStores: number;
  orders: number;
  gmv: number;
  deliveredRate: number;
  paidOnline: number;
  subscriptionRevenue: number;
  series: { day: string; value: number }[];
}

export const OverviewTab: React.FC<{ period: Period; tick: number }> = ({ period, tick }) => {
  const { data, error } = useAdminData<OverviewData>(
    `/api/adminom/overview?period=${period}`,
    tick,
  );
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi
          label="Marchands"
          value={String(data.merchants)}
          hint={`+${data.newMerchants} sur ${period} jours`}
          icon={<Users className="w-5 h-5" />}
          tone="bg-violet-500/12 text-violet-500"
        />
        <Kpi
          label="Boutiques en ligne"
          value={`${data.liveStores} / ${data.stores}`}
          hint="abonnées et publiées"
          icon={<Store className="w-5 h-5" />}
          tone="bg-sky-500/12 text-sky-500"
        />
        <Kpi
          label="Volume des ventes"
          value={fShort(data.gmv)}
          hint={`${data.orders} commandes · ${data.deliveredRate} % livrées`}
          icon={<ShoppingBag className="w-5 h-5" />}
          tone="bg-emerald-500/12 text-emerald-500"
        />
        <Kpi
          label="Abonnements encaissés"
          value={fShort(data.subscriptionRevenue)}
          hint={`${data.paidOnline} commandes payées en ligne`}
          icon={<Banknote className="w-5 h-5" />}
          tone="bg-orange-500/12 text-orange-500"
        />
      </div>
      <Card>
        <div className="flex items-end justify-between gap-2">
          <div>
            <h3 className="text-[16px] font-extrabold">Ventes de toutes les boutiques</h3>
            <p className="text-[13px] text-[var(--a-muted)]">
              {period} derniers jours, hors annulations
            </p>
          </div>
          <p className="text-[22px] font-extrabold tabular-nums">{fShort(data.gmv)}</p>
        </div>
        <div className="mt-3">
          <AreaChart series={data.series} color="#235BF7" />
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Commandes
// ─────────────────────────────────────────────────────────────────────────
const ORDER_STATUS: Record<string, { label: string; tone: 'green' | 'amber' | 'red' | 'blue' }> = {
  new: { label: 'Nouvelle', tone: 'blue' },
  confirmed: { label: 'En route', tone: 'amber' },
  delivered: { label: 'Livrée', tone: 'green' },
  cancelled: { label: 'Annulée', tone: 'red' },
};

export const OrdersTab: React.FC<{ period: Period; status: string; tick: number }> = ({
  period,
  status,
  tick,
}) => {
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const { data, error } = useAdminData<{
    count: number;
    total: number;
    orders: {
      id: string;
      reference: string;
      product: string;
      total: number;
      status: string;
      paymentType: string;
      createdAt: string;
      store: string;
    }[];
  }>(`/api/adminom/orders?period=${period}&status=${status}&q=${encodeURIComponent(dq)}`, tick);
  return (
    <div className="space-y-4">
      <SearchBox value={q} onChange={setQ} placeholder="Référence, produit ou boutique" />
      {error ? (
        <ErrorBox error={error} />
      ) : !data ? (
        <Loading />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-[var(--a-border)] flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-[16px] font-extrabold">Commandes de toutes les boutiques</h3>
              <p className="text-[13px] text-[var(--a-muted)]">
                {data.count} commande{data.count > 1 ? 's' : ''} · {period} jours
              </p>
            </div>
            <p className="text-[20px] font-extrabold tabular-nums">{fShort(data.total)}</p>
          </div>
          <ul className="divide-y divide-[var(--a-border)]">
            {data.orders.map((o) => {
              const st = ORDER_STATUS[o.status] ?? { label: o.status, tone: 'blue' as const };
              return (
                <li
                  key={o.id}
                  className="px-5 sm:px-6 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-1"
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="text-[15px] font-semibold truncate">{o.product}</p>
                    <p className="text-[12px] text-[var(--a-muted)] truncate">
                      {o.store} · {o.reference} · {dateTimeFmt.format(new Date(o.createdAt))}
                    </p>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <p className="w-28 text-right text-[15px] font-bold tabular-nums">
                    {fShort(o.total)}
                  </p>
                </li>
              );
            })}
            {data.orders.length === 0 && (
              <li className="px-6 py-10 text-center text-[14px] text-[var(--a-muted)]">
                Aucune commande pour ces filtres.
              </li>
            )}
          </ul>
        </Card>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Marketing
// ─────────────────────────────────────────────────────────────────────────
export const MarketingTab: React.FC<{ tick: number }> = ({ tick }) => {
  const { data, error } = useAdminData<{
    codes: {
      id: string;
      code: string;
      label: string;
      used: number;
      maxUses: number | null;
      status: string;
      store: string;
    }[];
    partners: {
      id: string;
      name: string;
      slug: string;
      status: string;
      clicks: number;
      orders: number;
      store: string;
    }[];
  }>('/api/adminom/marketing', tick);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const tone = (s: string) =>
    (s === 'active' ? 'green' : s === 'expired' ? 'red' : s === 'scheduled' ? 'blue' : 'grey') as
      | 'green'
      | 'red'
      | 'blue'
      | 'grey';
  const label: Record<string, string> = {
    active: 'Actif',
    expired: 'Expiré',
    exhausted: 'Épuisé',
    disabled: 'Désactivé',
    suspended: 'Suspendu',
    scheduled: 'Programmé',
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--a-border)]">
          <h3 className="text-[16px] font-extrabold">Codes promo</h3>
          <p className="text-[13px] text-[var(--a-muted)]">
            {data.codes.length} code{data.codes.length > 1 ? 's' : ''} sur la plateforme
          </p>
        </div>
        <ul className="divide-y divide-[var(--a-border)]">
          {data.codes.map((c) => (
            <li key={c.id} className="px-5 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold">
                  {c.code} <span className="font-semibold text-[#235BF7]">{c.label}</span>
                </p>
                <p className="text-[12px] text-[var(--a-muted)] truncate">
                  {c.store} · {c.used}
                  {c.maxUses ? ` / ${c.maxUses}` : ''} utilisations
                </p>
              </div>
              <Badge tone={tone(c.status)}>{label[c.status] ?? c.status}</Badge>
            </li>
          ))}
          {data.codes.length === 0 && (
            <li className="px-5 py-8 text-center text-[14px] text-[var(--a-muted)]">
              Aucun code promo.
            </li>
          )}
        </ul>
      </Card>
      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--a-border)]">
          <h3 className="text-[16px] font-extrabold">Liens & partenaires</h3>
          <p className="text-[13px] text-[var(--a-muted)]">
            {data.partners.length} partenaire{data.partners.length > 1 ? 's' : ''}
          </p>
        </div>
        <ul className="divide-y divide-[var(--a-border)]">
          {data.partners.map((p) => (
            <li key={p.id} className="px-5 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold truncate">
                  {p.name} <span className="font-medium text-[var(--a-muted)]">?ref={p.slug}</span>
                </p>
                <p className="text-[12px] text-[var(--a-muted)] truncate">
                  {p.store} · {p.clicks} clics · {p.orders} commandes
                </p>
              </div>
              <Badge tone={tone(p.status)}>{label[p.status] ?? p.status}</Badge>
            </li>
          ))}
          {data.partners.length === 0 && (
            <li className="px-5 py-8 text-center text-[14px] text-[var(--a-muted)]">
              Aucun partenaire.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
};
