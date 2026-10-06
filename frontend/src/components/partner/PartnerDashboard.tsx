'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  Copy,
  Handshake,
  MousePointerClick,
  ShoppingBag,
  Wallet,
  XCircle,
} from 'lucide-react';
import { formatMoney } from '@/lib/money';
import {
  commissionLabel,
  daysLeft,
  partnerStatus,
  type CommissionState,
  type PartnerRules,
  type PartnerStats,
} from '@/lib/store/partners';

export interface PartnerOrderRow {
  id: string;
  reference: string;
  createdAt: string;
  products: string[];
  amount: number;
  commission: number;
  state: CommissionState;
}

interface PartnerDashboardProps {
  storeName: string;
  logoUrl: string | null;
  accent: string;
  partner: PartnerRules & {
    name: string;
    slug: string;
    productTitle: string | null;
    paidAmount: number;
    paidAt: string | null;
  };
  stats: PartnerStats;
  affiliateUrl: string;
  orders: PartnerOrderRow[];
  page: number;
  pageCount: number;
  token: string;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const STATE: Record<CommissionState, { label: string; cls: string; icon: React.ReactNode }> = {
  validated: {
    label: 'Livrée · commission confirmée',
    cls: 'bg-emerald-50 text-emerald-700',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  pending: {
    label: 'En cours · commission en attente',
    cls: 'bg-amber-50 text-amber-700',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: 'Annulée · commission annulée',
    cls: 'bg-rose-50 text-rose-700',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

/** Read-only, live results of one affiliate link (mobile first). */
export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({
  storeName,
  logoUrl,
  accent,
  partner,
  stats,
  affiliateUrl,
  orders,
  page,
  pageCount,
  token,
}) => {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const status = partnerStatus(partner);
  const left = daysLeft(partner.expiresAt);

  // Live: refresh the figures every minute while the page is open.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(t);
  }, [router]);

  const copy = () => {
    void navigator.clipboard?.writeText(affiliateUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  const share = `https://wa.me/?text=${encodeURIComponent(`Découvrez ${storeName} 👉 ${affiliateUrl}`)}`;

  const banner =
    status === 'active'
      ? {
          cls: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          text: `Campagne en cours — expire le ${dateFmt.format(new Date(partner.expiresAt))} (il reste ${left} jour${left > 1 ? 's' : ''}).`,
        }
      : status === 'scheduled'
        ? {
            cls: 'bg-sky-50 border-sky-200 text-sky-900',
            text: `La campagne commence le ${dateFmt.format(new Date(partner.startsAt!))}. Les clics seront comptés à partir de cette date.`,
          }
        : status === 'suspended'
          ? {
              cls: 'bg-amber-50 border-amber-200 text-amber-900',
              text: 'Campagne suspendue par la boutique. Aucune nouvelle commission n’est calculée pour le moment.',
            }
          : {
              cls: 'bg-rose-50 border-rose-200 text-rose-900',
              text: 'Cette campagne est arrivée à expiration. Aucune nouvelle commission n’est calculée.',
            };

  const kpis = [
    {
      label: 'Clics reçus',
      value: stats.clicks.toLocaleString('fr-FR'),
      hint: 'Visiteurs uniques via votre lien',
      icon: <MousePointerClick className="w-5 h-5" />,
    },
    {
      label: 'Commandes en cours',
      value: stats.pendingOrders.toLocaleString('fr-FR'),
      hint: `Gains potentiels : ${formatMoney(stats.pendingCommission)}`,
      icon: <Clock className="w-5 h-5" />,
    },
    {
      label: 'Commandes livrées',
      value: stats.validatedOrders.toLocaleString('fr-FR'),
      hint: `Chiffre d’affaires : ${formatMoney(stats.revenue)}`,
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      label: 'Commissions à recevoir',
      value: formatMoney(stats.dueCommission),
      hint:
        partner.paidAmount > 0
          ? `Déjà versé : ${formatMoney(partner.paidAmount)}`
          : 'Commissions confirmées, pas encore versées',
      icon: <Wallet className="w-5 h-5" />,
      strong: true,
    },
  ];

  const pageHref = (p: number) => `?token=${encodeURIComponent(token)}&page=${p}`;

  return (
    <div
      className="min-h-screen bg-[#F1F3F2] text-[#201D1D]"
      style={{ ['--accent' as string]: accent }}
    >
      <header className="bg-white border-b border-black/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-black/5"
            />
          ) : (
            <span className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold">
              {storeName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="font-bold text-[17px] truncate">{storeName}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7A808C]">
            <Handshake className="w-4 h-4" /> Partenaire
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">
        <div>
          <p className="text-[14px] font-semibold text-[var(--accent)]">Espace partenaire</p>
          <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-tight">
            Bonjour {partner.name} 👋
          </h1>
          <p className="mt-1 text-[15px] text-[#3F4654]">
            Votre commission : <strong>{commissionLabel(partner, partner.productTitle)}</strong>.
            Les frais de livraison ne comptent pas.
          </p>
        </div>

        <p className={`px-4 py-3 rounded-2xl border text-[14px] font-semibold ${banner.cls}`}>
          {banner.text}
        </p>

        {/* Affiliate link */}
        <section className="p-4 sm:p-5 rounded-[24px] bg-white border border-black/5 space-y-3">
          <p className="text-[14px] font-semibold text-[#201D1D]">Votre lien à partager</p>
          <div className="flex items-center gap-2 h-12 pl-4 pr-1.5 rounded-2xl bg-[#F6F7F9] border border-[#E3E7EE]">
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
              {affiliateUrl}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copy}
              className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] text-white text-[15px] font-semibold hover:brightness-110 cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Lien copié' : 'Copier mon lien'}
            </button>
            <a
              href={share}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white text-[15px] font-semibold"
            >
              Partager sur WhatsApp
            </a>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              className={`p-4 sm:p-5 rounded-[22px] border ${
                k.strong ? 'bg-[#201D1D] text-white border-[#201D1D]' : 'bg-white border-black/5'
              }`}
            >
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  k.strong ? 'bg-white/10 text-white' : 'bg-[#F6F7F9] text-[var(--accent)]'
                }`}
              >
                {k.icon}
              </span>
              <p
                className={`mt-3 text-[13px] font-semibold ${k.strong ? 'text-white/70' : 'text-[#7A808C]'}`}
              >
                {k.label}
              </p>
              <p className="text-[22px] sm:text-[28px] font-extrabold tabular-nums leading-tight">
                {k.value}
              </p>
              <p
                className={`mt-1 text-[12px] sm:text-[13px] ${k.strong ? 'text-white/70' : 'text-[#7A808C]'}`}
              >
                {k.hint}
              </p>
            </div>
          ))}
        </section>

        {/* Orders */}
        <section className="rounded-[24px] bg-white border border-black/5 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-black/5">
            <h2 className="text-[18px] font-extrabold">Commandes via votre lien</h2>
            <p className="text-[13px] text-[#7A808C]">
              Une commande annulée ou refusée ne donne jamais de commission.
            </p>
          </div>
          {orders.length === 0 ? (
            <p className="px-5 py-10 text-center text-[14px] text-[#7A808C]">
              Aucune commande pour le moment. Partagez votre lien pour commencer.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {orders.map((o) => {
                const st = STATE[o.state];
                return (
                  <li key={o.id} className="px-4 sm:px-5 py-4 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold line-clamp-2">
                        {o.products.join(', ')}
                      </p>
                      <p className="text-[13px] text-[#7A808C]">
                        {dateTimeFmt.format(new Date(o.createdAt))} · {o.reference} · commande de{' '}
                        {formatMoney(o.amount)}
                      </p>
                      <span
                        className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-semibold ${st.cls}`}
                      >
                        {st.icon} {st.label}
                      </span>
                    </div>
                    <p
                      className={`shrink-0 text-[16px] font-extrabold tabular-nums ${
                        o.state === 'cancelled' ? 'text-[#9AA0AB] line-through' : 'text-[#201D1D]'
                      }`}
                    >
                      +{formatMoney(o.commission)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          {pageCount > 1 && (
            <nav
              aria-label="Pages"
              className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-black/5 text-[14px] font-semibold"
            >
              {page > 1 ? (
                <a
                  href={pageHref(page - 1)}
                  className="h-10 px-4 inline-flex items-center rounded-xl bg-[#F6F7F9]"
                >
                  Précédent
                </a>
              ) : (
                <span />
              )}
              <span className="text-[#7A808C]">
                Page {page} / {pageCount}
              </span>
              {page < pageCount ? (
                <a
                  href={pageHref(page + 1)}
                  className="h-10 px-4 inline-flex items-center rounded-xl bg-[#F6F7F9]"
                >
                  Suivant
                </a>
              ) : (
                <span />
              )}
            </nav>
          )}
        </section>

        {partner.paidAt && (
          <p className="text-center text-[13px] text-[#7A808C]">
            Dernier versement le {dateFmt.format(new Date(partner.paidAt))}.
          </p>
        )}
        <p className="text-center text-[12px] text-[#9AA0AB]">
          Chiffres mis à jour automatiquement · Propulsé par Juula
        </p>
      </main>
    </div>
  );
};
