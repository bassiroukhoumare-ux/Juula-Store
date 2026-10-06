'use client';

import React, { useState } from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { discountPercent, type ShopProduct } from './types';

interface ProductCardProps {
  product: ShopProduct;
  onAdd: (product: ShopProduct) => void;
  /** Opens the product sheet (details, colours, quantity). */
  onOpen: (product: ShopProduct) => void;
  badge?: string | undefined;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd, onOpen, badge }) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const discount = discountPercent(product);
  const image = product.images[imageIndex] ?? product.images[0];

  const add = () => {
    // A product with colours needs a choice: open its sheet.
    if (product.colors.length > 0) {
      onOpen(product);
      return;
    }
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article className="group flex flex-col">
      <button
        type="button"
        onClick={() => onOpen(product)}
        aria-label={`Voir ${product.title}`}
        className="relative block w-full aspect-[4/5] rounded-[20px] overflow-hidden bg-[#E9ECEF] cursor-pointer"
        onMouseEnter={() => product.images.length > 1 && setImageIndex(1)}
        onMouseLeave={() => setImageIndex(0)}
      >
        {image ? (
          <img
            src={image}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-[#9AA0AB]">
            <ShoppingBag className="w-8 h-8" />
          </span>
        )}
        {(badge || discount > 0) && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white text-[12px] font-bold text-[#201D1D] shadow-sm">
            {badge ?? `-${discount}%`}
          </span>
        )}
        {product.images.length > 1 && (
          <span className="absolute bottom-3 inset-x-0 flex justify-center gap-1">
            {product.images.slice(0, 5).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full bg-white transition-all ${
                  i === imageIndex ? 'w-4 opacity-100' : 'w-1.5 opacity-60'
                }`}
              />
            ))}
          </span>
        )}
      </button>

      <div className="pt-3 flex-1 flex flex-col">
        {/* Fixed-height lines so every card in a row lines up. */}
        <p className="h-4 text-[11px] leading-4 font-semibold uppercase tracking-[0.12em] text-[#7A808C] truncate">
          {product.category || '\u00a0'}
        </p>
        <button
          type="button"
          onClick={() => onOpen(product)}
          className="mt-1 min-h-[2.6em] text-left text-[14px] sm:text-[15px] leading-[1.3] font-semibold text-[#201D1D] line-clamp-2 hover:underline underline-offset-2 cursor-pointer"
        >
          {product.title}
        </button>
        <p className="mt-1.5 mb-3 min-h-[1.5rem] flex flex-wrap items-baseline gap-x-2">
          {discount > 0 && (
            <span className="text-[13px] text-[#9AA0AB] line-through">
              {formatMoney(product.originalPrice)}
            </span>
          )}
          <span className="text-[16px] font-extrabold text-[#201D1D]">
            {formatMoney(product.price)}
          </span>
        </p>
        <button
          type="button"
          onClick={add}
          aria-live="polite"
          className="mt-auto w-full inline-flex items-center justify-center gap-2 h-11 px-2 rounded-full bg-[var(--accent)] text-white text-[13px] sm:text-[14px] font-semibold whitespace-nowrap hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
        >
          {added ? (
            <>
              <Check className="w-4 h-4" strokeWidth={3} /> Ajouté au panier
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              {product.colors.length > 0 ? 'Choisir une couleur' : 'Ajouter au panier'}
            </>
          )}
        </button>
      </div>
    </article>
  );
};
