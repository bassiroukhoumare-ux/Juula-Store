'use client';

import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, Minus, Plus, ShoppingBag, Truck, X } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { discountPercent, type ShopProduct } from './types';

interface ProductSheetProps {
  product: ShopProduct | null;
  onClose: () => void;
  onAdd: (product: ShopProduct, quantity: number, color: string | null) => void;
}

/** Product details inside the shop: gallery, price, selling points, colour, quantity. */
export const ProductSheet: React.FC<ProductSheetProps> = ({ product, onClose, onAdd }) => {
  const [image, setImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setImage(0);
    setQuantity(1);
    setColor(product?.colors[0]?.name ?? null);
    setAdded(false);
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [product, onClose]);

  if (!product) return null;
  const discount = discountPercent(product);

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
    >
      <div className="absolute inset-0 bg-[#201D1D]/45" onClick={onClose} />
      <div className="relative w-full sm:max-w-4xl max-h-[94vh] overflow-y-auto bg-white rounded-t-[28px] sm:rounded-[28px] grid md:grid-cols-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/95 border border-black/5 flex items-center justify-center cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-3 sm:p-4 space-y-3">
          <div className="relative aspect-[4/5] rounded-[20px] overflow-hidden bg-[#F1F3F6]">
            {product.images[image] && (
              <img
                src={product.images[image]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            )}
            {discount > 0 && (
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[var(--accent)] text-white text-[13px] font-bold">
                -{discount} %
              </span>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setImage(i)}
                  aria-label={`Image ${i + 1}`}
                  className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer ${
                    i === image ? 'border-[var(--accent)]' : 'border-transparent'
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 sm:p-7 flex flex-col gap-4">
          {product.category && (
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7A808C]">
              {product.category}
            </p>
          )}
          <h2 className="-mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#201D1D]">
            {product.title}
          </h2>
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-2xl font-extrabold text-[#201D1D]">
              {formatMoney(product.price)}
            </span>
            {discount > 0 && (
              <span className="text-[15px] text-[#9AA0AB] line-through">
                {formatMoney(product.originalPrice)}
              </span>
            )}
          </p>

          {product.benefits.length > 0 && (
            <ul className="space-y-2">
              {product.benefits.map((b) => (
                <li key={b} className="flex gap-2 text-[15px] text-[#3F4654]">
                  <Check className="w-4 h-4 mt-1 shrink-0 text-[var(--accent)]" />
                  {b}
                </li>
              ))}
            </ul>
          )}

          {product.colors.length > 0 && (
            <div className="space-y-2">
              <p className="text-[14px] font-semibold text-[#201D1D]">Couleur : {color}</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.name)}
                    aria-pressed={color === c.name}
                    className={`inline-flex items-center gap-2 h-10 px-3 rounded-full border-2 text-[14px] font-semibold cursor-pointer ${
                      color === c.name ? 'border-[var(--accent)]' : 'border-[#E3E7EE]'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ backgroundColor: c.hex }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-[#E3E7EE] h-12">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Diminuer la quantité"
                className="w-11 h-full flex items-center justify-center cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-bold tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                aria-label="Augmenter la quantité"
                className="w-11 h-full flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                onAdd(product, quantity, color);
                setAdded(true);
                setTimeout(onClose, 700);
              }}
              className="flex-1 h-12 rounded-full bg-[var(--accent)] text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 hover:brightness-110 cursor-pointer"
            >
              {added ? (
                <Check className="w-4 h-4" strokeWidth={3} />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
              {added ? 'Ajouté !' : `Ajouter au panier · ${formatMoney(product.price * quantity)}`}
            </button>
          </div>

          {product.deliveryNotice && (
            <p className="flex items-start gap-2 text-[14px] text-[#7A808C]">
              <Truck className="w-4 h-4 mt-0.5 shrink-0" /> {product.deliveryNotice}
            </p>
          )}
          {product.pageHref && (
            <a
              href={product.pageHref}
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--accent)] hover:underline"
            >
              Voir la page complète du produit <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
