'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { formatMoney } from '@/lib/money';
import type { CheckoutOptions } from '@/lib/store/storefront-types';
import type { useCart } from './useCart';
import type { ShopProduct } from './types';

type Cart = ReturnType<typeof useCart>;

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  shop: string;
  storeName: string;
  cart: Cart;
  products: ShopProduct[];
  options: CheckoutOptions;
  /** Owner preview of an unpublished shop: orders are disabled. */
  isPreview: boolean;
}

interface PlacedOrder {
  reference: string;
  totalAmount: number;
  payment: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  shop,
  storeName,
  cart,
  products,
  options,
  isPreview,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout' | 'done'>('cart');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [details, setDetails] = useState('');
  const defaultPayment = options.cod
    ? 'cod'
    : options.online
      ? 'online_momo'
      : options.direct[0]
        ? `direct:${options.direct[0].id}`
        : 'cod';
  const [payment, setPayment] = useState<string>(defaultPayment);
  // « Valider la commande » (delivery / online payment) or « Commander sur WhatsApp ».
  const [mode, setMode] = useState<'order' | 'whatsapp'>('order');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // New items after a placed order: start a fresh checkout.
  useEffect(() => {
    if (open && step === 'done' && cart.count > 0) setStep('cart');
  }, [open, step, cart.count]);

  const deliveryFee = Math.max(
    0,
    ...cart.lines.map((l) => products.find((p) => p.slug === l.slug)?.deliveryFee ?? 0),
  );
  const total = cart.subtotal + deliveryFee;
  const direct = payment.startsWith('direct:')
    ? options.direct.find((m) => `direct:${m.id}` === payment)
    : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (isPreview) {
      setError('Aperçu : publiez votre boutique pour recevoir de vraies commandes.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const paymentType = mode === 'whatsapp' ? 'whatsapp' : direct ? 'direct' : payment;
      const res = await fetch(`/api/public/stores/${encodeURIComponent(shop)}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.lines.map((l) => ({
            slug: l.slug,
            quantity: l.quantity,
            ...(l.color ? { color: l.color } : {}),
          })),
          customerName: name,
          whatsappNumber: phone,
          address,
          addressDetails: details || undefined,
          paymentType,
          ...(direct && mode === 'order' ? { directMethodId: direct.id } : {}),
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        order?: { id: string; reference: string; totalAmount: number };
        message?: string;
      } | null;
      if (!res.ok || !body?.order) {
        throw new Error(body?.message || 'La commande n’a pas pu être envoyée. Réessayez.');
      }
      const order = body.order;

      if (paymentType === 'whatsapp' && options.whatsapp) {
        const recap = [
          `Bonjour ${storeName}, je viens de commander (réf. ${order.reference}) :`,
          ...cart.lines.map((l) => `• ${l.title}${l.color ? ` (${l.color})` : ''} ×${l.quantity}`),
          `Total : ${formatMoney(order.totalAmount, 'XOF')}`,
          `Nom : ${name}`,
          `Adresse : ${[address, details].filter(Boolean).join(' — ')}`,
        ].join('\n');
        cart.clear();
        window.location.href = `https://wa.me/${options.whatsapp}?text=${encodeURIComponent(recap)}`;
        return;
      }

      if (paymentType.startsWith('online_')) {
        const session = await fetch('/api/payments/moneriz/checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, integrationMode: 'redirect' }),
        });
        const data = (await session.json().catch(() => null)) as {
          checkoutUrl?: string;
          message?: string;
        } | null;
        if (!session.ok || !data?.checkoutUrl) {
          throw new Error(
            `${data?.message || 'Le paiement en ligne n’a pas pu démarrer.'} Votre commande ${order.reference} est enregistrée.`,
          );
        }
        window.location.href = data.checkoutUrl;
        return;
      }

      setPlaced({
        reference: order.reference,
        totalAmount: order.totalAmount,
        payment: direct ? `direct:${direct.id}` : 'cod',
      });
      cart.clear();
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La commande n’a pas pu être envoyée.');
    } finally {
      setSubmitting(false);
    }
  };

  const placedDirect = placed?.payment.startsWith('direct:')
    ? options.direct.find((m) => `direct:${m.id}` === placed.payment)
    : undefined;

  const choices: { id: string; label: string; hint: string; icon: React.ReactNode }[] = [
    ...(options.cod
      ? [
          {
            id: 'cod',
            label: 'Paiement à la livraison',
            hint: 'Espèces',
            icon: <Banknote className="w-4 h-4" />,
          },
        ]
      : []),
    ...(options.online
      ? [
          {
            id: 'online_momo',
            label: 'Payer par Mobile Money',
            hint: 'Wave, Orange Money, carte',
            icon: <Smartphone className="w-4 h-4" />,
          },
        ]
      : []),
    ...options.direct.map((m) => ({
      id: `direct:${m.id}`,
      label: m.name,
      hint: 'Paiement direct',
      icon: <Smartphone className="w-4 h-4" />,
    })),
  ];

  return (
    <div
      className={`fixed inset-0 z-[70] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-[#201D1D]/40" onClick={onClose} />
      <aside
        role="dialog"
        aria-label="Panier"
        className={`absolute right-0 top-0 h-full w-full sm:w-[440px] bg-white flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-center justify-between gap-3 px-5 h-16 border-b border-[#ECEFF4] shrink-0">
          <div className="flex items-center gap-2">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => setStep('cart')}
                aria-label="Retour au panier"
                className="w-9 h-9 -ml-2 rounded-xl flex items-center justify-center hover:bg-[#F6F7F9] cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-extrabold text-[#201D1D]">
              {step === 'checkout'
                ? mode === 'whatsapp'
                  ? 'Commander sur WhatsApp'
                  : 'Finaliser la commande'
                : step === 'done'
                  ? 'Commande envoyée'
                  : `Mon panier (${cart.count})`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#7A808C] hover:bg-[#F6F7F9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {step === 'done' && placed ? (
          <div className="flex-1 overflow-y-auto p-6 text-center space-y-4">
            <span className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </span>
            <p className="text-xl font-extrabold text-[#201D1D]">Merci {name.split(' ')[0]} !</p>
            <p className="text-[14px] text-[#7A808C]">
              Votre commande <strong className="text-[#201D1D]">{placed.reference}</strong> (
              {formatMoney(placed.totalAmount)}) a bien été envoyée à {storeName}.
            </p>
            {placedDirect ? (
              <div className="p-4 rounded-2xl bg-[#F6F7F9] text-left space-y-3">
                <p className="text-[14px] font-bold text-[#201D1D]">
                  Réglez maintenant via {placedDirect.name}
                </p>
                {placedDirect.qrUrl && (
                  <img
                    src={placedDirect.qrUrl}
                    alt={`QR code ${placedDirect.name}`}
                    className="w-44 h-44 mx-auto rounded-xl bg-white border border-[#E3E7EE] object-contain p-2"
                  />
                )}
                {placedDirect.url && (
                  <a
                    href={placedDirect.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex justify-center py-3 rounded-full bg-[var(--accent)] text-white text-[14px] font-semibold"
                  >
                    Ouvrir le lien de paiement
                  </a>
                )}
                <p className="text-[13px] text-[#7A808C]">
                  Indiquez la référence {placed.reference}. Le vendeur confirme la réception puis
                  prépare votre livraison.
                </p>
              </div>
            ) : (
              <p className="text-[14px] text-[#3F4654]">
                Vous serez contacté pour la livraison. Vous payez en espèces à la réception.
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-full border border-[#E3E7EE] text-[14px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] cursor-pointer"
            >
              Continuer mes achats
            </button>
          </div>
        ) : cart.lines.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <span className="w-14 h-14 rounded-2xl bg-[#F6F7F9] text-[#9AA0AB] flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </span>
            <p className="mt-4 font-bold text-[#201D1D]">Votre panier est vide</p>
            <p className="mt-1 text-[14px] text-[#7A808C]">Ajoutez des articles pour commander.</p>
          </div>
        ) : step === 'cart' ? (
          <>
            <ul className="flex-1 overflow-y-auto divide-y divide-[#F1F3F6] px-5">
              {cart.lines.map((l) => (
                <li key={l.key} className="py-4 flex gap-3">
                  <div className="w-20 h-24 rounded-xl overflow-hidden bg-[#F1F3F6] shrink-0">
                    {l.image && <img src={l.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-semibold text-[#201D1D] line-clamp-2">
                        {l.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => cart.remove(l.key)}
                        aria-label={`Retirer ${l.title}`}
                        className="shrink-0 w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-[#9AA0AB] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[13px] text-[#7A808C]">
                      {formatMoney(l.price)}
                      {l.color ? ` · ${l.color}` : ''}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border border-[#E3E7EE]">
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(l.key, l.quantity - 1)}
                          aria-label="Diminuer la quantité"
                          className="w-9 h-9 flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-[14px] font-bold tabular-nums">
                          {l.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(l.key, l.quantity + 1)}
                          aria-label="Augmenter la quantité"
                          className="w-9 h-9 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[15px] font-extrabold text-[#201D1D] tabular-nums">
                        {formatMoney(l.price * l.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="border-t border-[#ECEFF4] p-5 space-y-3 shrink-0">
              <div className="flex justify-between text-[14px] text-[#7A808C]">
                <span>Sous-total</span>
                <span className="tabular-nums">{formatMoney(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[14px] text-[#7A808C]">
                <span>Livraison</span>
                <span>{deliveryFee > 0 ? formatMoney(deliveryFee) : 'Offerte'}</span>
              </div>
              <div className="flex justify-between text-[17px] font-extrabold text-[#201D1D]">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(total)}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('order');
                  setStep('checkout');
                }}
                className="w-full h-12 rounded-full bg-[var(--accent)] text-white text-[15px] font-semibold hover:brightness-110 transition-all cursor-pointer"
              >
                Valider la commande
              </button>
              {options.whatsapp && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('whatsapp');
                    setStep('checkout');
                  }}
                  className="w-full h-12 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white text-[15px] font-semibold flex items-center justify-center cursor-pointer"
                >
                  Commander sur WhatsApp
                </button>
              )}
            </footer>
          </>
        ) : (
          <form onSubmit={submit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <Field label="Nom et prénom *">
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Ex : Fatou Diop"
                  className={INPUT}
                />
              </Field>
              <Field label="Numéro WhatsApp *">
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#E3E7EE] bg-[#F1F3F6] text-[14px] font-semibold text-[#3F4654]">
                    +221
                  </span>
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    placeholder="77 000 00 00"
                    className={`${INPUT} rounded-l-none`}
                  />
                </div>
              </Field>
              <Field label="Adresse de livraison (quartier, ville) *">
                <input
                  required
                  minLength={3}
                  maxLength={300}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="street-address"
                  placeholder="Ex : Sacré-Cœur 3, Dakar"
                  className={INPUT}
                />
              </Field>
              <Field label="Précisions (facultatif)">
                <textarea
                  rows={2}
                  maxLength={500}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Ex : en face de la pharmacie, 2e étage"
                  className={INPUT}
                />
              </Field>

              {mode === 'order' && (
                <fieldset className="space-y-2">
                  <legend className="text-[14px] font-semibold text-[#201D1D] mb-2">
                    Paiement
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {choices.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setPayment(c.id)}
                        aria-pressed={payment === c.id}
                        className={`p-3 rounded-2xl border-2 text-left transition-colors cursor-pointer ${
                          payment === c.id
                            ? 'border-[var(--accent)] bg-[#F7F9FF]'
                            : 'border-[#E3E7EE] hover:bg-[#F6F7F9]'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-[14px] font-bold text-[#201D1D]">
                          {c.icon}
                          <span className="truncate">{c.label}</span>
                        </span>
                        <span className="block text-[12px] text-[#7A808C] mt-0.5">{c.hint}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {error && <p className="text-[14px] font-semibold text-[#DC2626]">{error}</p>}
            </div>
            <footer className="border-t border-[#ECEFF4] p-5 shrink-0">
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-full bg-[var(--accent)] text-white text-[15px] font-semibold hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'whatsapp'
                  ? `Commander sur WhatsApp · ${formatMoney(total)}`
                  : payment.startsWith('online_')
                    ? `Payer par Mobile Money · ${formatMoney(total)}`
                    : `Confirmer la commande · ${formatMoney(total)}`}
              </button>
            </footer>
          </form>
        )}
      </aside>
    </div>
  );
};

const INPUT =
  'w-full px-3.5 py-2.5 rounded-xl border border-[#E3E7EE] bg-[#F6F7F9] text-[15px] text-[#201D1D] focus:outline-none focus:border-[var(--accent)] focus:bg-white';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className="text-[14px] font-semibold text-[#201D1D]">{label}</span>
    {children}
  </label>
);
