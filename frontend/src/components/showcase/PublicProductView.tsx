'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, Eye } from 'lucide-react';
import { ImmersiveShowcase, type SubmittedOrder } from '@/components/showcase/ImmersiveShowcase';
import type { StorePixels } from '@/lib/store/pixels';
import {
  initPixels,
  trackInitiateCheckout,
  trackPurchase,
  trackViewContent,
  type TrackedProduct,
} from '@/lib/store/tracking';
import type { FunnelPageConfig, OrderLead } from '@/types/juula';

interface PublicProductViewProps {
  config: FunnelPageConfig;
  pixels: StorePixels;
  /** Owner viewing an unpublished page: no pixels, orders disabled. */
  isPreview: boolean;
}

export const PublicProductView: React.FC<PublicProductViewProps> = ({
  config,
  pixels,
  isPreview,
}) => {
  const pendingPurchases = useRef(
    new Map<string, { reference: string; quantity: number; total: number }>(),
  );
  const product: TrackedProduct = useMemo(
    () => ({
      id: config.id,
      name: config.productTitle,
      price: config.price,
      currency: config.currency,
    }),
    [config.id, config.productTitle, config.price, config.currency],
  );

  useEffect(() => {
    if (isPreview) return;
    initPixels(pixels);
    trackViewContent(product);
  }, [isPreview, pixels, product]);

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
      if (order.paymentType === 'cod') trackPurchase(product, purchase);
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
    <div className="min-h-screen bg-[#F8FAFC]">
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
      <ImmersiveShowcase
        config={config}
        submitOrder={submitOrder}
        confirmPayment={confirmPayment}
        onCheckoutOpened={({ quantity, value }) => {
          if (!isPreview) trackInitiateCheckout(product, quantity, value);
        }}
      />
    </div>
  );
};
