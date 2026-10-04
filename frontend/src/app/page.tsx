'use client';

import React, { useState } from 'react';
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
import { initialKpis, initialOrders, defaultFunnelConfig, initialWallet, initialFunnelPages } from '@/data/mockData';
import { CustomersView } from '@/components/dashboard/CustomersView';
import { AnalyticsView } from '@/components/dashboard/AnalyticsView';
import { SettingsView } from '@/components/dashboard/SettingsView';
import { formatOrderId, getStoreCode } from '@/lib/orderUtils';
import { DashboardTab, FunnelPageConfig, FunnelPageItem, FunnelPageStatus, KpiMetrics, OrderLead, WalletState, PayoutRecord } from '@/types/juula';
import { ArrowLeft, Sparkles, Smartphone, Layers, CheckCircle2, Monitor } from 'lucide-react';

export default function JuulaStoreApp() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('cockpit');
  const [viewMode, setViewMode] = useState<'dashboard' | 'vitrine'>('dashboard');
  const [previewDevice, setPreviewDevice] = useState<'responsive' | 'mobile'>('responsive');
  const [orders, setOrders] = useState<OrderLead[]>(initialOrders);
  const [kpis, setKpis] = useState<KpiMetrics>(initialKpis);
  const [wallet, setWallet] = useState<WalletState>(initialWallet);

  // Multi-Pages / Multi-Tunnels Management State
  const [funnelPages, setFunnelPages] = useState<FunnelPageItem[]>(initialFunnelPages);
  const [activePageId, setActivePageId] = useState<string>(initialFunnelPages[0]?.id || 'fnl-royale-01');
  const [funnelConfig, setFunnelConfig] = useState<FunnelPageConfig>(
    initialFunnelPages[0]?.config || defaultFunnelConfig
  );

  // Filter & Dashboard Widget Customization States
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30 derniers jours');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('1 Jan, 2026 - 4 Oct, 2026');
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
  const [payoutSecurity, setPayoutSecurity] = useState({
    isPinSet: true,
    pinCode: '741289',
    maskedPin: '•••• 89',
    recoveryEmail: 'contact@boutiquedakar.sn',
  });

  // Funnel pages operations
  const handleSelectPage = (pageId: string) => {
    const target = funnelPages.find((p) => p.id === pageId);
    if (target) {
      setActivePageId(pageId);
      setFunnelConfig(target.config);
    }
  };

  const handleCreateNewPage = (internalName: string) => {
    const newId = `fnl-${Date.now().toString().slice(-5)}`;
    const newConfig: FunnelPageConfig = {
      ...defaultFunnelConfig,
      id: newId,
      internalName: internalName.trim() || 'Nouvelle Page de Vente',
      status: 'draft',
      productTitle: internalName.trim() || 'Nouveau Produit Sans Titre',
      slug: `page-${newId}`,
      mediaItems: [],
      videoUrl: '',
      hasVideo: false,
      price: 0,
      originalPrice: 0,
      stockQuantity: 10,
      showStockBadge: false,
      availableColors: [],
      benefits: [],
      proofItems: [],
      reviews: [],
    };
    const newPageItem: FunnelPageItem = {
      id: newId,
      internalName: internalName.trim() || 'Nouvelle Page de Vente',
      status: 'draft',
      createdAt: "Aujourd'hui",
      updatedAt: "À l'instant",
      config: newConfig,
    };
    setFunnelPages((prev) => [newPageItem, ...prev]);
    setActivePageId(newId);
    setFunnelConfig(newConfig);
  };

  const handleTogglePageStatus = (pageId: string, newStatus: FunnelPageStatus) => {
    setFunnelPages((prev) =>
      prev.map((p) => {
        if (p.id === pageId) {
          const updatedConfig = { ...p.config, status: newStatus };
          if (p.id === activePageId) {
            setFunnelConfig(updatedConfig);
          }
          return {
            ...p,
            status: newStatus,
            updatedAt: "À l'instant",
            config: updatedConfig,
          };
        }
        return p;
      })
    );
  };

  const handleDeletePage = (pageId: string) => {
    if (funnelPages.length <= 1) return;
    const filtered = funnelPages.filter((p) => p.id !== pageId);
    setFunnelPages(filtered);
    if (activePageId === pageId) {
      const next = filtered[0];
      if (next) {
        setActivePageId(next.id);
        setFunnelConfig(next.config);
      }
    }
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
          : page
      )
    );
  };

  // When a new order is captured from showcase
  const handleOrderCreated = (newOrderPartial: Partial<OrderLead>) => {
    const isOnline =
      newOrderPartial.paymentType === 'online_wave' ||
      newOrderPartial.paymentType === 'online_orange';

    const deliveryFee =
      funnelConfig.deliveryPricingType === 'fixed'
        ? (funnelConfig.fixedDeliveryFee || 0)
        : 0;
    const totalAmount = (newOrderPartial.amount || funnelConfig.price) + deliveryFee;
    const storeCode = funnelConfig.storeCode || getStoreCode(funnelConfig.storeName || 'Juula Store');
    const orderId = newOrderPartial.id || formatOrderId(storeCode, orders.length + 1);

    const fullOrder: OrderLead = {
      id: orderId,
      customerName: newOrderPartial.customerName || 'Nouveau Client',
      phone: newOrderPartial.phone || '+221 77 000 00 00',
      whatsappNumber: newOrderPartial.whatsappNumber || '221770000000',
      neighborhood: newOrderPartial.neighborhood || 'Dakar',
      city: 'Dakar',
      productName: funnelConfig.productTitle,
      productImage: newOrderPartial.productImage || funnelConfig.mediaItems[0]?.url || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=300&q=80',
      amount: funnelConfig.price,
      quantity: newOrderPartial.quantity || 1,
      currency: funnelConfig.currency,
      status: 'new',
      createdAt: "À l'instant",
      paymentType: newOrderPartial.paymentType || 'cod',
      paymentStatus: isOnline ? 'paid' : 'pending_cod',
      deliveryNotes: newOrderPartial.deliveryNotes || '',
      deliveryAddress: newOrderPartial.deliveryAddress || '',
      hasVoiceNote: newOrderPartial.hasVoiceNote || false,
      voiceNoteUrl: newOrderPartial.voiceNoteUrl,
      deliveryFee: deliveryFee,
      totalAmount: totalAmount,
    };

    setOrders((prev) => [fullOrder, ...prev]);

    // Update KPIs dynamically
    setKpis((prev) => ({
      ...prev,
      ordersBreakdown: {
        ...prev.ordersBreakdown,
        total: prev.ordersBreakdown.total + 1,
        codCount: isOnline ? prev.ordersBreakdown.codCount : prev.ordersBreakdown.codCount + 1,
        onlineCount: isOnline ? prev.ordersBreakdown.onlineCount + 1 : prev.ordersBreakdown.onlineCount,
      },
      revenue: {
        ...prev.revenue,
        total: prev.revenue.total + totalAmount,
        onlineAmount: isOnline ? prev.revenue.onlineAmount + totalAmount : prev.revenue.onlineAmount,
        codAmount: isOnline ? prev.revenue.codAmount : prev.revenue.codAmount + totalAmount,
      },
      leadCredits: {
        ...prev.leadCredits,
        remaining: Math.max(0, prev.leadCredits.remaining - 1),
      },
    }));

    // Update Merchant Wallet: If paid online, directly into available balance!
    if (isOnline) {
      setWallet((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance + totalAmount,
      }));
    } else {
      setWallet((prev) => ({
        ...prev,
        pendingCodAmount: prev.pendingCodAmount + totalAmount,
      }));
    }
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
  const handlePayoutSuccess = (
    amount: number,
    provider: 'wave' | 'orange_money',
    phoneNumber: string
  ) => {
    const newRecord: PayoutRecord = {
      id: `RET-${Date.now().toString().slice(-4)}`,
      amount,
      provider,
      phoneNumber: `+221 ${phoneNumber}`,
      recipientName: 'Boutique Dakar Élégance',
      date: "À l'instant",
      status: 'completed',
      reference: `${provider === 'wave' ? 'WAV-SN' : 'OM-SN'}-${Math.floor(1000000 + Math.random() * 9000000)}`,
    };

    setWallet((prev) => ({
      ...prev,
      availableBalance: Math.max(0, prev.availableBalance - amount),
      totalWithdrawn: prev.totalWithdrawn + amount,
      payoutHistory: [newRecord, ...prev.payoutHistory],
    }));
  };

  const newOrdersCount = orders.filter((o) => o.status === 'new').length;

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#0F172A] flex flex-col font-sans">
      {/* ======================================================== */}
      {/* VUE 2 : VITRINE IMMERSIVE (DESKTOP & MOBILE RESPONSIVE)  */}
      {/* ======================================================== */}
      {viewMode === 'vitrine' ? (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
          {/* Top Control & Return Bar */}
          <div className="w-full bg-[#0F172A] text-white py-2.5 px-4 sm:px-8 flex items-center justify-between text-xs sticky top-0 z-50 shadow-md">
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
                    ? 'bg-[#1E60F8] text-white shadow-xs'
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
                    ? 'bg-[#1E60F8] text-white shadow-xs'
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
                    <ImmersiveShowcase
                      config={funnelConfig}
                      onOrderCreated={handleOrderCreated}
                      isInsideMockup={true}
                    />
                  </div>

                  {/* iOS Style Home Indicator Bar */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/40 rounded-full z-50 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="w-full">
                <ImmersiveShowcase
                  config={funnelConfig}
                  onOrderCreated={handleOrderCreated}
                  isInsideMockup={false}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* VUE 1 : DASHBOARD MARCHAND                               */
        /* ======================================================== */
        <div className="flex min-h-screen">
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
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#F2F4F7]">
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
              currentViewMode={viewMode}
              onToggleViewMode={setViewMode}
              onCreatePageClick={() => {
                setIsPayoutPageOpen(false);
                setActiveTab('wizard');
              }}
              selectedPeriod={selectedPeriod}
              onSelectPeriod={setSelectedPeriod}
              selectedDateRange={selectedDateRange}
              onSelectDateRange={setSelectedDateRange}
              activeWidgets={activeWidgets}
              onToggleWidget={(key) =>
                setActiveWidgets((prev) => ({
                  ...prev,
                  [key]: !prev[key],
                }))
              }
            />

            {/* Dynamic Content View */}
            <main className="flex-1 p-4 sm:p-8 pb-28 lg:pb-8 max-w-7xl w-full mx-auto">
              {isPayoutPageOpen ? (
                <PayoutPageView
                  availableBalance={wallet.availableBalance}
                  currency={wallet.currency}
                  onBack={() => setIsPayoutPageOpen(false)}
                  onPayoutSuccess={(amount, provider, phone) => {
                    handlePayoutSuccess(amount, provider, phone);
                  }}
                  payoutSecurity={payoutSecurity}
                  onUpdateSecurityPin={(newPin) => {
                    setPayoutSecurity({
                      ...payoutSecurity,
                      isPinSet: true,
                      pinCode: newPin,
                      maskedPin: `•••• ${newPin.slice(-2)}`,
                    });
                  }}
                  onGoToSettings={() => {
                    setIsPayoutPageOpen(false);
                    setActiveTab('settings');
                  }}
                />
              ) : (
                <>
                  {activeTab === 'cockpit' && (
                    <CockpitView
                      kpis={kpis}
                      wallet={wallet}
                      funnelConfig={funnelConfig}
                      recentOrders={orders}
                      onCreatePageClick={() => setActiveTab('wizard')}
                      onOpenRecharge={() => setIsRechargeOpen(true)}
                      onOpenPayoutModal={() => setIsPayoutPageOpen(true)}
                      onOpenStorefrontPreview={() => setViewMode('vitrine')}
                      onOpenKanban={() => setActiveTab('kanban')}
                      onOpenWallet={() => setActiveTab('wallet')}
                      activeWidgets={activeWidgets}
                      selectedPeriod={selectedPeriod}
                      selectedDateRange={selectedDateRange}
                    />
                  )}

                  {activeTab === 'kanban' && (
                    <KanbanView
                      orders={orders}
                      onOrdersChange={setOrders}
                      onOpenStorefrontPreview={() => setViewMode('vitrine')}
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
                  )}

                  {activeTab === 'customers' && (
                    <CustomersView orders={orders} storeName={funnelConfig.storeName} />
                  )}

                  {activeTab === 'analytics' && (
                    <AnalyticsView
                      kpis={kpis}
                      orders={orders}
                      onOpenStorefrontPreview={() => setViewMode('vitrine')}
                    />
                  )}

                  {activeTab === 'settings' && (
                    <SettingsView
                      funnelConfig={funnelConfig}
                      onSaveConfig={(updated) => setFunnelConfig(updated)}
                      payoutSecurity={payoutSecurity}
                      onUpdateSecurityPin={(newPin) => {
                        setPayoutSecurity({
                          ...payoutSecurity,
                          isPinSet: true,
                          pinCode: newPin,
                          maskedPin: `•••• ${newPin.slice(-2)}`,
                        });
                      }}
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

      {/* Recharge Modal */}
      <RechargeModal
        isOpen={isRechargeOpen}
        onClose={() => setIsRechargeOpen(false)}
        onRecharged={handleRecharged}
      />
    </div>
  );
}
