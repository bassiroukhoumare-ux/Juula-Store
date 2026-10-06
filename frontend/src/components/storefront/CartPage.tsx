'use client';

import React, { useEffect, useMemo } from 'react';
import {
  Banknote,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Trash2,
  Truck,
} from 'lucide-react';
import { formatMoney } from '@/lib/money';
import type { CheckoutOptions } from '@/lib/store/storefront-types';
import { useDisplayCurrency } from './useDisplayCurrency';
import { useCart } from './useCart';
import { ProductCard } from './ProductCard';
import { Card, ShopPageShell } from './ShopPageShell';
import type { ShopProduct } from './types';

export interface ShopPageProps {
  shop: string;
  storeName: string;
  logoUrl: string | null;
  accent: string;
  base: string;
  products: ShopProduct[];
  options: CheckoutOptions;
  isPreview: boolean;
  displayCurrency: string;
}

/** Highest delivery fee among the cart's products (what the server charges). */
export function cartDeliveryFee(slugs: string[], products: ShopProduct[]): number {
  return Math.max(0, ...slugs.map((s) => products.find((p) => p.slug === s)?.deliveryFee ?? 0));
}

/** Short list of what the shop accepts, for reassurance blocks. */
export function acceptedPayments(
  options: CheckoutOptions,
): { icon: React.ReactNode; label: string }[] {
  return [
    ...(options.cod
      ? [{ icon: <Banknote className="w-4 h-4" />, label: 'Paiement à la livraison' }]
      : []),
    ...(options.online
      ? [
          {
            icon: <Smartphone className="w-4 h-4" />,
            label: 'Mobile Money (Wave, Orange Money, carte)',
          },
        ]
      : []),
    ...options.direct.map((m) => ({ icon: <Smartphone className="w-4 h-4" />, label: m.name })),
    ...(options.whatsapp
      ? [{ icon: <MessageCircle className="w-4 h-4" />, label: 'Commande sur WhatsApp' }]
      : []),
  ];
}

export const CartPage: React.FC<ShopPageProps> = ({
  shop,
  storeName,
  logoUrl,
  accent,
  base,
  products,
  options,
  isPreview,
  displayCurrency,
}) => {
  const cart = useCart(shop);
  const home = base || '/';
  useDisplayCurrency(displayCurrency);
  const { sync, loaded } = cart;
  useEffect(() => {
    if (loaded) sync(products.map((p) => ({ slug: p.slug, price: p.price, title: p.title })));
  }, [loaded, sync, products]);

  const deliveryFee = cartDeliveryFee(
    cart.lines.map((l) => l.slug),
    products,
  );
  const total = cart.subtotal + deliveryFee;
  const notices = [
    ...new Set(
      cart.lines
        .map((l) => products.find((p) => p.slug === l.slug)?.deliveryNotice)
        .filter(Boolean),
    ),
  ];
  const suggestions = useMemo(
    () =>
      products
        .filter((p) => p.inCatalogue && !cart.lines.some((l) => l.slug === p.slug))
        .slice(0, 4),
    [products, cart.lines],
  );
  const hrefOf = (slug: string) => products.find((p) => p.slug === slug)?.pageHref ?? null;

  const addSuggestion = (p: ShopProduct) =>
    cart.add({
      slug: p.slug,
      color: null,
      title: p.title,
      image: p.images[0] ?? null,
      price: p.price,
    });
  const openSuggestion = (p: ShopProduct) => {
    if (p.pageHref) window.location.href = p.pageHref;
  };

  return (
    <ShopPageShell
      storeName={storeName}
      logoUrl={logoUrl}
      accent={accent}
      homeHref={home}
      step={1}
      back={{ href: home, label: 'Continuer mes achats' }}
      isPreview={isPreview}
    >
      <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight">
        Mon panier
        {cart.count > 0 && (
          <span className="ml-2 text-[18px] sm:text-[22px] font-semibold text-[#7A808C]">
            ({cart.count} article{cart.count > 1 ? 's' : ''})
          </span>
        )}
      </h1>

      {!loaded ? (
        <div
          className="mt-6 h-64 rounded-[24px] bg-white/60 animate-pulse"
          aria-label="Chargement"
        />
      ) : cart.lines.length === 0 ? (
        <Card className="mt-6 text-center py-12 sm:py-16">
          <span className="mx-auto w-16 h-16 rounded-2xl bg-[#F6F7F9] text-[#9AA0AB] flex items-center justify-center">
            <ShoppingBag className="w-7 h-7" />
          </span>
          <p className="mt-4 text-[20px] font-bold">Votre panier est vide</p>
          <p className="mt-1 text-[15px] text-[#7A808C]">
            Parcourez la boutique et ajoutez les articles qui vous plaisent.
          </p>
          <a
            href={home}
            className="mt-6 inline-flex items-center justify-center h-12 px-6 rounded-full bg-[var(--accent)] text-white text-[15px] font-semibold hover:brightness-110"
          >
            Découvrir la boutique
          </a>
        </Card>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
          {/* Lines */}
          <Card className="!p-0 overflow-hidden">
            <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_140px_110px] gap-4 px-6 py-3 border-b border-black/5 text-[13px] font-semibold uppercase tracking-wide text-[#7A808C]">
              <span>Article</span>
              <span className="text-center">Quantité</span>
              <span className="text-right">Total</span>
            </div>
            <ul className="divide-y divide-black/5">
              {cart.lines.map((l) => {
                const href = hrefOf(l.slug);
                return (
                  <li
                    key={l.key}
                    className="p-4 sm:px-6 sm:py-5 grid grid-cols-[88px_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_140px_110px] gap-4 items-center"
                  >
                    <div className="flex items-center gap-4 min-w-0 sm:col-span-1 col-span-2">
                      <div className="w-[88px] h-[104px] sm:w-24 sm:h-28 rounded-2xl overflow-hidden bg-[#F1F3F6] shrink-0">
                        {l.image && (
                          <img src={l.image} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {href ? (
                          <a
                            href={href}
                            className="text-[16px] font-semibold line-clamp-2 hover:underline underline-offset-2"
                          >
                            {l.title}
                          </a>
                        ) : (
                          <p className="text-[16px] font-semibold line-clamp-2">{l.title}</p>
                        )}
                        <p className="mt-1 text-[14px] text-[#7A808C]">
                          {formatMoney(l.price)} l’unité
                          {l.color ? ` · Couleur : ${l.color}` : ''}
                        </p>
                        <button
                          type="button"
                          onClick={() => cart.remove(l.key)}
                          className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#DC2626] hover:underline underline-offset-2 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" /> Retirer
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-center gap-3">
                      <div className="inline-flex items-center rounded-full border border-black/10 bg-white">
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(l.key, l.quantity - 1)}
                          aria-label={`Diminuer la quantité de ${l.title}`}
                          className="w-11 h-11 flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-[16px] font-bold tabular-nums">
                          {l.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(l.key, l.quantity + 1)}
                          aria-label={`Augmenter la quantité de ${l.title}`}
                          className="w-11 h-11 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="sm:hidden text-[17px] font-extrabold tabular-nums">
                        {formatMoney(l.price * l.quantity)}
                      </span>
                    </div>
                    <span className="hidden sm:block text-right text-[17px] font-extrabold tabular-nums">
                      {formatMoney(l.price * l.quantity)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Summary */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <Card title="Récapitulatif">
              <dl className="space-y-3 text-[15px]">
                <div className="flex justify-between text-[#3F4654]">
                  <dt>
                    Sous-total ({cart.count} article{cart.count > 1 ? 's' : ''})
                  </dt>
                  <dd className="tabular-nums">{formatMoney(cart.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-[#3F4654]">
                  <dt>Livraison</dt>
                  <dd
                    className={deliveryFee > 0 ? 'tabular-nums' : 'font-semibold text-emerald-700'}
                  >
                    {deliveryFee > 0 ? formatMoney(deliveryFee) : 'Offerte'}
                  </dd>
                </div>
                <div className="pt-3 border-t border-black/5 flex justify-between text-[20px] font-extrabold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatMoney(total)}</dd>
                </div>
              </dl>
              <div className="mt-5 space-y-2.5">
                <a
                  href={`${base}/commande`}
                  className="w-full h-13 min-h-12 inline-flex items-center justify-center rounded-full bg-[var(--accent)] text-white text-[16px] font-semibold hover:brightness-110 transition-all"
                >
                  Valider la commande
                </a>
                {options.whatsapp && (
                  <a
                    href={`${base}/commande?mode=whatsapp`}
                    className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white text-[16px] font-semibold"
                  >
                    <MessageCircle className="w-5 h-5" /> Commander sur WhatsApp
                  </a>
                )}
              </div>
            </Card>

            <Card>
              <ul className="space-y-3.5 text-[14px] text-[#3F4654]">
                <li className="flex gap-3">
                  <Truck className="w-5 h-5 shrink-0 text-[var(--accent)]" />
                  <span>
                    <strong className="block text-[#201D1D]">Livraison</strong>
                    {notices[0] ||
                      'Le vendeur vous contacte sur WhatsApp pour convenir de l’heure et du lieu de livraison.'}
                  </span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="w-5 h-5 shrink-0 text-[var(--accent)]" />
                  <span>
                    <strong className="block text-[#201D1D]">Commande sécurisée</strong>
                    Vos informations servent uniquement à préparer et livrer votre commande.
                  </span>
                </li>
              </ul>
              {acceptedPayments(options).length > 0 && (
                <div className="mt-4 pt-4 border-t border-black/5">
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-[#7A808C]">
                    Moyens de paiement acceptés
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {acceptedPayments(options).map((p) => (
                      <li
                        key={p.label}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#F6F7F9] text-[13px] font-semibold text-[#3F4654]"
                      >
                        {p.icon} {p.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[22px] sm:text-[28px] font-bold tracking-tight">
            Vous aimerez aussi
          </h2>
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6">
            {suggestions.map((p) => (
              <ProductCard key={p.slug} product={p} onAdd={addSuggestion} onOpen={openSuggestion} />
            ))}
          </div>
        </section>
      )}
    </ShopPageShell>
  );
};
