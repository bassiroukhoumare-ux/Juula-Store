'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  Flag,
  MessageSquareReply,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Moon,
  Package,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Store,
  Sun,
  Users,
} from 'lucide-react';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import { THEMES, Pill, adminFetch, useMinWidth } from './ui';
import { GrantModal, type MerchantRow } from './GrantModal';
import {
  MarketingTab,
  OrdersTab,
  OverviewTab,
  SubscriptionsTab,
  type Period,
  type SubFilter,
} from './Tabs';
import {
  DisputesTab,
  MerchantsTab,
  ProductsTab,
  StoresTab,
  type DisputeFilter,
} from './Moderation';
import { ReportsPanel, type ReportFilter } from './Reports';
import { TabBar } from './TabBar';

interface AdminNotifications {
  items: {
    id: string;
    type: 'reply' | 'report';
    reportId: string;
    title: string;
    preview: string;
    caseRef: string;
    at: string;
  }[];
  unreadReplies: number;
  newReports: number;
  expiring: number;
}

type Tab =
  | 'overview'
  | 'merchants'
  | 'stores'
  | 'products'
  | 'orders'
  | 'disputes'
  | 'subscriptions'
  | 'marketing';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Tableau de bord', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'merchants', label: 'Marchands', icon: <Users className="w-4 h-4" /> },
  { id: 'stores', label: 'Boutiques', icon: <Store className="w-4 h-4" /> },
  { id: 'products', label: 'Produits', icon: <ShoppingBag className="w-4 h-4" /> },
  { id: 'orders', label: 'Commandes', icon: <Package className="w-4 h-4" /> },
  { id: 'disputes', label: 'Litiges', icon: <ShieldAlert className="w-4 h-4" /> },
  { id: 'subscriptions', label: 'Abonnements', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'marketing', label: 'Marketing', icon: <Megaphone className="w-4 h-4" /> },
];

const SUB_FILTERS: { id: SubFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'paid', label: 'Payés' },
  { id: 'pending', label: 'En attente' },
  { id: 'failed', label: 'Échoués' },
  { id: 'abandoned', label: 'Abandonnés' },
];
const DISPUTE_FILTERS: { id: DisputeFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'maturing', label: 'Maturation 72 h' },
  { id: 'available', label: 'Disponibles' },
  { id: 'withdrawn', label: 'Retirés' },
  { id: 'frozen', label: 'Gelés' },
  { id: 'refunding', label: 'Remboursement en cours' },
  { id: 'refunded', label: 'Remboursés' },
  { id: 'released', label: 'Libérés' },
];
const REPORT_FILTERS: { id: ReportFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'new', label: 'Nouveaux / non lus' },
  { id: 'investigating', label: 'En investigation' },
  { id: 'resolved', label: 'Résolus' },
  { id: 'dismissed', label: 'Classés sans suite' },
];
const ORDER_FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'new', label: 'Nouvelles' },
  { id: 'confirmed', label: 'En route' },
  { id: 'delivered', label: 'Livrées' },
  { id: 'cancelled', label: 'Annulées' },
];

/** /adminom back-office shell: top bar, pill tabs, contextual filters. */
export const AdminApp: React.FC = () => {
  const [tab, setTab] = useState<Tab>('subscriptions');
  const [period, setPeriod] = useState<Period>(30);
  const [subFilter, setSubFilter] = useState<SubFilter>('all');
  const [orderFilter, setOrderFilter] = useState('all');
  const [disputeFilter, setDisputeFilter] = useState<DisputeFilter>('all');
  const [openDisputes, setOpenDisputes] = useState(0);
  const [newReports, setNewReports] = useState(0);
  const smUp = useMinWidth(640);
  const [litiges, setLitiges] = useState<'payments' | 'reports'>('payments');
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all');
  const [tick, setTick] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const [grantFor, setGrantFor] = useState<MerchantRow | null | 'new'>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [alerts, setAlerts] = useState(0);
  const [notif, setNotif] = useState<AdminNotifications | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [focusReport, setFocusReport] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDark(localStorage.getItem('juula-admin-theme') === 'dark');
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    adminFetch<{ expiring: unknown[] }>('/api/adminom/subscriptions?period=7&status=all')
      .then((d) => setAlerts(d.expiring.length))
      .catch(() => undefined);
    adminFetch<{ totals: { frozenCount: number } }>('/api/adminom/disputes?period=7&status=frozen')
      .then((d) => setOpenDisputes(d.totals.frozenCount))
      .catch(() => undefined);
    adminFetch<{ counts: Record<string, number> }>('/api/adminom/reports?status=new')
      .then((d) => setNewReports(d.counts.new ?? 0))
      .catch(() => undefined);
  }, [tick]);
  // Bell: reporters' e-mail replies + new reports (refreshed every minute).
  useEffect(() => {
    let alive = true;
    const load = () =>
      adminFetch<AdminNotifications>('/api/adminom/notifications')
        .then((d) => alive && setNotif(d))
        .catch(() => undefined);
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [tick]);
  const openReport = (id: string) => {
    setBellOpen(false);
    setTab('disputes');
    setLitiges('reports');
    setFocusReport(id);
  };
  const unreadReplies = notif?.unreadReplies ?? 0;
  const bellCount = (notif?.items.length ?? 0) + alerts;

  const toggleTheme = () => {
    setDark((v) => {
      try {
        localStorage.setItem('juula-admin-theme', v ? 'light' : 'dark');
      } catch {
        // ignore
      }
      return !v;
    });
  };
  const refresh = () => {
    setTick((t) => t + 1);
    setSpinning(true);
    setTimeout(() => setSpinning(false), 700);
  };
  const logout = async () => {
    await fetch('/api/adminom/logout', { method: 'POST' }).catch(() => undefined);
    window.location.reload();
  };

  const onReports = tab === 'disputes' && litiges === 'reports';
  const statusPills =
    tab === 'subscriptions'
      ? SUB_FILTERS
      : tab === 'orders'
        ? ORDER_FILTERS
        : onReports
          ? REPORT_FILTERS
          : tab === 'disputes'
            ? DISPUTE_FILTERS
            : null;
  const statusValue =
    tab === 'subscriptions'
      ? subFilter
      : onReports
        ? reportFilter
        : tab === 'disputes'
          ? disputeFilter
          : orderFilter;
  const setStatus = (v: string) =>
    tab === 'subscriptions'
      ? setSubFilter(v as SubFilter)
      : onReports
        ? setReportFilter(v as ReportFilter)
        : tab === 'disputes'
          ? setDisputeFilter(v as DisputeFilter)
          : setOrderFilter(v);
  const showPeriod =
    tab === 'overview' ||
    tab === 'orders' ||
    tab === 'subscriptions' ||
    (tab === 'disputes' && !onReports);
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };
  const changed = (message: string) => {
    showToast(message);
    refresh();
  };

  return (
    <div
      style={(dark ? THEMES.dark : THEMES.light) as React.CSSProperties}
      className="min-h-screen bg-[var(--a-bg)] text-[var(--a-text)] transition-colors"
    >
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-[var(--a-bg)]/85 backdrop-blur-xl border-b border-[var(--a-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className={dark ? 'brightness-0 invert' : ''}>
              <JuulaLogo height={28} />
            </span>
            <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-[var(--a-text)] text-[var(--a-bg)] text-[12px] font-bold">
              Admin
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? 'Mode clair' : 'Mode sombre'}
              className="w-10 h-10 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] flex items-center justify-center cursor-pointer"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setBellOpen((v) => !v)}
                aria-expanded={bellOpen}
                aria-label={`Notifications (${bellCount})`}
                className="relative w-10 h-10 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] flex items-center justify-center cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {bellCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                    {bellCount > 99 ? '99+' : bellCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Fermer les notifications"
                    onClick={() => setBellOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:right-0 sm:mt-2 z-50 sm:w-96 max-h-[70vh] overflow-y-auto rounded-2xl bg-[var(--a-surface)] border border-[var(--a-border)] shadow-2xl">
                    <p className="px-4 py-3 text-[14px] font-extrabold border-b border-[var(--a-border)]">
                      Notifications
                    </p>
                    {alerts > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setBellOpen(false);
                          setTab('subscriptions');
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[var(--a-soft)] border-b border-[var(--a-border)] cursor-pointer"
                      >
                        <p className="text-[14px] font-semibold">
                          {alerts} boutique{alerts > 1 ? 's' : ''} à relancer cette semaine
                        </p>
                        <p className="text-[12px] text-[var(--a-muted)]">
                          Abonnements qui expirent sous 7 jours
                        </p>
                      </button>
                    )}
                    {(notif?.items ?? []).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => openReport(n.reportId)}
                        className="w-full text-left px-4 py-3 flex gap-3 hover:bg-[var(--a-soft)] border-b border-[var(--a-border)] last:border-0 cursor-pointer"
                      >
                        <span
                          className={`mt-0.5 w-8 h-8 shrink-0 rounded-xl flex items-center justify-center ${
                            n.type === 'reply'
                              ? 'bg-violet-500/12 text-violet-500'
                              : 'bg-rose-500/12 text-rose-500'
                          }`}
                        >
                          {n.type === 'reply' ? (
                            <MessageSquareReply className="w-4 h-4" />
                          ) : (
                            <Flag className="w-4 h-4" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold">{n.title}</span>
                          <span className="block text-[12px] text-[var(--a-muted)] truncate">
                            {n.caseRef} · {n.preview}
                          </span>
                        </span>
                      </button>
                    ))}
                    {bellCount === 0 && (
                      <p className="px-4 py-8 text-center text-[14px] text-[var(--a-muted)]">
                        Rien de nouveau.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenu((v) => !v)}
                aria-expanded={menu}
                aria-label="Profil administrateur"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#235BF7] to-[#7C3AED] text-white text-[14px] font-bold flex items-center justify-center cursor-pointer"
              >
                BD
              </button>
              {menu && (
                <div className="absolute right-0 top-full mt-2 w-56 p-2 rounded-2xl bg-[var(--a-surface)] border border-[var(--a-border)] shadow-xl">
                  <p className="px-3 py-2 text-[13px] text-[var(--a-muted)]">
                    Connecté à Juula Admin
                  </p>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="w-full flex items-center gap-2 h-10 px-3 rounded-xl text-[14px] font-semibold text-rose-500 hover:bg-[var(--a-soft)] cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
        {/* Tabs */}
        <TabBar
          tabs={TABS.map((t) =>
            t.id === 'disputes' ? { ...t, badge: openDisputes + newReports + unreadReplies } : t,
          )}
          value={tab}
          onChange={setTab}
        />
        {tab === 'disputes' && (
          <div
            role="tablist"
            aria-label="Litiges"
            style={{ width: smUp ? 'fit-content' : '100%' }}
            className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[var(--a-surface)] border border-[var(--a-border)]"
          >
            {(
              [
                ['payments', 'Paiements & séquestre', openDisputes],
                ['reports', 'Signalements', newReports + unreadReplies],
              ] as const
            ).map(([id, label, n]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={litiges === id}
                onClick={() => setLitiges(id)}
                className={`min-h-10 px-3 sm:px-4 rounded-xl text-[13px] sm:text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                  litiges === id
                    ? 'bg-[var(--a-text)] text-[var(--a-bg)]'
                    : 'text-[var(--a-muted)] hover:text-[var(--a-text)]'
                }`}
              >
                {label}
                {n > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                    {n}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Filters + actions */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 lg:flex-1 lg:min-w-0 flex items-center gap-2 overflow-x-auto sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {showPeriod &&
              ([7, 30, 90] as Period[]).map((p) => (
                <Pill key={p} on={period === p} onClick={() => setPeriod(p)}>
                  {p} jours
                </Pill>
              ))}
            {statusPills && showPeriod && (
              <span className="shrink-0 w-px h-6 bg-[var(--a-border)] mx-1" />
            )}
            {statusPills?.map((s) => (
              <Pill key={s.id} on={statusValue === s.id} onClick={() => setStatus(s.id)}>
                {s.label}
              </Pill>
            ))}
          </div>
          <div className="lg:ml-auto lg:shrink-0 grid grid-cols-[auto_1fr] sm:flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[var(--a-surface)] border border-[var(--a-border)] text-[14px] font-semibold whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            <button
              type="button"
              onClick={() => setGrantFor('new')}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full whitespace-nowrap bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[14px] font-bold shadow-[0_8px_20px_-10px_rgba(245,158,11,0.9)] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">Accès PRO manuel</span>
              <span className="hidden sm:inline">Accorder un accès PRO manuel</span>
            </button>
          </div>
        </div>

        {tab === 'subscriptions' && (
          <SubscriptionsTab period={period} status={subFilter} tick={tick} />
        )}
        {tab === 'overview' && <OverviewTab period={period} tick={tick} />}
        {tab === 'merchants' && (
          <MerchantsTab tick={tick} onGrant={(m) => setGrantFor(m)} onChanged={changed} />
        )}
        {tab === 'stores' && <StoresTab tick={tick} onChanged={changed} />}
        {tab === 'products' && <ProductsTab tick={tick} onChanged={changed} />}
        {tab === 'disputes' && !onReports && (
          <DisputesTab period={period} status={disputeFilter} tick={tick} onChanged={changed} />
        )}
        {onReports && (
          <ReportsPanel
            status={reportFilter}
            tick={tick}
            onChanged={changed}
            focusId={focusReport}
            onFocused={() => setFocusReport(null)}
          />
        )}
        {tab === 'orders' && <OrdersTab period={period} status={orderFilter} tick={tick} />}
        {tab === 'marketing' && <MarketingTab tick={tick} />}
      </main>

      {grantFor && (
        <GrantModal
          initial={grantFor === 'new' ? null : grantFor}
          onClose={() => setGrantFor(null)}
          onDone={(message) => {
            setGrantFor(null);
            changed(message);
          }}
        />
      )}
      {toast && (
        <p
          role="status"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[95] max-w-[90vw] px-5 py-3 rounded-2xl bg-emerald-600 text-white text-[14px] font-semibold shadow-xl"
        >
          {toast}
        </p>
      )}
    </div>
  );
};
