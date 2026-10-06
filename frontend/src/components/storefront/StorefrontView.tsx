'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Eye,
  ShoppingBag,
  XCircle,
} from 'lucide-react';
import { applyDisplayCurrency, formatMoney, isDisplayCurrency } from '@/lib/money';
import type {
  BannerPlacement,
  CheckoutOptions,
  StoreBanner,
  StoreSection,
} from '@/lib/store/storefront-types';
import { CartDrawer } from './CartDrawer';
import { ProductCard } from './ProductCard';
import { ProductSheet } from './ProductSheet';
import { useCart } from './useCart';
import { discountPercent, type ShopProduct } from './types';

export interface StorefrontViewProps {
  shop: string;
  storeName: string;
  tagline: string;
  logoUrl: string | null;
  coverUrl: string | null;
  accent: string;
  banners: StoreBanner[];
  sections: StoreSection[];
  /** Every buyable product (catalogue + banner / section products). */
  products: ShopProduct[];
  options: CheckoutOptions;
  displayCurrency: string;
  /** Owner viewing an unpublished shop. */
  isPreview: boolean;
}

const NEW_COUNT = 4;

export const StorefrontView: React.FC<StorefrontViewProps> = (props) => {
  const { shop, storeName, tagline, logoUrl, coverUrl, accent, banners, sections, options } = props;
  const allProducts = props.products;
  // « Nos articles », nouveautés, sélection: catalogue products only.
  const products = useMemo(() => allProducts.filter((p) => p.inCatalogue), [allProducts]);
  const bySlug = useMemo(() => new Map(allProducts.map((p) => [p.slug, p])), [allProducts]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const cart = useCart(shop);
  const [cartOpen, setCartOpen] = useState(false);
  const [category, setCategory] = useState('');
  // Banner « collection » (e.g. a promotion): only its products are listed.
  const [collection, setCollection] = useState<StoreBanner | null>(null);
  const [sheet, setSheet] = useState<ShopProduct | null>(null);
  const [bump, setBump] = useState(false);
  const [, setCurrencyTick] = useState(0);
  const catalogueRef = useRef<HTMLElement>(null);

  // Prices are rendered in FCFA on the server; switch to the merchant's
  // display currency once in the browser.
  useEffect(() => {
    if (!isDisplayCurrency(props.displayCurrency) || props.displayCurrency === 'XOF') return;
    void applyDisplayCurrency(props.displayCurrency).then(() => setCurrencyTick((t) => t + 1));
  }, [props.displayCurrency]);

  // Keep the saved cart consistent with what the shop sells today.
  const { sync, loaded } = cart;
  useEffect(() => {
    if (loaded) sync(allProducts.map((p) => ({ slug: p.slug, price: p.price, title: p.title })));
  }, [loaded, sync, allProducts]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products],
  );
  const visible = collection
    ? (collection.productSlugs.map((slug) => bySlug.get(slug)).filter(Boolean) as ShopProduct[])
    : category
      ? products.filter((p) => p.category === category)
      : products;
  const newest = useMemo(
    () => [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, NEW_COUNT),
    [products],
  );
  const selection = useMemo(() => {
    const featured = products.filter((p) => p.featured);
    const rest = [...products]
      .filter((p) => !p.featured)
      .sort((a, b) => discountPercent(b) - discountPercent(a));
    return [...featured, ...rest].slice(0, 4);
  }, [products]);

  const addToCart = (p: ShopProduct, quantity = 1, color: string | null = null) => {
    cart.add(
      { slug: p.slug, color, title: p.title, image: p.images[0] ?? null, price: p.price },
      quantity,
    );
    setBump(true);
    setTimeout(() => setBump(false), 450);
  };

  const showCatalogue = (cat = '') => {
    setCollection(null);
    setCategory(cat);
    catalogueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openBanner = (b: StoreBanner) => {
    if (b.productSlugs.length > 0) {
      setCategory('');
      setCollection(b);
      catalogueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      showCatalogue(b.category);
    }
  };

  const renderSections = (placement: BannerPlacement) =>
    sections
      .filter((x) => x.placement === placement)
      .map((x) => {
        if (x.type === 'testimonials') {
          if (x.images.length === 0) return null;
          return (
            <section key={x.id} className="max-w-7xl mx-auto px-4 sm:px-6 pt-16">
              <SectionTitle
                eyebrow="Ils nous font confiance"
                title={x.title}
                subtitle={x.subtitle}
              />
              {/* Same grid and size as the product cards: 2 per row on phones, 4 on computers. */}
              <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6 sm:gap-x-6">
                {x.images.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setLightbox(src)}
                    aria-label={`Agrandir le témoignage ${i + 1}`}
                    className="block w-full aspect-[4/5] rounded-[20px] overflow-hidden bg-white border border-black/5 cursor-zoom-in"
                  >
                    <img
                      src={src}
                      alt={`Témoignage client ${i + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover object-top"
                    />
                  </button>
                ))}
              </div>
            </section>
          );
        }
        const list = x.productSlugs
          .map((slug) => bySlug.get(slug))
          .filter(Boolean) as ShopProduct[];
        if (list.length === 0) return null;
        return (
          <section key={x.id} className="max-w-7xl mx-auto px-4 sm:px-6 pt-16">
            <SectionTitle eyebrow="Sélection" title={x.title} subtitle={x.subtitle} />
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6">
              {list.map((p) => (
                <ProductCard
                  key={p.slug}
                  product={p}
                  onAdd={(q) => addToCart(q)}
                  onOpen={setSheet}
                />
              ))}
            </div>
          </section>
        );
      });

  const renderBanners = (placement: BannerPlacement) => {
    const list = banners.filter((b) => b.placement === placement);
    if (list.length === 0) return renderSections(placement);
    return (
      <>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 grid gap-5">
          {list.map((b) => (
            <div
              key={b.id}
              className="relative rounded-[28px] overflow-hidden min-h-[220px] sm:min-h-[320px] flex items-center"
            >
              <img
                src={b.imageUrl}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
              <div className="relative p-6 sm:p-14 text-white max-w-xl">
                {b.badge && (
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/80">
                    {b.badge}
                  </p>
                )}
                <h2 className="mt-2 text-2xl sm:text-4xl font-bold tracking-tight">{b.title}</h2>
                {b.buttonLabel && (
                  <button
                    type="button"
                    onClick={() => openBanner(b)}
                    className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white text-[#201D1D] text-[14px] font-semibold cursor-pointer"
                  >
                    {b.buttonLabel} <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
        {renderSections(placement)}
      </>
    );
  };

  return (
    <div
      className="min-h-screen bg-[#F1F3F2] text-[#201D1D]"
      style={{ ['--accent' as string]: accent }}
    >
      {props.isPreview && (
        <div className="bg-[#201D1D] text-white text-[13px] font-semibold text-center py-2 px-4 flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" /> Aperçu privé — votre boutique n’est pas encore publiée.
        </div>
      )}
      <PaymentReturnBanner onPaid={cart.clear} />

      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-[#F1F3F2]/90 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a href="#accueil" className="flex items-center gap-2.5 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-black/5 bg-white"
              />
            ) : (
              <span className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold">
                {storeName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="font-bold text-[17px] truncate">{storeName}</span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-[14px] text-[#3F4654]">
            <a href="#accueil" className="hover:text-[#201D1D]">
              Accueil
            </a>
            <button
              type="button"
              onClick={() => showCatalogue()}
              className="hover:text-[#201D1D] cursor-pointer"
            >
              Boutique
            </button>
            {categories.length > 0 && (
              <button
                type="button"
                onClick={() => showCatalogue(categories[0])}
                className="hover:text-[#201D1D] cursor-pointer"
              >
                Catégories
              </button>
            )}
          </nav>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Panier (${cart.count} article${cart.count > 1 ? 's' : ''})`}
            className={`relative w-11 h-11 rounded-full bg-white border border-black/5 flex items-center justify-center cursor-pointer transition-transform ${bump ? 'scale-110' : ''}`}
          >
            <ShoppingBag className="w-5 h-5" />
            {cart.count > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[var(--accent)] text-white text-[11px] font-bold flex items-center justify-center">
                {cart.count}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section id="accueil" className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="relative rounded-[28px] overflow-hidden min-h-[340px] sm:min-h-[420px] flex items-end bg-[var(--accent)]">
          {coverUrl && (
            <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
          <div className="relative p-6 sm:p-12 text-white max-w-2xl">
            {logoUrl && (
              <img
                src={logoUrl}
                alt=""
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white/90 bg-white mb-4"
              />
            )}
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
              {storeName}
            </h1>
            {tagline && <p className="mt-3 text-[15px] sm:text-[17px] text-white/85">{tagline}</p>}
            <button
              type="button"
              onClick={() => showCatalogue()}
              className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-[#201D1D] text-[15px] font-semibold hover:bg-white/90 cursor-pointer"
            >
              Découvrir la boutique <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {renderBanners('before_products')}

      {/* Catalogue */}
      <section
        ref={catalogueRef}
        id="boutique"
        className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 scroll-mt-20"
      >
        <SectionTitle
          eyebrow="À découvrir"
          title="Nos articles"
          subtitle={tagline || `Tous les articles de ${storeName}.`}
        />
        {categories.length > 0 && (
          <div className="mt-7 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center">
            {['', ...categories].map((c) => (
              <button
                key={c || 'all'}
                type="button"
                onClick={() => {
                  setCollection(null);
                  setCategory(c);
                }}
                className={`shrink-0 h-10 px-4 rounded-full text-[14px] font-semibold border transition-colors cursor-pointer ${
                  !collection && category === c
                    ? 'bg-[#201D1D] text-white border-[#201D1D]'
                    : 'bg-white text-[#3F4654] border-black/5 hover:bg-white/70'
                }`}
              >
                {c || 'Tout'}
              </button>
            ))}
          </div>
        )}
        {collection && (
          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-2 h-10 pl-4 pr-1.5 rounded-full bg-[var(--accent)] text-white text-[14px] font-semibold">
              {collection.badge || collection.title}
              <button
                type="button"
                onClick={() => setCollection(null)}
                aria-label="Voir tous les articles"
                className="h-7 px-3 rounded-full bg-white/20 hover:bg-white/30 text-[13px] cursor-pointer"
              >
                Voir tout
              </button>
            </span>
          </div>
        )}
        {visible.length === 0 ? (
          <p className="py-16 text-center text-[15px] text-[#7A808C]">
            {products.length === 0
              ? 'Aucun article pour le moment. Revenez bientôt !'
              : 'Aucun article dans cette catégorie.'}
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6">
            {visible.map((p) => (
              <ProductCard key={p.slug} product={p} onAdd={(x) => addToCart(x)} onOpen={setSheet} />
            ))}
          </div>
        )}
      </section>

      {renderBanners('after_products')}

      {/* Newest */}
      {products.length > NEW_COUNT && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-20">
          <SectionTitle
            eyebrow="Nouveautés"
            title="Nos nouveautés"
            subtitle="Les derniers articles arrivés en boutique."
          />
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6">
            {newest.map((p) => (
              <ProductCard
                key={p.slug}
                product={p}
                onAdd={(x) => addToCart(x)}
                onOpen={setSheet}
                badge="Nouveau"
              />
            ))}
          </div>
        </section>
      )}

      {renderBanners('after_new')}

      {/* Selection */}
      {selection.length >= 2 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-20">
          <SectionTitle
            eyebrow="Sélection du moment"
            title="La sélection du moment"
            subtitle="Les pièces préférées de nos clients."
          />
          <div className="mt-8 grid lg:grid-cols-[1.4fr_1fr] gap-4">
            <FeaturedCard product={selection[0]!} onOpen={setSheet} />
            <div className="grid gap-4">
              {selection.slice(1).map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => setSheet(p)}
                  className="group w-full text-left flex items-center gap-4 p-3 rounded-[24px] bg-white border border-black/5 hover:border-black/10 transition-colors cursor-pointer"
                >
                  <span className="w-24 h-24 sm:w-28 sm:h-28 rounded-[18px] overflow-hidden bg-[#E9ECEF] shrink-0">
                    {p.images[0] && (
                      <img
                        src={p.images[0]}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    {p.category && (
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7A808C]">
                        {p.category}
                      </span>
                    )}
                    <span className="block text-[16px] font-semibold truncate">{p.title}</span>
                    <span className="mt-1 flex flex-wrap items-baseline gap-x-2">
                      <span className="font-extrabold">{formatMoney(p.price)}</span>
                      {discountPercent(p) > 0 && (
                        <>
                          <span className="text-[13px] text-[#9AA0AB] line-through">
                            {formatMoney(p.originalPrice)}
                          </span>
                          <span className="text-[13px] font-bold text-[var(--accent)]">
                            -{discountPercent(p)} %
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center shrink-0 group-hover:bg-[#201D1D] group-hover:text-white transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {renderBanners('bottom')}

      {/* Footer */}
      <footer className="mt-24 bg-[var(--accent)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="max-w-sm">
            <p className="text-[17px] font-bold">{storeName}</p>
            {tagline && <p className="mt-2 text-[14px] text-white/75">{tagline}</p>}
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-white/85">
            <a href="#accueil" className="hover:text-white">
              Accueil
            </a>
            <button
              type="button"
              onClick={() => showCatalogue()}
              className="hover:text-white cursor-pointer"
            >
              Boutique
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => showCatalogue(c)}
                className="hover:text-white cursor-pointer"
              >
                {c}
              </button>
            ))}
          </nav>
        </div>
        <p className="pb-8 text-center text-[12px] text-white/60">
          Boutique propulsée par{' '}
          <a
            href="https://www.juula.store"
            className="font-semibold text-white/80 hover:text-white"
          >
            Juula
          </a>
        </p>
      </footer>

      {/* Floating cart (phones) */}
      {cart.count > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="md:hidden fixed bottom-4 inset-x-4 z-40 h-14 rounded-full bg-[var(--accent)] text-white font-semibold flex items-center justify-center gap-2 shadow-[0_14px_30px_-12px_rgba(0,0,0,0.45)] cursor-pointer"
        >
          <ShoppingBag className="w-5 h-5" /> Voir le panier ({cart.count}) ·{' '}
          {formatMoney(cart.subtotal)}
        </button>
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Témoignage"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[66] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={lightbox}
            alt="Témoignage client"
            className="max-w-full max-h-full rounded-2xl"
          />
        </div>
      )}

      <ProductSheet
        product={sheet}
        onClose={() => setSheet(null)}
        onAdd={(p, quantity, color) => addToCart(p, quantity, color)}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        shop={shop}
        storeName={storeName}
        cart={cart}
        products={products}
        options={options}
        isPreview={props.isPreview}
      />
    </div>
  );
};

const SectionTitle: React.FC<{ eyebrow: string; title: string; subtitle: string }> = ({
  eyebrow,
  title,
  subtitle,
}) => (
  <div className="text-center">
    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7A808C]">
      {eyebrow}
    </p>
    <h2 className="mt-2 text-3xl sm:text-[40px] font-bold tracking-tight">{title}</h2>
    <p className="mt-2 text-[15px] text-[#7A808C]">{subtitle}</p>
  </div>
);

const FeaturedCard: React.FC<{ product: ShopProduct; onOpen: (p: ShopProduct) => void }> = ({
  product,
  onOpen,
}) => {
  const discount = discountPercent(product);
  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className="group relative block w-full text-left rounded-[28px] overflow-hidden min-h-[380px] lg:min-h-full bg-[#E9ECEF] cursor-pointer"
    >
      {product.images[0] && (
        <img
          src={product.images[0]}
          alt={product.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      {discount > 0 && (
        <span className="absolute top-5 left-5 px-3 py-1 rounded-full bg-[var(--accent)] text-white text-[13px] font-bold">
          -{discount} %
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9 text-white">
        <p className="text-2xl sm:text-4xl font-bold tracking-tight">{product.title}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-baseline gap-2">
            <span className="text-xl font-bold">{formatMoney(product.price)}</span>
            {discount > 0 && (
              <span className="text-[14px] text-white/70 line-through">
                {formatMoney(product.originalPrice)}
              </span>
            )}
          </p>
          <span className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white text-[#201D1D] text-[14px] font-semibold">
            Découvrir le produit <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </button>
  );
};

/** Back from the hosted online payment: /…?payment=success&order=<id>. */
const PaymentReturnBanner: React.FC<{ onPaid: () => void }> = ({ onPaid }) => {
  const [state, setState] = useState<null | 'checking' | 'paid' | 'pending' | 'cancelled'>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const orderId = params.get('order');
    if (!payment) return;
    window.history.replaceState(null, '', window.location.pathname);
    if (payment !== 'success' || !orderId) {
      setState('cancelled');
      return;
    }
    setState('checking');
    void (async () => {
      for (let i = 0; i < 5; i++) {
        const res = await fetch(
          `/api/public/orders/${encodeURIComponent(orderId)}/payment-status`,
          { method: 'POST' },
        ).catch(() => null);
        const body = (await res?.json().catch(() => null)) as { paymentStatus?: string } | null;
        if (body?.paymentStatus === 'paid') {
          setState('paid');
          onPaid();
          return;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
      setState('pending');
    })();
  }, [onPaid]);

  if (!state) return null;
  const tone =
    state === 'paid' ? 'bg-emerald-600' : state === 'cancelled' ? 'bg-[#B91C1C]' : 'bg-[#201D1D]';
  return (
    <div
      className={`${tone} text-white text-[14px] font-semibold py-3 px-4 flex items-center justify-center gap-2 text-center`}
    >
      {state === 'paid' ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : state === 'cancelled' ? (
        <XCircle className="w-4 h-4" />
      ) : (
        <Clock className="w-4 h-4" />
      )}
      {state === 'checking' && 'Vérification de votre paiement…'}
      {state === 'paid' && 'Paiement confirmé ! Votre commande est en préparation.'}
      {state === 'pending' &&
        'Paiement en cours de confirmation. Vous recevrez un message dès sa validation.'}
      {state === 'cancelled' && 'Paiement annulé. Votre panier est toujours là.'}
    </div>
  );
};
