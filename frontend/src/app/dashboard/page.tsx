'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header, HeaderWidgetsState } from '@/components/dashboard/Header';
import { CockpitView } from '@/components/dashboard/CockpitView';
import { KanbanView } from '@/components/dashboard/KanbanView';
import { WalletView } from '@/components/dashboard/WalletView';
import { WizardEditor } from '@/components/dashboard/WizardEditor';
import { ImmersiveShowcase } from '@/components/showcase/ImmersiveShowcase';
import { RechargeModal } from '@/components/dashboard/RechargeModal';
import { PayoutPageView } from '@/components/dashboard/PayoutPageView';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { initialKpis, defaultFunnelConfig, initialWallet } from '@/data/mockData';
import { CustomersView } from '@/components/dashboard/CustomersView';
import { AnalyticsView } from '@/components/dashboard/AnalyticsView';
import { SettingsView } from '@/components/dashboard/SettingsView';
import { ShareLinkBar } from '@/components/dashboard/ShareLinkBar';
import {
  EMPTY_PROFILE,
  isProfileComplete,
  OnboardingScreen,
  type StoreProfile,
} from '@/components/store/OnboardingScreen';
import { api, ApiError, clearCsrfToken } from '@/lib/api';
import { pickStoreWide } from '@/lib/store/store-fields';
import { getStoreCode } from '@/lib/orderUtils';
import { useToast } from '@/contexts/ToastContext';
import { displayFont } from '@/app/fonts';
import { applyDisplayCurrency } from '@/lib/money';
import {
  ordersInPeriod,
  ordersInPreviousPeriod,
  periodRange,
  rangeLabel,
  type PeriodId,
} from '@/lib/store/period';
import {
  DashboardTab,
  FunnelPageConfig,
  FunnelPageItem,
  FunnelPageStatus,
  KpiMetrics,
  OrderLead,
  WalletState,
} from '@/types/juula';
import { ArrowLeft, Sparkles, Smartphone, Monitor, Loader2 } from 'lucide-react';

const SAVE_DEBOUNCE_MS = 800;
const ORDERS_REFRESH_MS = 60_000;

// KPIs derived from the real orders (cancelled orders excluded).
function kpisFromOrders(orders: OrderLead[], prev: KpiMetrics): KpiMetrics {
  const live = orders.filter((o) => o.status !== 'cancelled');
  const isOnline = (o: OrderLead) => o.paymentType !== 'cod';
  const total = (o: OrderLead) => o.totalAmount ?? o.amount;
  const sum = (list: OrderLead[]) => list.reduce((acc, o) => acc + total(o), 0);
  const online = live.filter(isOnline);
  const cod = live.filter((o) => !isOnline(o));
  return {
    ...prev,
    ordersBreakdown: {
      ...prev.ordersBreakdown,
      total: live.length,
      codCount: cod.length,
      onlineCount: online.length,
    },
    revenue: {
      ...prev.revenue,
      total: sum(live),
      onlineAmount: sum(online),
      codAmount: sum(cod),
    },
  };
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && typeof err.body.message === 'string') return err.body.message;
  return fallback;
}

export default function JuulaStoreApp() {
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<'loading' | 'onboarding' | 'ready' | 'error'>('loading');
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(EMPTY_PROFILE);
  // Order opened from the "new order" email link (?commande=CMD-…).
  const [focusOrderId, setFocusOrderId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  const [activeTab, setActiveTab] = useState<DashboardTab>('cockpit');
  const [viewMode, setViewMode] = useState<'dashboard' | 'vitrine'>('dashboard');
  const [previewDevice, setPreviewDevice] = useState<'responsive' | 'mobile'>('responsive');
  const [orders, setOrdersState] = useState<OrderLead[]>([]);
  const [kpis, setKpis] = useState<KpiMetrics>(initialKpis);
  const [wallet, setWallet] = useState<WalletState>(initialWallet);

  // Multi-Pages / Multi-Tunnels Management State
  const [funnelPages, setFunnelPages] = useState<FunnelPageItem[]>([]);
  const [activePageId, setActivePageId] = useState<string>('');
  const [funnelConfig, setFunnelConfig] = useState<FunnelPageConfig>(defaultFunnelConfig);

  const setOrders = useCallback((next: OrderLead[]) => {
    setOrdersState(next);
    setKpis((prev) => kpisFromOrders(next, prev));
  }, []);

  const [payoutSecurity, setPayoutSecurity] = useState({
    isPinSet: false,
    pinCode: '',
    maskedPin: 'Non configuré',
    recoveryEmail: '',
  });

  // Wallet = server ledger (paid online orders, withdrawable 72h after
  // payment, minus withdrawals). Never computed in the browser.
  const loadWallet = useCallback(async () => {
    const res = await api<{ wallet: WalletState; hasWithdrawalPin: boolean }>('/api/wallet');
    setWallet(res.wallet);
    setPayoutSecurity((prev) => ({
      ...prev,
      isPinSet: res.hasWithdrawalPin,
      maskedPin: res.hasWithdrawalPin ? '••••••' : 'Non configuré',
    }));
  }, []);

  // ---------------------------------------------------------------------
  // Session + initial load. Not signed in → /login.
  // ---------------------------------------------------------------------
  const failBoot = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        // Come back to the same place (e.g. a specific order) after login.
        const back = window.location.pathname + window.location.search;
        router.replace(`/login?next=${encodeURIComponent(back)}`);
        return;
      }
      setLoadError(
        errorMessage(err, 'Impossible de charger votre boutique. Vérifiez votre connexion.'),
      );
      setSession('error');
    },
    [router],
  );

  /** Products, orders and wallet — once the store has its name/address. */
  const loadStoreData = useCallback(async () => {
    const [{ products }, { orders: loadedOrders }] = await Promise.all([
      api<{ products: FunnelPageItem[] }>('/api/products'),
      api<{ orders: OrderLead[] }>('/api/store/orders'),
      loadWallet(),
    ]);
    let pages = products;
    if (pages.length === 0) {
      // New store: start the merchant with one draft product.
      const created = await api<{ product: FunnelPageItem }>('/api/products', {
        method: 'POST',
        body: { internalName: 'Mon Premier Produit' },
      });
      pages = [created.product];
    }
    setFunnelPages(pages);
    setActivePageId(pages[0]!.id);
    setFunnelConfig(pages[0]!.config);
    setOrders(loadedOrders);

    const wanted = new URLSearchParams(window.location.search).get('commande');
    if (wanted) {
      if (loadedOrders.some((o) => o.id === wanted)) {
        setActiveTab('kanban');
        setFocusOrderId(wanted);
      } else {
        toast('Commande introuvable sur cette boutique.', 'error');
      }
      window.history.replaceState(null, '', window.location.pathname);
    }
    setSession('ready');
  }, [loadWallet, setOrders, toast]);

  // ---------------------------------------------------------------------
  // Session + initial load. Not signed in → /login. No store address yet →
  // onboarding (name + <shop>.juula.store) before anything else.
  // ---------------------------------------------------------------------
  const bootStarted = useRef(false);
  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;
    (async () => {
      try {
        const me = await api<{ user: { email: string } }>('/api/auth/me');
        setUserEmail(me.user.email);
        setPayoutSecurity((prev) => ({ ...prev, recoveryEmail: me.user.email }));

        // Check if returning from Moneriz subscription payment
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const subId = params.get('sub_id');
          const subStatus = params.get('sub_status');
          if (subStatus === 'success' && subId) {
            try {
              const verified = await api<{ status: string; plan: 'FREE' | 'PRO' }>(
                '/api/store/subscription/verify',
                {
                  method: 'POST',
                  body: { subscriptionId: subId },
                },
              );
              if (verified.status === 'active') {
                toast('🎉 Félicitations ! Votre Plan Juula Pro est désormais actif.', 'success');
              }
            } catch {
              // Webhook or background verify handles it
            }
            window.history.replaceState({}, '', '/dashboard');
          }
        }

        const { store } = await api<{ store: StoreProfile }>('/api/store');
        setStoreProfile(store);
        // Display currency (FCFA / € / $) before any amount is rendered.
        await applyDisplayCurrency(store.displayCurrency ?? 'XOF');
        if (!isProfileComplete(store)) {
          setSession('onboarding');
          return;
        }
        await loadStoreData();
      } catch (err) {
        failBoot(err);
      }
    })();
  }, [loadStoreData, failBoot, toast]);

  const handleOnboarded = (profile: StoreProfile) => {
    setStoreProfile(profile);
    setSession('loading');
    loadStoreData().catch(failBoot);
  };

  // New orders arrive from public product pages: refresh periodically and
  // whenever the merchant comes back to the tab.
  const refreshOrders = useCallback(async () => {
    try {
      const [{ orders: latest }] = await Promise.all([
        api<{ orders: OrderLead[] }>('/api/store/orders'),
        loadWallet(),
      ]);
      setOrders(latest);
    } catch {
      // Silent: the next tick retries.
    }
  }, [setOrders, loadWallet]);

  useEffect(() => {
    if (session !== 'ready') return;
    const timer = setInterval(refreshOrders, ORDERS_REFRESH_MS);
    const onFocus = () => void refreshOrders();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [session, refreshOrders]);

  // ---------------------------------------------------------------------
  // Persistence: product configs are saved (debounced, per product).
  // ---------------------------------------------------------------------
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const persistConfig = useCallback(
    (config: FunnelPageConfig, immediate = false) => {
      const timers = saveTimers.current;
      const pending = timers.get(config.id);
      if (pending) clearTimeout(pending);
      const run = () => {
        timers.delete(config.id);
        api(`/api/products/${encodeURIComponent(config.id)}`, {
          method: 'PATCH',
          body: { config },
        }).catch((err) =>
          toast(errorMessage(err, 'La sauvegarde a échoué. Vérifiez votre connexion.'), 'error'),
        );
      };
      if (immediate) run();
      else timers.set(config.id, setTimeout(run, SAVE_DEBOUNCE_MS));
    },
    [toast],
  );

  // Filter & Dashboard Widget Customization States
  // Period filter: drives KPIs, revenue chart and analytics (not the Kanban).
  const [periodId, setPeriodId] = useState<PeriodId>('30d');
  const range = useMemo(() => periodRange(periodId), [periodId]);
  const periodOrders = useMemo(() => ordersInPeriod(orders, range), [orders, range]);
  const previousOrders = useMemo(() => ordersInPreviousPeriod(orders, range), [orders, range]);
  const periodKpis = useMemo(() => kpisFromOrders(periodOrders, kpis), [periodOrders, kpis]);
  // Header search → Kanban filter.
  const [orderSearch, setOrderSearch] = useState('');
  const [activeWidgets, setActiveWidgets] = useState<HeaderWidgetsState>({
    kpiCards: true,
    profitChart: true,
    segmentation: true,
    activeDays: true,
    deliveryRate: true,
    aiAssistant: true,
    bestProducts: true,
  });

  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [isPayoutPageOpen, setIsPayoutPageOpen] = useState(false);

  // Withdrawal PIN lives server-side (bcrypt). Setting a new one replaces
  // the old: the merchant is already authenticated by their Google session.
  const handleSetWithdrawalPin = async (newPin: string) => {
    try {
      if (payoutSecurity.isPinSet) await api('/api/auth/withdrawal-pin', { method: 'DELETE' });
      await api('/api/auth/withdrawal-pin', { method: 'POST', body: { newPin } });
      setPayoutSecurity((prev) => ({ ...prev, isPinSet: true, maskedPin: '••••••' }));
      toast('Code PIN de retrait enregistré.', 'success');
    } catch (err) {
      toast(errorMessage(err, "Le code PIN n'a pas pu être enregistré."), 'error');
    }
  };

  // Funnel pages operations
  const handleSelectPage = (pageId: string) => {
    const target = funnelPages.find((p) => p.id === pageId);
    if (target) {
      setActivePageId(pageId);
      setFunnelConfig(target.config);
    }
  };

  const handleCreateNewPage = async (internalName: string) => {
    try {
      const { product } = await api<{ product: FunnelPageItem }>('/api/products', {
        method: 'POST',
        body: { internalName: internalName.trim() || 'Nouveau produit' },
      });
      setFunnelPages((prev) => [product, ...prev]);
      setActivePageId(product.id);
      setFunnelConfig(product.config);
      toast('Produit créé — son lien est prêt à être partagé une fois publié.', 'success');
    } catch (err) {
      toast(errorMessage(err, 'La création du produit a échoué.'), 'error');
    }
  };

  // Status goes through the same save path as the config (the server reads
  // it from config.status), flushed immediately so a pending debounced save
  // can't overwrite it with the old status.
  const handleTogglePageStatus = (pageId: string, newStatus: FunnelPageStatus) => {
    const page = funnelPages.find((p) => p.id === pageId);
    if (!page) return;
    const base = pageId === activePageId ? funnelConfig : page.config;
    const updatedConfig: FunnelPageConfig = { ...base, status: newStatus };
    setFunnelPages((prev) =>
      prev.map((p) =>
        p.id === pageId
          ? { ...p, status: newStatus, updatedAt: "À l'instant", config: updatedConfig }
          : p,
      ),
    );
    if (pageId === activePageId) setFunnelConfig(updatedConfig);
    persistConfig(updatedConfig, true);
    if (newStatus === 'published') toast('Page publiée : votre lien est en ligne !', 'success');
  };

  const handleDeletePage = (pageId: string) => {
    if (funnelPages.length <= 1) return;
    const previous = funnelPages;
    const filtered = funnelPages.filter((p) => p.id !== pageId);
    const pending = saveTimers.current.get(pageId);
    if (pending) {
      clearTimeout(pending);
      saveTimers.current.delete(pageId);
    }
    setFunnelPages(filtered);
    if (activePageId === pageId) {
      const next = filtered[0];
      if (next) {
        setActivePageId(next.id);
        setFunnelConfig(next.config);
      }
    }
    api(`/api/products/${encodeURIComponent(pageId)}`, { method: 'DELETE' }).catch((err) => {
      setFunnelPages(previous);
      toast(errorMessage(err, 'La suppression a échoué.'), 'error');
    });
  };

  const handleSaveFunnelConfig = (updated: FunnelPageConfig) => {
    setFunnelConfig(updated);
    setFunnelPages((prev) =>
      prev.map((page) =>
        page.id === updated.id
          ? {
              ...page,
              internalName: updated.internalName || page.internalName,
              status: updated.status || page.status,
              updatedAt: "À l'instant",
              config: updated,
            }
          : page,
      ),
    );
    persistConfig(updated);
  };

  // Paramètres: store-wide fields (name, delivery, payment methods…) apply
  // to every product page, not only the one being edited.
  const handleSaveStoreSettings = (updated: FunnelPageConfig) => {
    const shared = pickStoreWide(updated);
    const nextPages = funnelPages.map((page) => {
      const base = page.id === activePageId ? funnelConfig : page.config;
      return { ...page, config: { ...base, ...shared } };
    });
    setFunnelPages(nextPages);
    setFunnelConfig((prev) => ({ ...prev, ...shared }));
    for (const page of nextPages) persistConfig(page.config, true);
  };

  // Paramètres → name / address saved server-side (the server already wrote
  // the name into every product); mirror it locally.
  // Bumped to re-render every amount after the display currency changes.
  const [, setCurrencyTick] = useState(0);

  const handleStoreProfileSaved = (profile: StoreProfile) => {
    setStoreProfile(profile);
    void applyDisplayCurrency(profile.displayCurrency ?? 'XOF').then(() =>
      setCurrencyTick((t) => t + 1),
    );
    if (!profile.name) return;
    const patch = { storeName: profile.name, storeCode: getStoreCode(profile.name) };
    setFunnelPages((prev) => prev.map((p) => ({ ...p, config: { ...p.config, ...patch } })));
    setFunnelConfig((prev) => ({ ...prev, ...patch }));
  };

  // Kanban moves: persist every order whose status changed.
  const handleOrdersChange = (next: OrderLead[]) => {
    const previous = orders;
    const before = new Map(previous.map((o) => [o.id, o.status]));
    const changed = next.filter((o) => before.has(o.id) && before.get(o.id) !== o.status);
    setOrders(next);
    for (const order of changed) {
      api(`/api/store/orders/${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        body: { status: order.status },
      }).catch((err) => {
        setOrders(previous);
        toast(errorMessage(err, "Le statut de la commande n'a pas pu être enregistré."), 'error');
      });
    }
  };

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // Cookies may already be gone; continue to the login page.
    }
    clearCsrfToken();
    router.replace('/login');
  };

  // Recharging credits
  const handleRecharged = (creditsAdded: number) => {
    setKpis((prev) => ({
      ...prev,
      leadCredits: {
        ...prev.leadCredits,
        remaining: prev.leadCredits.remaining + creditsAdded,
        total: prev.leadCredits.total + creditsAdded,
      },
    }));
  };

  // Payout request success
  // A payout was accepted by the server: reload the ledger (balance,
  // history) instead of computing it locally.
  const handlePayoutSuccess = () => {
    void loadWallet().catch(() => undefined);
  };

  const newOrdersCount = orders.filter((o) => o.status === 'new').length;

  if (session === 'onboarding') {
    return <OnboardingScreen email={userEmail} initial={storeProfile} onDone={handleOnboarded} />;
  }

  if (session !== 'ready') {
    return (
      <div
        className={`${displayFont.className} min-h-screen bg-[#EDEFF3] flex items-center justify-center p-4`}
      >
        {session === 'loading' ? (
          <div className="flex items-center gap-3 text-sm font-bold text-[#7A808C]">
            <Loader2 className="w-5 h-5 animate-spin text-[#235BF7]" />
            Chargement de votre boutique…
          </div>
        ) : (
          <div className="max-w-sm text-center space-y-3">
            <p className="text-sm font-semibold text-[#201D1D]">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#235BF7] text-white text-xs font-black cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${displayFont.className} min-h-screen bg-[#EDEFF3] text-[#201D1D] flex flex-col`}
    >
      {/* ======================================================== */}
      {/* VUE 2 : VITRINE IMMERSIVE (DESKTOP & MOBILE RESPONSIVE)  */}
      {/* ======================================================== */}
      {viewMode === 'vitrine' ? (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
          {/* Top Control & Return Bar */}
          <div className="w-full bg-[#201D1D] text-white py-2.5 px-4 sm:px-8 flex items-center justify-between text-xs sticky top-0 z-50 shadow-md">
            <button
              onClick={() => setViewMode('dashboard')}
              className="inline-flex items-center gap-1.5 font-bold hover:text-white/80 transition-colors cursor-pointer bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour au Dashboard Marchand</span>
            </button>

            {/* Mode Switcher : Plein Écran Responsive vs Simulateur Mobile */}
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
              <button
                onClick={() => setPreviewDevice('responsive')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  previewDevice === 'responsive'
                    ? 'bg-[#235BF7] text-white shadow-xs'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Plein Écran (PC / Responsive)</span>
                <span className="sm:hidden">PC</span>
              </button>

              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'bg-[#235BF7] text-white shadow-xs'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Simulateur Mobile</span>
                <span className="sm:hidden">Mobile</span>
              </button>
            </div>

            <span className="hidden md:flex items-center gap-1.5 text-amber-300 font-bold bg-amber-400/10 px-2.5 py-1 rounded-xl">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Aperçu Client Final</span>
            </span>
          </div>

          {/* Container according to chosen mode */}
          <div className="flex-1 flex justify-center p-0">
            {previewDevice === 'mobile' ? (
              <div className="py-6 px-4 w-full flex justify-center bg-slate-950 min-h-[calc(100vh-50px)]">
                {/* Modern Smartphone Mockup Frame */}
                <div className="w-[390px] max-w-full h-[820px] max-h-[calc(100vh-80px)] bg-[#F8FAFC] rounded-[3.2rem] border-[10px] border-neutral-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden relative flex flex-col ring-1 ring-white/10">
                  {/* Dynamic Island Notch */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 flex items-center justify-end pr-2 pointer-events-none shadow-sm">
                    <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-700" />
                  </div>

                  {/* Scrollable Mobile Screen Content */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin">
                    <ImmersiveShowcase config={funnelConfig} isInsideMockup={true} />
                  </div>

                  {/* iOS Style Home Indicator Bar */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/40 rounded-full z-50 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="w-full">
                <ImmersiveShowcase config={funnelConfig} isInsideMockup={false} />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* VUE 1 : DASHBOARD MARCHAND                               */
        /* ======================================================== */
        <div className="flex min-h-screen lg:p-3 lg:gap-3">
          {/* Sidebar */}
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            leadCreditsRemaining={kpis.leadCredits.remaining}
            leadCreditsTotal={kpis.leadCredits.total}
            onOpenRecharge={() => setIsRechargeOpen(true)}
            onOpenStorefrontPreview={() => setViewMode('vitrine')}
            newOrdersCount={newOrdersCount}
            availableBalance={wallet.availableBalance}
            currency={wallet.currency}
            userEmail={userEmail}
            onLogout={handleLogout}
            plan={storeProfile.plan || 'FREE'}
            planExpiresAt={storeProfile.planExpiresAt}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#EDEFF3] lg:rounded-[32px] lg:bg-[#F6F7F9] lg:border lg:border-white lg:overflow-hidden">
            {/* Header */}
            <Header
              activeTab={activeTab}
              onTabChange={(tab) => {
                setIsPayoutPageOpen(false);
                setActiveTab(tab);
              }}
              leadCreditsRemaining={kpis.leadCredits.remaining}
              availableBalance={wallet.availableBalance}
              currency={wallet.currency}
              onOpenRecharge={() => setIsRechargeOpen(true)}
              onOpenPayoutModal={() => setIsPayoutPageOpen(true)}
              onOpenStorefrontPreview={() => setViewMode('vitrine')}
              onCreatePageClick={() => {
                setIsPayoutPageOpen(false);
                setActiveTab('wizard');
              }}
              periodId={periodId}
              onSelectPeriod={setPeriodId}
              dateRangeLabel={rangeLabel(range)}
              orders={orders}
              payouts={wallet.payoutHistory}
              avatarUrl={storeProfile.logoUrl}
              storeName={storeProfile.name ?? funnelConfig.storeName}
              onOpenOrder={(reference) => {
                setIsPayoutPageOpen(false);
                setActiveTab('kanban');
                setFocusOrderId(reference);
              }}
              onSearch={(q) => {
                setOrderSearch(q);
                setIsPayoutPageOpen(false);
                setActiveTab('kanban');
              }}
              activeWidgets={activeWidgets}
              onToggleWidget={(key) =>
                setActiveWidgets((prev) => ({
                  ...prev,
                  [key]: !prev[key],
                }))
              }
            />

            {/* Dynamic Content View */}
            <main className="flex-1 p-4 sm:p-8 pb-28 lg:pb-8 max-w-7xl w-full mx-auto motion-safe:animate-[rise_600ms_cubic-bezier(.2,.75,.2,1)]">
              {isPayoutPageOpen ? (
                <PayoutPageView
                  availableBalance={wallet.availableBalance}
                  currency={wallet.currency}
                  onBack={() => setIsPayoutPageOpen(false)}
                  onPayoutSuccess={handlePayoutSuccess}
                  payoutSecurity={payoutSecurity}
                  onUpdateSecurityPin={(newPin) => void handleSetWithdrawalPin(newPin)}
                  onGoToSettings={() => {
                    setIsPayoutPageOpen(false);
                    setActiveTab('settings');
                  }}
                />
              ) : (
                <>
                  {activeTab === 'cockpit' && (
                    <CockpitView
                      kpis={periodKpis}
                      wallet={wallet}
                      funnelConfig={funnelConfig}
                      recentOrders={periodOrders}
                      previousOrders={previousOrders}
                      periodRange={range}
                      onCreatePageClick={() => setActiveTab('wizard')}
                      onOpenRecharge={() => setIsRechargeOpen(true)}
                      onOpenPayoutModal={() => setIsPayoutPageOpen(true)}
                      onOpenStorefrontPreview={() => setViewMode('vitrine')}
                      onOpenKanban={() => setActiveTab('kanban')}
                      onOpenWallet={() => setActiveTab('wallet')}
                      activeWidgets={activeWidgets}
                    />
                  )}

                  {activeTab === 'kanban' && (
                    <KanbanView
                      orders={orders}
                      onOrdersChange={handleOrdersChange}
                      onOpenStorefrontPreview={() => setViewMode('vitrine')}
                      focusOrderId={focusOrderId}
                      searchQuery={orderSearch}
                    />
                  )}

                  {activeTab === 'wallet' && (
                    <WalletView
                      wallet={wallet}
                      orders={orders}
                      onOpenPayoutModal={() => setIsPayoutPageOpen(true)}
                    />
                  )}

                  {activeTab === 'wizard' && (
                    <>
                      <ShareLinkBar
                        slug={funnelConfig.slug}
                        subdomain={storeProfile.subdomain}
                        status={funnelConfig.status ?? 'draft'}
                        productTitle={funnelConfig.productTitle}
                        onPublish={() => handleTogglePageStatus(funnelConfig.id, 'published')}
                      />
                      <WizardEditor
                        initialConfig={funnelConfig}
                        onSaveConfig={handleSaveFunnelConfig}
                        onOpenStorefrontPreview={() => setViewMode('vitrine')}
                        onOpenMobileSimulator={() => {
                          setViewMode('vitrine');
                          setPreviewDevice('mobile');
                        }}
                        pages={funnelPages}
                        activePageId={activePageId}
                        onSelectPage={handleSelectPage}
                        onCreatePage={handleCreateNewPage}
                        onUpdatePageStatus={handleTogglePageStatus}
                        onDeletePage={handleDeletePage}
                      />
                    </>
                  )}

                  {activeTab === 'customers' && (
                    <CustomersView orders={orders} storeName={funnelConfig.storeName} />
                  )}

                  {activeTab === 'analytics' && (
                    <AnalyticsView
                      kpis={periodKpis}
                      orders={periodOrders}
                      onOpenStorefrontPreview={() => setViewMode('vitrine')}
                    />
                  )}

                  {activeTab === 'settings' && (
                    <SettingsView
                      funnelConfig={funnelConfig}
                      onSaveConfig={handleSaveStoreSettings}
                      payoutSecurity={payoutSecurity}
                      onUpdateSecurityPin={(newPin) => void handleSetWithdrawalPin(newPin)}
                      storeProfile={storeProfile}
                      onStoreProfileSaved={handleStoreProfileSaved}
                    />
                  )}
                </>
              )}
            </main>

            {/* Mobile Bottom Navigation Bar */}
            <MobileBottomNav
              activeTab={activeTab}
              onTabChange={(tab) => {
                setIsPayoutPageOpen(false);
                setActiveTab(tab);
              }}
              onOpenStorefrontPreview={() => setViewMode('vitrine')}
              newOrdersCount={newOrdersCount}
            />
          </div>
        </div>
      )}

      {/* Recharge / Plan Upgrade Modal */}
      <RechargeModal
        isOpen={isRechargeOpen}
        onClose={() => setIsRechargeOpen(false)}
        onRecharged={handleRecharged}
        currentPlan={storeProfile.plan || 'FREE'}
        planExpiresAt={storeProfile.planExpiresAt}
      />
    </div>
  );
}
