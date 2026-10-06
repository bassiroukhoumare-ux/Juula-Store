import 'server-only';
// Payment rules shared by product-page orders and shop cart orders (the
// store is online, i.e. it has an active subscription):
//   cod          → if the merchant keeps cash on delivery on;
//   online_*     → JuulaPay, only if the merchant enabled it (7,5 % fee);
//   direct       → the merchant's own links (order « paiement à vérifier »);
//   whatsapp     → order recorded, the conversation continues on WhatsApp.
import type { Store } from '@prisma/client';
import { checkoutOptionsFor } from '@/lib/server/store/storefront';

export type CheckoutPaymentType =
  | 'cod'
  | 'online_momo'
  | 'online_wave'
  | 'online_orange'
  | 'direct'
  | 'whatsapp';

export type PaymentDecision =
  | {
      ok: true;
      paymentStatus: 'pending_cod' | 'pending_online' | 'pending_direct';
      deliveryNotes: string;
      paymentMethodName: string | null;
    }
  | { ok: false; status: number; error: string; message: string };

export function decidePayment(
  store: Store | null,
  paymentType: CheckoutPaymentType,
  directMethodId?: string | undefined,
): PaymentDecision {
  const options = checkoutOptionsFor(store);

  if (paymentType === 'whatsapp') {
    // The customer continues on the merchant's WhatsApp; payment is agreed there.
    if (!options.whatsapp) {
      return {
        ok: false,
        status: 400,
        error: 'PAYMENT_METHOD_DISABLED',
        message: 'La commande par WhatsApp n’est pas disponible pour cette boutique.',
      };
    }
    return {
      ok: true,
      paymentStatus: 'pending_cod',
      deliveryNotes: 'Commande passée sur WhatsApp — paiement à convenir avec le client',
      paymentMethodName: 'WhatsApp',
    };
  }

  if (paymentType === 'cod') {
    if (!options.cod) {
      return {
        ok: false,
        status: 400,
        error: 'COD_DISABLED',
        message: 'Le paiement à la livraison n’est pas disponible pour cette boutique.',
      };
    }
    return {
      ok: true,
      paymentStatus: 'pending_cod',
      deliveryNotes: 'Paiement en espèces à la livraison',
      paymentMethodName: null,
    };
  }

  if (paymentType === 'direct') {
    const method = options.direct.find((m) => m.id === directMethodId);
    if (!method) {
      return {
        ok: false,
        status: 400,
        error: 'PAYMENT_METHOD_DISABLED',
        message: 'Ce moyen de paiement n’est plus disponible.',
      };
    }
    return {
      ok: true,
      paymentStatus: 'pending_direct',
      deliveryNotes: `Paiement direct via ${method.name} — à vérifier par le vendeur`,
      paymentMethodName: method.name,
    };
  }

  if (!options.online) {
    return {
      ok: false,
      status: 400,
      error: 'ONLINE_PAYMENT_DISABLED',
      message: 'Le paiement en ligne n’est pas disponible pour cette boutique.',
    };
  }
  return {
    ok: true,
    paymentStatus: 'pending_online',
    deliveryNotes: 'Paiement en ligne Mobile Money (JuulaPay) — à vérifier',
    paymentMethodName: null,
  };
}

/** Senegal numbers typed by the customer: "77 123 45 67" or "221771234567". */
export function customerPhone(digits: string): { phone: string; whatsappNumber: string } {
  const local = digits.startsWith('221') && digits.length > 9 ? digits.slice(3) : digits;
  return { phone: `+221 ${local}`, whatsappNumber: `221${local}` };
}
