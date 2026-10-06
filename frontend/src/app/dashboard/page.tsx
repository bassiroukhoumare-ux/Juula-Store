'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header, HeaderWidgetsState } from '@/components/dashboard/Header';
import { CockpitView } from '@/components/dashboard/CockpitView';
import { KanbanView } from '@/components/dashboard/KanbanView';
import { WalletView } from '@/components/dashboard/WalletView';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { ProductsListView } from '@/components/dashboard/ProductsListView';
import { MarketingView } from '@/components/dashboard/MarketingView';
import { BoutiqueView } from '@/components/dashboard/BoutiqueView';
import type { SettingsSection } from '@/components/dashboard/SettingsView';
import { NotificationsView } from '@/components/dashboard/NotificationsView';
import type { MerchantNotification } from '@/lib/store/notification-types';
import { PublishPlanModal } from '@/components/dashboard/PublishPlanModal';
import {
  savePendingPublish,
  takePendingPublish,
  type PendingPublish,
} from '@/lib/store/pending-publish';
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
  type CustomDates,
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
import { ArrowLeft } from 'lucide-react';

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

  const [activeTab, setActiveTabRaw] = useState<DashboardTab>('cockpit');
  // « Pages de vente » and « Produits » are one page now (Pages produits).
  const setActiveTab = useCallback(
    (tab: DashboardTab) => setActiveTabRaw(tab === 'wizard' ? 'products' : tab),
    [],
  );
  const [viewMode, setViewMode] = useState<'dashboard' | 'vitrine'>('dashboard');
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
    setFunnelPages(products);
    const first = products[0];
    if (first) {
      setActivePageId(first.id);
      setFunnelConfig(first.config);
    }
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
          if (subStatus === 'cancelled' && takePendingPublish()) {
            toast('Paiement annulé : la publication n’a pas été faite.', 'error');
            window.history.replaceState({}, '', '/dashboard');
          }
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
                toast('Votre abonnement est actif : vos pages peuvent être en ligne.', 'success');
                const intent = takePendingPublish();
                if (intent) setPendingPublish(intent);
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
  const [customDates, setCustomDates] = useState<CustomDates | null>(null);
  const range = useMemo(
    () => periodRange(periodId, new Date(), customDates),
    [periodId, customDates],
  );
  const selectPeriod = useCallback((id: PeriodId, custom?: CustomDates) => {
    setPeriodId(id);
    if (custom) setCustomDates(custom);
  }, []);
  const periodOrders = useMemo(() => ordersInPeriod(orders, range), [orders, range]);
  const previousOrders = useMemo(() => ordersInPreviousPeriod(orders, range), [orders, range]);
  const periodKpis = useMemo(() => kpisFromOrders(periodOrders, kpis), [periodOrders, kpis]);
  // Header search → Kanban filter.
  const [orderSearch, setOrderSearch] = useState('');
  // Pages de vente: product list first; the editor opens on « Modifier ».
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [createSignal, setCreateSignal] = useState(0);
  const [settingsSection, setSettingsSection] = useState<SettingsSection | undefined>(undefined);
  useEffect(() => {
    if (activeTab !== 'settings') setSettingsSection(undefined);
  }, [activeTab]);
  // Changing tab closes the editor, unless the change is « open this product ».
  const keepEditorRef = useRef(false);
  useEffect(() => {
    if (keepEditorRef.current) keepEditorRef.current = false;
    else setIsEditingProduct(false);
  }, [activeTab]);
  const openProductEditor = (id: string) => {
    handleSelectPage(id);
    keepEditorRef.current = activeTab !== 'products';
    setActiveTab('products');
    setIsEditingProduct(true);
  };
  // Shop colour (Boutique → Couverture & identité), reloaded when opening a preview.
  const [storeAccent, setStoreAccent] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (session !== 'ready' || viewMode !== 'vitrine') return;
    api<{ settings: { accent: string } }>('/api/store/storefront')
      .then(({ settings }) => setStoreAccent(settings.accent))
      .catch(() => undefined);
  }, [session, viewMode]);
  // Sales-page preview shows the store's own logo, name and colour, like the public page.
  const previewConfig = useMemo(
    () => ({
      ...funnelConfig,
      storeLogoUrl: storeProfile.logoUrl,
      ...(storeProfile.name ? { storeName: storeProfile.name } : {}),
      ...(storeAccent ? { storeAccent } : {}),
    }),
    [funnelConfig, storeProfile.logoUrl, storeProfile.name, storeAccent],
  );
  // Cockpit blocks (the AI assistant is hidden for now).
  const activeWidgets: HeaderWidgetsState = {
    kpiCards: true,
    profitChart: true,
    segmentation: true,
    activeDays: true,
    deliveryRate: true,
    aiAssistant: false,
    bestProducts: true,
  };

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

  const handleCreateNewPage = async (internalName: string): Promise<FunnelPageItem | null> => {
    try {
      const { product } = await api<{ product: FunnelPageItem }>('/api/products', {
        method: 'POST',
        body: { internalName: internalName.trim() || 'Nouveau produit' },
      });
      setFunnelPages((prev) => [product, ...prev]);
      setActivePageId(product.id);
      setFunnelConfig(product.config);
      toast('Produit créé — son lien est prêt à être partagé une fois publié.', 'success');
      return product;
    } catch (err) {
      toast(errorMessage(err, 'La création du produit a échoué.'), 'error');
      return null;
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

  // Publishing on the Free plan first shows the plan chooser (Free / Pro).
  const isPro = storeProfile.plan === 'PRO';
  const [publishPrompt, setPublishPrompt] = useState<{
    subject: string;
    publish: () => void;
    intent: PendingPublish;
  } | null>(null);
  const requestPublish = (subject: string, publish: () => void, intent: PendingPublish) => {
    if (isPro) publish();
    else setPublishPrompt({ subject, publish, intent });
  };
  const setPageStatus = (pageId: string, status: FunnelPageStatus) => {
    const page = funnelPages.find((p) => p.id === pageId);
    if (status === 'published' && page && page.status !== 'published') {
      requestPublish('cette page produit', () => handleTogglePageStatus(pageId, status), {
        kind: 'product',
        id: pageId,
      });
    } else {
      handleTogglePageStatus(pageId, status);
    }
  };

  // Boutique: product-level shop fields (category, featured, visible).
  const handleUpdateProduct = (pageId: string, patch: Partial<FunnelPageConfig>) => {
    const page = funnelPages.find((p) => p.id === pageId);
    if (!page) return;
    const base = pageId === activePageId ? funnelConfig : page.config;
    const updated: FunnelPageConfig = { ...base, ...patch };
    setFunnelPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, config: updated } : p)));
    if (pageId === activePageId) setFunnelConfig(updated);
    persistConfig(updated, true);
  };

  // Pro paid → run the publication the merchant asked for before paying.
  const [pendingPublish, setPendingPublish] = useState<PendingPublish | null>(null);
  useEffect(() => {
    if (!pendingPublish || session !== 'ready') return;
    setPendingPublish(null);
    if (pendingPublish.kind === 'product') {
      if (funnelPages.some((p) => p.id === pendingPublish.id)) {
        handleTogglePageStatus(pendingPublish.id, 'published');
      }
    } else {
      api('/api/store/storefront', { method: 'PATCH', body: { published: true } })
        .then(() => toast('Votre boutique est en ligne !', 'success'))
        .catch((err) =>
          toast(errorMessage(err, 'La publication de la boutique a échoué.'), 'error'),
        );
    }
  }, [pendingPublish, session]);

  const handleDeletePage = (pageId: string) => {
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
      } else {
        setActivePageId('');
      }
      setIsEditingProduct(false);
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

  // Notifications: real feed from the server (orders + withdrawals), with
  // read / deleted state stored server-side.
  const [notificationFeed, setNotificationFeed] = useState<{
    items: MerchantNotification[];
    unread: number;
  } | null>(null);
  const loadNotifications = useCallback(() => {
    api<{ items: MerchantNotification[]; unread: number }>('/api/store/notifications')
      .then(setNotificationFeed)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (session !== 'ready') return;
    loadNotifications();
    const timer = setInterval(loadNotifications, 60_000);
    return () => clearInterval(timer);
  }, [session, loadNotifications, orders.length]);
  const handleNotificationAction = async (
    keys: string[] | 'all',
    action: 'read' | 'unread' | 'delete',
  ) => {
    try {
      const feed = await api<{ items: MerchantNotification[]; unread: number }>(
        '/api/store/notifications',
        { method: 'PATCH', body: keys === 'all' ? { all: true, action } : { keys, action } },
      );
      setNotificationFeed(feed);
    } catch (err) {
      toast(errorMessage(err, 'L’action a échoué. Réessayez.'), 'error');
    }
  };
  const openNotification = (n: MerchantNotification) => {
    if (!n.read) void handleNotificationAction([n.key], 'read');
    setIsPayoutPageOpen(false);
    setActiveTab(n.target.tab);
    if (n.target.order) setFocusOrderId(n.target.order);
  };

  const handleConfirmDirectPayment = (reference: string) => {
    api<{ order: OrderLead }>(`/api/store/orders/${encodeURIComponent(reference)}`, {
      method: 'PATCH',
      body: { paymentReceived: true },
    })
      .then(({ order }) => {
        setOrders(orders.map((o) => (o.id === order.id ? order : o)));
        toast('Paiement confirmé.', 'success');
      })
      .catch((err) => toast(errorMessage(err, 'La confirmation a échoué.'), 'error'));
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

  if (session === 'loading') {
    return (
      <div className={`${displayFont.className} min-h-screen bg-[#EDEFF3]`}>
        <DashboardSkeleton />
      </div>
    );
  }

  if (session !== 'ready') {
    return (
      <div
        className={`${displayFont.className} min-h-screen bg-[#EDEFF3] flex items-center justify-center p-4`}
      >
        {
          <div className="max-w-sm text-center space-y-3">
            <p className="text-sm font-semibold text-[#201D1D]">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#235BF7] text-white text-xs font-black cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        }
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
        <div className="min-h-screen bg-[#F6F7F9]">
          <ImmersiveShowcase config={previewConfig} isInsideMockup={false} />

          {/* Return button: small, in the empty left slot of the store header */}
          <button
            type="button"
            onClick={() => setViewMode('dashboard')}
            aria-label="Retour au tableau de bord"
            className="fixed top-3 sm:top-4 left-3 sm:left-6 z-50 inline-flex items-center justify-center gap-2 w-10 sm:w-auto sm:px-4 h-10 rounded-full bg-white border border-[#E3E7EE] text-[#201D1D] text-[14px] font-semibold hover:bg-[#F6F7F9] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#235BF7]" />
            <span className="hidden sm:inline">Retour au tableau de bord</span>
          </button>
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
            onOpenStorefrontPreview={() => setViewMode('vitrine')}
            newOrdersCount={newOrdersCount}
            userEmail={userEmail}
            onLogout={handleLogout}
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
                setIsEditingProduct(false);
                setActiveTab('products');
                setCreateSignal((n) => n + 1);
              }}
              periodId={periodId}
              customDates={customDates}
              onSelectPeriod={selectPeriod}
              dateRangeLabel={rangeLabel(range)}
              unreadNotifications={notificationFeed?.unread ?? 0}
              avatarUrl={storeProfile.logoUrl}
              storeName={storeProfile.name ?? funnelConfig.storeName}
              onSearch={(q) => {
                setOrderSearch(q);
                setIsPayoutPageOpen(false);
                setActiveTab('kanban');
              }}
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
                      products={funnelPages}
                      recentOrders={periodOrders}
                      previousOrders={previousOrders}
                      periodRange={range}
                      onCreatePageClick={() => setActiveTab('products')}
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
                      onConfirmDirectPayment={handleConfirmDirectPayment}
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

                  {activeTab === 'notifications' && (
                    <NotificationsView
                      items={notificationFeed?.items ?? null}
                      unread={notificationFeed?.unread ?? 0}
                      onAction={handleNotificationAction}
                      onOpen={openNotification}
                    />
                  )}

                  {activeTab === 'storefront' && (
                    <BoutiqueView
                      onCreateProduct={handleCreateNewPage}
                      onEditProduct={openProductEditor}
                      storeName={storeProfile.name ?? undefined}
                      pages={funnelPages}
                      onUpdateProduct={handleUpdateProduct}
                      onRequestPublish={(subject, publish) =>
                        requestPublish(subject, publish, { kind: 'storefront' })
                      }
                    />
                  )}

                  {(activeTab === 'wizard' || activeTab === 'products') &&
                    (isEditingProduct && activePageId ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditingProduct(false)}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E3E7EE] text-[14px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4 text-[#235BF7]" />
                          Mes pages produits
                        </button>
                        <ShareLinkBar
                          slug={funnelConfig.slug}
                          subdomain={storeProfile.subdomain}
                          status={funnelConfig.status ?? 'draft'}
                          productTitle={funnelConfig.productTitle}
                          onPublish={() => setPageStatus(funnelConfig.id, 'published')}
                        />
                        <WizardEditor
                          initialConfig={funnelConfig}
                          onSaveConfig={handleSaveFunnelConfig}
                          onOpenStorefrontPreview={() => setViewMode('vitrine')}
                          pages={funnelPages}
                          activePageId={activePageId}
                          onSelectPage={handleSelectPage}
                          onCreatePage={handleCreateNewPage}
                          onUpdatePageStatus={setPageStatus}
                          onDeletePage={handleDeletePage}
                        />
                      </>
                    ) : (
                      <ProductsListView
                        key={activeTab}
                        mode="catalog"
                        onSetShopVisibility={(id, visible) =>
                          handleUpdateProduct(id, { showInStore: visible })
                        }
                        pages={funnelPages}
                        subdomain={storeProfile.subdomain}
                        createSignal={createSignal}
                        onCreate={async (name) => {
                          if (await handleCreateNewPage(name)) setIsEditingProduct(true);
                        }}
                        onEdit={(id) => {
                          handleSelectPage(id);
                          setIsEditingProduct(true);
                        }}
                        onPreview={(id) => {
                          handleSelectPage(id);
                          setViewMode('vitrine');
                        }}
                        onSetStatus={setPageStatus}
                        onDelete={handleDeletePage}
                      />
                    ))}

                  {activeTab === 'customers' && (
                    <CustomersView orders={orders} storeName={funnelConfig.storeName} />
                  )}

                  {activeTab === 'marketing' && (
                    <MarketingView pages={funnelPages} onUpdateProduct={handleUpdateProduct} />
                  )}

                  {activeTab === 'analytics' && (
                    <AnalyticsView
                      range={range}
                      orders={periodOrders}
                      onOpenSettings={() => setActiveTab('settings')}
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
                      onOpenUpgrade={() => setIsRechargeOpen(true)}
                      initialSection={settingsSection}
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
              newOrdersCount={newOrdersCount}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      <PublishPlanModal
        open={publishPrompt !== null}
        subject={publishPrompt?.subject ?? ''}
        onClose={() => setPublishPrompt(null)}
        onChoosePro={() => {
          // Publish only once the Pro payment is confirmed (back from the
          // hosted checkout, see `pendingPublish`).
          if (publishPrompt) savePendingPublish(publishPrompt.intent);
          setPublishPrompt(null);
          setIsRechargeOpen(true);
        }}
      />

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
