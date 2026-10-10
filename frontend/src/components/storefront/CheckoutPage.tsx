'use client';

import { storedReferral, useReferralCapture } from '@/lib/store/referral';
import React, { useEffect, useRef, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Truck,
  User,
} from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { useDisplayCurrency } from './useDisplayCurrency';
import { useCart, type CartLine } from './useCart';
import { Card, ShopPageShell } from './ShopPageShell';
import { type ShopPageProps } from './CartPage';
import { priceCart } from './types';
import { PromoCodeField, useStoredPromo } from './PromoCodeField';
import { trackCartCheckout, trackCartPurchase } from '@/lib/store/tracking';
import { MonerizCheckoutModal } from '@/components/payments/MonerizCheckoutModal';

interface CheckoutPageProps extends ShopPageProps {
  /** « Commander sur WhatsApp »: no payment choice, ends on WhatsApp. */
  mode: 'order' | 'whatsapp';
}

interface PlacedOrder {
  reference: string;
  totalAmount: number;
  payment: string;
  firstName: string;
  lines: CartLine[];
}

const INPUT =
  'w-full min-w-0 h-12 px-4 rounded-xl border border-[#E3E7EE] bg-[#F6F7F9] text-[16px] text-[#201D1D] placeholder:text-[#9AA0AB] focus:outline-none focus:border-[var(--accent)] focus:bg-white transition-colors';

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  shop,
  storeName,
  logoUrl,
  accent,
  base,
  products,
  options,
  isPreview,
  displayCurrency,
  announcement,
  mode: initialMode,
}) => {
  const cart = useCart(shop);
  useReferralCapture();
  const [promo, setPromo] = useStoredPromo(shop);
  const home = base || '/';
  useDisplayCurrency(displayCurrency);
  const mode = initialMode === 'whatsapp' && options.whatsapp ? 'whatsapp' : 'order';
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [monerizSession, setMonerizSession] =
    useState<React.ComponentProps<typeof MonerizCheckoutModal>['session']>(null);
  const [isMonerizModalOpen, setIsMonerizModalOpen] = useState(false);
  const [pendingOnlineOrder, setPendingOnlineOrder] = useState<
    (PlacedOrder & { id: string }) | null
  >(null);

  const { sync, loaded } = cart;
  useEffect(() => {
    if (loaded) sync(products.map((p) => ({ slug: p.slug, price: p.price, title: p.title })));
  }, [loaded, sync, products]);

  const { unitPrice, subtotal, deliveryFee } = priceCart(cart.lines, products);
  const discount = promo ? Math.min(promo.discount, subtotal + deliveryFee) : 0;
  const total = subtotal + deliveryFee - discount;
  const promoRequest = {
    shop,
    items: cart.lines.map((l) => ({
      slug: l.slug,
      quantity: l.quantity,
      ...(l.color ? { color: l.color } : {}),
    })),
  };
  const promoSignature = cart.lines.map((l) => `${l.key}:${l.quantity}`).join('|');
  const trackedLines = cart.lines.map((l) => ({
    id: l.slug,
    name: l.title,
    price: unitPrice.get(l.key) ?? l.price,
    quantity: l.quantity,
  }));

  // Pixels: the customer reached the checkout (once, when the cart is loaded).
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (!loaded || checkoutTracked.current || cart.lines.length === 0) return;
    checkoutTracked.current = true;
    trackCartCheckout(trackedLines, total);
  }, [loaded]);
  const direct = payment.startsWith('direct:')
    ? options.direct.find((m) => `direct:${m.id}` === payment)
    : undefined;

  const choices: { id: string; label: string; hint: string; icon: React.ReactNode }[] = [
    ...(options.cod
      ? [
          {
            id: 'cod',
            label: 'Paiement à la livraison',
            hint: 'Vous payez en espèces à la réception, après avoir vérifié votre commande.',
            icon: <Banknote className="w-5 h-5" />,
          },
        ]
      : []),
    ...(options.online
      ? [
          {
            id: 'online_momo',
            label: 'Payer par Mobile Money',
            hint: 'Wave, Orange Money ou carte. Paiement sécurisé : vous serez redirigé vers la page de paiement.',
            icon: <Smartphone className="w-5 h-5" />,
          },
        ]
      : []),
    ...options.direct.map((m) => ({
      id: `direct:${m.id}`,
      label: m.name,
      hint: 'Vous payez directement le vendeur ; il confirme la réception puis prépare la livraison.',
      icon: <Smartphone className="w-5 h-5" />,
    })),
  ];

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
          ...(promo ? { promoCode: promo.code } : {}),
          ...(storedReferral(shop) ? { partnerRef: storedReferral(shop) } : {}),
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        order?: { id: string; reference: string; totalAmount: number };
        message?: string;
        error?: string;
      } | null;
      if (body?.error?.startsWith('PROMO_')) setPromo(null);
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
        trackCartPurchase(trackedLines, { reference: order.reference, total: order.totalAmount });
        setPromo(null);
        cart.clear();
        window.location.href = `https://wa.me/${options.whatsapp}?text=${encodeURIComponent(recap)}`;
        return;
      }

      if (paymentType.startsWith('online_')) {
        const session = await fetch('/api/payments/moneriz/checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, integrationMode: 'iframe' }),
        });
        const data = (await session.json().catch(() => null)) as {
          id?: string;
          checkoutUrl?: string;
          embedUrl?: string | null;
          integrationMode?: 'iframe' | 'redirect';
          status?: string;
          amount?: number;
          currency?: string;
          reference?: string;
          message?: string;
        } | null;
        if (!session.ok || !data?.checkoutUrl) {
          throw new Error(
            `${data?.message || 'Le paiement en ligne n’a pas pu démarrer.'} Votre commande ${order.reference} est enregistrée.`,
          );
        }

        // Si l'origine n'autorise pas l'iframe ou embedUrl manquant, repli sécurisé sur la redirection
        if (data.integrationMode === 'redirect' || !data.embedUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }

        setPendingOnlineOrder({
          id: order.id,
          reference: order.reference,
          totalAmount: order.totalAmount,
          payment: paymentType,
          firstName: name.split(' ')[0] ?? '',
          lines: cart.lines.map((l) => ({ ...l, price: unitPrice.get(l.key) ?? l.price })),
        });
        setMonerizSession({
          id: data.id || `cs-${order.id}`,
          checkoutUrl: data.checkoutUrl,
          embedUrl: data.embedUrl,
          status: data.status || 'open',
          amount: data.amount || order.totalAmount,
          currency: data.currency || 'XOF',
          reference: data.reference || order.reference,
        });
        setIsMonerizModalOpen(true);
        return;
      }

      trackCartPurchase(trackedLines, { reference: order.reference, total: order.totalAmount });
      setPromo(null);
      setPlaced({
        reference: order.reference,
        totalAmount: order.totalAmount,
        payment: direct ? `direct:${direct.id}` : 'cod',
        firstName: name.split(' ')[0] ?? '',
        lines: cart.lines.map((l) => ({ ...l, price: unitPrice.get(l.key) ?? l.price })),
      });
      cart.clear();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La commande n’a pas pu être envoyée.');
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (step: 1 | 2 | 3, children: React.ReactNode) => (
    <ShopPageShell
      storeName={storeName}
      logoUrl={logoUrl}
      accent={accent}
      homeHref={home}
      step={step}
      back={
        step === 3
          ? { href: home, label: 'Retour à la boutique' }
          : { href: `${base}/panier`, label: 'Retour au panier' }
      }
      isPreview={isPreview}
      announcement={announcement}
      base={base}
    >
      {children}
    </ShopPageShell>
  );

  // ── Step 3: confirmation ─────────────────────────────────────────────
  if (placed) {
    const placedDirect = placed.payment.startsWith('direct:')
      ? options.direct.find((m) => `direct:${m.id}` === placed.payment)
      : undefined;
    const isOnline = placed.payment.startsWith('online_');
    const steps = isOnline
      ? [
          'Votre paiement en ligne a été validé avec succès.',
          `${storeName} prépare votre commande.`,
          'Vous êtes contacté sur WhatsApp pour la livraison.',
        ]
      : placedDirect
        ? [
            `Réglez ${formatMoney(placed.totalAmount)} via ${placedDirect.name} en indiquant la référence ${placed.reference}.`,
            `${storeName} confirme la réception de votre paiement.`,
            'Vous êtes contacté sur WhatsApp pour la livraison.',
          ]
        : [
            `${storeName} vous contacte sur WhatsApp pour confirmer la commande.`,
            'Le livreur vous apporte votre commande à l’adresse indiquée.',
            'Vous vérifiez vos articles puis payez en espèces au livreur.',
          ];
    return shell(
      3,
      <div className="max-w-2xl mx-auto space-y-5">
        <Card className="text-center py-10">
          <span className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9" />
          </span>
          <h1 className="mt-4 text-[26px] sm:text-[32px] font-bold tracking-tight">
            Merci{placed.firstName ? ` ${placed.firstName}` : ''}, commande reçue !
          </h1>
          <p className="mt-2 text-[16px] text-[#3F4654]">
            Votre commande a bien été envoyée à <strong>{storeName}</strong>.
          </p>
          <div className="mt-5 inline-flex flex-col sm:flex-row gap-2 sm:gap-6 px-5 py-3 rounded-2xl bg-[#F6F7F9] text-[15px]">
            <span>
              Référence : <strong className="tabular-nums">{placed.reference}</strong>
            </span>
            <span>
              Total : <strong className="tabular-nums">{formatMoney(placed.totalAmount)}</strong>
            </span>
          </div>
        </Card>

        {placedDirect && (
          <Card title={`Réglez maintenant via ${placedDirect.name}`}>
            {placedDirect.qrUrl && (
              <img
                src={placedDirect.qrUrl}
                alt={`QR code ${placedDirect.name}`}
                className="w-48 h-48 mx-auto rounded-2xl bg-white border border-[#E3E7EE] object-contain p-2"
              />
            )}
            {placedDirect.url && (
              <a
                href={placedDirect.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full min-h-12 inline-flex items-center justify-center rounded-full bg-[var(--accent)] text-white text-[16px] font-semibold"
              >
                Ouvrir le lien de paiement
              </a>
            )}
          </Card>
        )}

        <Card title="Et maintenant ?">
          <ol className="space-y-4">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-3 text-[15px] text-[#3F4654]">
                <span className="w-8 h-8 rounded-full bg-[var(--accent)] text-white text-[14px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="pt-1">{s}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Votre commande">
          <SummaryLines lines={placed.lines} />
        </Card>

        <div className="grid sm:grid-cols-2 gap-3">
          <a
            href={home}
            className="min-h-12 inline-flex items-center justify-center rounded-full bg-[var(--accent)] text-white text-[16px] font-semibold hover:brightness-110"
          >
            Continuer mes achats
          </a>
          {options.whatsapp && (
            <a
              href={`https://wa.me/${options.whatsapp}?text=${encodeURIComponent(`Bonjour ${storeName}, au sujet de ma commande ${placed.reference}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-white border border-black/10 text-[16px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9]"
            >
              <MessageCircle className="w-5 h-5 text-[#25D366]" /> Contacter la boutique
            </a>
          )}
        </div>
      </div>,
    );
  }

  // ── Empty cart ───────────────────────────────────────────────────────
  if (loaded && cart.lines.length === 0) {
    return shell(
      2,
      <Card className="max-w-xl mx-auto text-center py-12">
        <span className="mx-auto w-16 h-16 rounded-2xl bg-[#F6F7F9] text-[#9AA0AB] flex items-center justify-center">
          <ShoppingBag className="w-7 h-7" />
        </span>
        <p className="mt-4 text-[20px] font-bold">Votre panier est vide</p>
        <p className="mt-1 text-[15px] text-[#7A808C]">Ajoutez des articles avant de commander.</p>
        <a
          href={home}
          className="mt-6 inline-flex items-center justify-center h-12 px-6 rounded-full bg-[var(--accent)] text-white text-[15px] font-semibold"
        >
          Découvrir la boutique
        </a>
      </Card>,
    );
  }

  const submitLabel =
    mode === 'whatsapp'
      ? 'Commander sur WhatsApp'
      : payment.startsWith('online_')
        ? 'Payer par Mobile Money'
        : 'Confirmer la commande';

  // ── Step 2: details ──────────────────────────────────────────────────
  return shell(
    2,
    <>
      <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight">
        {mode === 'whatsapp' ? 'Commander sur WhatsApp' : 'Finaliser la commande'}
      </h1>
      <p className="mt-1 text-[15px] sm:text-[16px] text-[#7A808C]">
        {mode === 'whatsapp'
          ? 'Renseignez vos informations : votre commande est enregistrée puis WhatsApp s’ouvre avec le récapitulatif.'
          : 'Plus que quelques informations pour recevoir votre commande.'}
      </p>

      {/* Phones: collapsible order summary */}
      <div className="lg:hidden mt-5 rounded-[20px] bg-white border border-black/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSummary((v) => !v)}
          aria-expanded={showSummary}
          className="w-full flex items-center justify-between gap-3 px-5 h-14 cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold">
            <ShoppingBag className="w-5 h-5 text-[var(--accent)]" />
            {showSummary ? 'Masquer' : 'Voir'} le récapitulatif ({cart.count})
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showSummary ? 'rotate-180' : ''}`}
            />
          </span>
          <span className="text-[17px] font-extrabold tabular-nums">{formatMoney(total)}</span>
        </button>
        {showSummary && (
          <div className="px-5 pb-5 border-t border-black/5 pt-4">
            <SummaryLines lines={cart.lines} unitPrice={unitPrice} />
            <Totals
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              discount={discount}
              promoCode={promo?.code}
              total={total}
            />
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start"
      >
        <div className="space-y-5">
          <Card title={<Numbered n={1}>Vos coordonnées</Numbered>}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom et prénom *" icon={<User className="w-4 h-4" />}>
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
              <Field label="Numéro WhatsApp *" icon={<Phone className="w-4 h-4" />}>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#E3E7EE] bg-[#EEF0F3] text-[15px] font-semibold text-[#3F4654]">
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
            </div>
            <p className="mt-3 text-[13px] text-[#7A808C]">
              Le vendeur vous contacte sur ce numéro pour confirmer la commande.
            </p>
          </Card>

          <Card title={<Numbered n={2}>Livraison</Numbered>}>
            <div className="space-y-4">
              <Field
                label="Adresse de livraison (quartier, ville) *"
                icon={<MapPin className="w-4 h-4" />}
              >
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
                  rows={3}
                  maxLength={500}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Ex : en face de la pharmacie, 2e étage, sonnez chez Diop"
                  className={`${INPUT} h-auto py-3 resize-y`}
                />
              </Field>
              <div className="flex gap-3 p-4 rounded-2xl bg-[#F6F7F9] text-[14px] text-[#3F4654]">
                <Truck className="w-5 h-5 shrink-0 text-[var(--accent)]" />
                <span>
                  Livraison :{' '}
                  <strong>{deliveryFee > 0 ? formatMoney(deliveryFee) : 'offerte'}</strong>. Le
                  vendeur convient avec vous de l’heure et du lieu exact.
                </span>
              </div>
            </div>
          </Card>

          {mode === 'order' ? (
            <Card title={<Numbered n={3}>Paiement</Numbered>}>
              <fieldset className="space-y-2.5">
                <legend className="sr-only">Moyen de paiement</legend>
                {choices.map((c) => {
                  const on = payment === c.id;
                  return (
                    <label
                      key={c.id}
                      className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                        on
                          ? 'border-[var(--accent)] bg-[#F7F9FF]'
                          : 'border-[#E3E7EE] hover:bg-[#F6F7F9]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={c.id}
                        checked={on}
                        onChange={() => setPayment(c.id)}
                        className="mt-1 w-5 h-5 accent-[var(--accent)] shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-[16px] font-bold">
                          <span className="text-[var(--accent)]">{c.icon}</span>
                          {c.label}
                        </span>
                        <span className="block mt-1 text-[14px] text-[#7A808C]">{c.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            </Card>
          ) : (
            <Card title={<Numbered n={3}>Confirmation sur WhatsApp</Numbered>}>
              <div className="flex gap-3 text-[15px] text-[#3F4654]">
                <MessageCircle className="w-6 h-6 shrink-0 text-[#25D366]" />
                <p>
                  Votre commande est enregistrée chez {storeName}, puis WhatsApp s’ouvre avec le
                  récapitulatif déjà écrit. Le paiement se convient directement avec le vendeur.
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Summary (desktop) + submit */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <Card title="Votre commande" className="hidden lg:block">
            <SummaryLines lines={cart.lines} unitPrice={unitPrice} />
            <Totals
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              discount={discount}
              promoCode={promo?.code}
              total={total}
            />
            <div className="mt-4">
              <PromoCodeField
                request={promoRequest}
                signature={promoSignature}
                applied={promo}
                onChange={setPromo}
                accentVar="var(--accent)"
              />
            </div>
            <a
              href={`${base}/panier`}
              className="mt-3 inline-block text-[14px] font-semibold text-[var(--accent)] hover:underline underline-offset-2"
            >
              Modifier le panier
            </a>
          </Card>

          <div className="lg:hidden rounded-[20px] bg-white border border-black/5 p-4">
            <PromoCodeField
              request={promoRequest}
              signature={promoSignature}
              applied={promo}
              onChange={setPromo}
              accentVar="var(--accent)"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="px-4 py-3 rounded-2xl bg-[#FEF2F2] text-[14px] font-semibold text-[#B91C1C]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !loaded}
            className={`w-full min-h-14 rounded-full text-white text-[16px] font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'whatsapp'
                ? 'bg-[#25D366] hover:bg-[#20BA5A]'
                : 'bg-[var(--accent)] hover:brightness-110'
            }`}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === 'whatsapp' ? (
              <MessageCircle className="w-5 h-5" />
            ) : null}
            {submitLabel} · {formatMoney(total)}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[13px] text-[#7A808C]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Vos informations restent
            confidentielles.
          </p>
        </div>
      </form>
      <MonerizCheckoutModal
        isOpen={isMonerizModalOpen}
        onClose={() => setIsMonerizModalOpen(false)}
        session={monerizSession}
        onPaymentSuccess={async () => {
          setIsMonerizModalOpen(false);
          if (!pendingOnlineOrder) return;
          const orderToPlace = pendingOnlineOrder;
          try {
            await fetch(
              `/api/public/orders/${encodeURIComponent(orderToPlace.id)}/payment-status`,
              { method: 'POST' },
            );
          } catch {
            // Reconcilié également de manière asynchrone par le webhook Moneriz
          }
          trackCartPurchase(trackedLines, {
            reference: orderToPlace.reference,
            total: orderToPlace.totalAmount,
          });
          setPromo(null);
          setPlaced(orderToPlace);
          cart.clear();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </>,
  );
};

const Numbered: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <span className="flex items-center gap-3">
    <span className="w-8 h-8 rounded-full bg-[var(--accent)] text-white text-[14px] font-bold flex items-center justify-center shrink-0">
      {n}
    </span>
    {children}
  </span>
);

const Field: React.FC<{ label: string; icon?: React.ReactNode; children: React.ReactNode }> = ({
  label,
  icon,
  children,
}) => (
  <label className="block space-y-1.5 min-w-0">
    <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[#201D1D]">
      {icon && <span className="text-[#7A808C]">{icon}</span>}
      {label}
    </span>
    {children}
  </label>
);

const SummaryLines: React.FC<{ lines: CartLine[]; unitPrice?: Map<string, number> }> = ({
  lines,
  unitPrice,
}) => (
  <ul className="space-y-3">
    {lines.map((l) => (
      <li key={l.key} className="flex items-center gap-3">
        <span className="relative w-14 h-16 rounded-xl overflow-hidden bg-[#F1F3F6] shrink-0">
          {l.image && <img src={l.image} alt="" className="w-full h-full object-cover" />}
          <span className="absolute -top-0 -right-0 min-w-5 h-5 px-1 rounded-bl-lg bg-[#201D1D] text-white text-[11px] font-bold flex items-center justify-center">
            {l.quantity}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold line-clamp-2">{l.title}</span>
          {l.color && <span className="block text-[13px] text-[#7A808C]">{l.color}</span>}
        </span>
        <span className="text-[15px] font-bold tabular-nums">
          {formatMoney((unitPrice?.get(l.key) ?? l.price) * l.quantity)}
        </span>
      </li>
    ))}
  </ul>
);

const Totals: React.FC<{
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  promoCode?: string | undefined;
  total: number;
}> = ({ subtotal, deliveryFee, discount = 0, promoCode, total }) => (
  <dl className="mt-4 pt-4 border-t border-black/5 space-y-2.5 text-[15px]">
    <div className="flex justify-between text-[#3F4654]">
      <dt>Sous-total</dt>
      <dd className="tabular-nums">{formatMoney(subtotal)}</dd>
    </div>
    <div className="flex justify-between text-[#3F4654]">
      <dt>Livraison</dt>
      <dd className={deliveryFee > 0 ? 'tabular-nums' : 'font-semibold text-emerald-700'}>
        {deliveryFee > 0 ? formatMoney(deliveryFee) : 'Offerte'}
      </dd>
    </div>
    {discount > 0 && (
      <div className="flex justify-between font-semibold text-emerald-700">
        <dt>Code {promoCode}</dt>
        <dd className="tabular-nums">-{formatMoney(discount)}</dd>
      </div>
    )}
    <div className="pt-2.5 border-t border-black/5 flex justify-between text-[19px] font-extrabold">
      <dt>Total</dt>
      <dd className="tabular-nums">{formatMoney(total)}</dd>
    </div>
  </dl>
);
