'use client';

import { storedReferral, useReferralCapture } from '@/lib/store/referral';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, Eye } from 'lucide-react';
import { applyDisplayCurrency, isDisplayCurrency } from '@/lib/money';
import { ImmersiveShowcase, type SubmittedOrder } from '@/components/showcase/ImmersiveShowcase';
import type { StorePixels } from '@/lib/store/pixels';
import {
  initPixels,
  trackInitiateCheckout,
  trackPurchase,
  trackViewContent,
  type TrackedProduct,
} from '@/lib/store/tracking';
import {
  getVisitorId,
  saveCheckoutDraft,
  trackProductEvent,
  type CheckoutDraftFields,
} from '@/lib/store/visitor-analytics';
import { applyAbVariantToConfig, decideAbVariant } from '@/lib/store/ab-testing';
import type { FunnelPageConfig, OrderLead } from '@/types/juula';

interface PublicProductViewProps {
  config: FunnelPageConfig;
  pixels: StorePixels;
  /** Owner viewing an unpublished page: no pixels, orders disabled. */
  isPreview: boolean;
  /** Merchant's display currency (prices are still charged in FCFA). */
  displayCurrency?: string | null | undefined;
}

export const PublicProductView: React.FC<PublicProductViewProps> = ({
  displayCurrency,
  config,
  pixels,
  isPreview,
}) => {
  useReferralCapture();
  // Server HTML is in FCFA; switch to the merchant's display currency once
  // in the browser, then re-render the page with converted amounts.
  const [currencyTick, setCurrencyTick] = useState(0);
  useEffect(() => {
    if (!isDisplayCurrency(displayCurrency) || displayCurrency === 'XOF') return;
    void applyDisplayCurrency(displayCurrency).then(() => setCurrencyTick((t) => t + 1));
  }, [displayCurrency]);

  const pendingPurchases = useRef(
    new Map<string, { reference: string; quantity: number; total: number }>(),
  );

  // A/B Testing 50/50 Split
  const assignedVariant = useMemo<'A' | 'B' | null>(() => {
    if (!config.abTest?.enabled || config.abTest.status !== 'running') return null;
    if (typeof window === 'undefined') return 'A';
    const params = new URLSearchParams(window.location.search);
    const queryVariant = params.get('ab')?.toUpperCase();
    if (queryVariant === 'A' || queryVariant === 'B') return queryVariant;
    const key = `juula_ab_${config.id}`;
    const stored = localStorage.getItem(key);
    if (stored === 'A' || stored === 'B') return stored;
    const chosen = decideAbVariant(config.abTest, getVisitorId());
    try {
      localStorage.setItem(key, chosen);
    } catch {
      // ignore storage access error
    }
    return chosen;
  }, [config.abTest, config.id]);

  const effectiveConfig = useMemo(() => {
    if (!assignedVariant) return config;
    return applyAbVariantToConfig(config, assignedVariant);
  }, [config, assignedVariant]);

  const product: TrackedProduct = useMemo(
    () => ({
      id: effectiveConfig.id,
      name: effectiveConfig.productTitle,
      price: effectiveConfig.price,
      currency: effectiveConfig.currency,
    }),
    [
      effectiveConfig.id,
      effectiveConfig.productTitle,
      effectiveConfig.price,
      effectiveConfig.currency,
    ],
  );

  useEffect(() => {
    if (isPreview) return;
    initPixels(pixels);
    trackViewContent(product);
  }, [isPreview, pixels, product]);

  // First-party analytics (views, sources, countries) — once per page load.
  useEffect(() => {
    if (isPreview) return;
    trackProductEvent(config.slug, 'view');
  }, [isPreview, config.slug]);

  const handleCheckoutDraft = useCallback(
    (fields: CheckoutDraftFields) => {
      if (!isPreview) saveCheckoutDraft(config.slug, fields);
    },
    [isPreview, config.slug],
  );

  const submitOrder = useCallback(
    async (order: OrderLead): Promise<SubmittedOrder> => {
      if (isPreview) {
        throw new Error('Aperçu : publiez la page pour recevoir de vraies commandes.');
      }
      const res = await fetch(`/api/public/products/${encodeURIComponent(config.slug)}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: order.customerName,
          whatsappNumber: order.whatsappNumber,
          neighborhood: order.neighborhood,
          deliveryAddress:
            order.hasVoiceNote && order.deliveryAddress?.startsWith('[Note vocale')
              ? undefined
              : order.deliveryAddress,
          hasVoiceNote: Boolean(order.hasVoiceNote),
          quantity: order.quantity ?? 1,
          selectedColor: order.selectedColor,
          paymentType: order.paymentType,
          directMethodId: order.directMethodId,
          visitorId: getVisitorId(),
          ...(order.promoCode ? { promoCode: order.promoCode } : {}),
          ...(order.extras && order.extras.length > 0 ? { extras: order.extras } : {}),
          ...(storedReferral() ? { partnerRef: storedReferral() } : {}),
          ...(assignedVariant ? { abVariant: assignedVariant } : {}),
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        order?: SubmittedOrder;
        message?: string;
      } | null;
      if (!res.ok || !body?.order) {
        throw new Error(body?.message || "La commande n'a pas pu être envoyée. Réessayez.");
      }
      const purchase = {
        reference: body.order.reference,
        quantity: order.quantity ?? 1,
        total: body.order.totalAmount,
      };
      // Cash on delivery: the order is the conversion. Online: wait until
      // the server has confirmed the payment (see confirmPayment).
      if (order.paymentType === 'cod' || order.paymentType === 'direct')
        trackPurchase(product, purchase);
      else pendingPurchases.current.set(body.order.id, purchase);
      return body.order;
    },
    [config.slug, isPreview, product],
  );

  // Ask the server to verify the payment with Moneriz. The webhook and the
  // provider can lag a few seconds behind the iframe, so retry briefly.
  const confirmPayment = useCallback(
    async (orderId: string): Promise<boolean> => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch(
          `/api/public/orders/${encodeURIComponent(orderId)}/payment-status`,
          {
            method: 'POST',
          },
        ).catch(() => null);
        const body = (await res?.json().catch(() => null)) as { paymentStatus?: string } | null;
        if (body?.paymentStatus === 'paid') {
          const purchase = pendingPurchases.current.get(orderId);
          if (purchase) {
            trackPurchase(product, purchase);
            pendingPurchases.current.delete(orderId);
          }
          return true;
        }
        if (res && res.status !== 200) return false;
        await new Promise((r) => setTimeout(r, 2500));
      }
      return false;
    },
    [product],
  );

  // Return from the hosted Moneriz checkout (redirect mode):
  // /p/<slug>?payment=success&order=<id>
  const [returnBanner, setReturnBanner] = useState<
    null | 'checking' | 'paid' | 'pending' | 'cancelled'
  >(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const orderId = params.get('order');
    if (!payment || !orderId) return;
    window.history.replaceState(null, '', window.location.pathname);
    if (payment === 'cancelled') {
      setReturnBanner('cancelled');
      return;
    }
    setReturnBanner('checking');
    void confirmPayment(orderId).then((paid) => setReturnBanner(paid ? 'paid' : 'pending'));
  }, [confirmPayment]);

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      {isPreview && (
        <div className="sticky top-0 z-50 w-full bg-amber-500 text-white text-xs font-bold py-2 px-4 flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          Aperçu privé — cette page n&apos;est pas encore publiée. Publiez-la pour la partager.
        </div>
      )}
      {returnBanner && (
        <div
          role="status"
          className={`w-full text-xs font-bold py-2.5 px-4 flex items-center justify-center gap-2 ${
            returnBanner === 'paid'
              ? 'bg-emerald-600 text-white'
              : returnBanner === 'cancelled'
                ? 'bg-slate-700 text-white'
                : 'bg-amber-500 text-white'
          }`}
        >
          {returnBanner === 'paid' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {returnBanner === 'checking' && 'Vérification de votre paiement…'}
          {returnBanner === 'paid' && 'Paiement confirmé ! Votre commande est en préparation.'}
          {returnBanner === 'pending' &&
            'Paiement en cours de confirmation. Le vendeur vous contactera sur WhatsApp.'}
          {returnBanner === 'cancelled' &&
            'Paiement annulé. Vous pouvez réessayer ou payer à la livraison.'}
        </div>
      )}
      {isPreview && assignedVariant && (
        <div className="w-full bg-[#235BF7] text-white text-xs font-black py-2 px-4 flex items-center justify-center gap-2">
          <span>
            Mode Test A/B : Version {assignedVariant} (
            {effectiveConfig.price.toLocaleString('fr-FR')} FCFA ·{' '}
            {effectiveConfig.deliveryFree
              ? 'Livraison offerte'
              : `Livraison +${effectiveConfig.deliveryFee.toLocaleString('fr-FR')} FCFA`}
            )
          </span>
        </div>
      )}
      <ImmersiveShowcase
        key={`${currencyTick}-${assignedVariant ?? 'default'}`}
        config={effectiveConfig}
        submitOrder={submitOrder}
        confirmPayment={confirmPayment}
        onCheckoutOpened={({ quantity, value }) => {
          if (isPreview) return;
          trackInitiateCheckout(product, quantity, value);
          trackProductEvent(config.slug, 'checkout_open');
        }}
        onCheckoutDraft={handleCheckoutDraft}
        {...(isPreview
          ? {}
          : { reportHref: `/signaler?produit=${encodeURIComponent(config.slug)}` })}
      />
    </div>
  );
};
