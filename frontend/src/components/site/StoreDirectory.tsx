'use client';

// /boutiques: instant search (shop name, slogan or product sold) + categories.
import React, { useMemo, useState } from 'react';
import { Search, Store, X } from 'lucide-react';
import { STORE_CATEGORIES } from '@/lib/store/categories';
import { StoreCard, type StoreCardData } from '@/components/site/StoreCard';

export interface DirectoryItem extends StoreCardData {
  id: string;
  category: string | null;
  productTitles: string[];
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function StoreDirectory({ stores }: { stores: DirectoryItem[] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stores) if (s.category) m.set(s.category, (m.get(s.category) ?? 0) + 1);
    return m;
  }, [stores]);

  const shown = useMemo(() => {
    const t = norm(q.trim());
    return stores.filter((s) => {
      if (cat !== 'all' && s.category !== cat) return false;
      if (!t) return true;
      return (
        norm(s.name).includes(t) ||
        norm(s.subdomain).includes(t) ||
        norm(s.tagline ?? '').includes(t) ||
        s.productTitles.some((p) => norm(p).includes(t))
      );
    });
  }, [stores, q, cat]);

  const cats = STORE_CATEGORIES.filter((c) => counts.has(c.id));

  return (
    <div className="mt-8 sm:mt-10 space-y-5">
      <div className="relative max-w-2xl mx-auto">
        <Search className="w-5 h-5 text-[#9AA0AB] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une boutique ou un produit…"
          aria-label="Rechercher une boutique ou un produit"
          className="w-full h-14 pl-12 pr-12 rounded-2xl bg-[#F6F7F9] border border-[#E3E7EE] text-[16px] placeholder:text-[#9AA0AB] focus:outline-none focus:border-[#235BF7] focus:bg-white focus:ring-4 focus:ring-[#235BF7]/10 transition"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#7A808C] hover:bg-[#ECEFF4] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {cats.length > 0 && (
        <div className="-mx-4 px-4 flex gap-2 overflow-x-auto sm:flex-wrap sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ id: 'all', label: 'Toutes' }, ...cats].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              aria-pressed={cat === c.id}
              className={`shrink-0 min-h-10 px-4 rounded-full text-[14px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                cat === c.id
                  ? 'bg-[#201D1D] text-white'
                  : 'bg-[#F6F7F9] text-[#3F4654] border border-[#E3E7EE] hover:bg-white'
              }`}
            >
              {c.label}
              {c.id !== 'all' && <span className="ml-1 opacity-60">{counts.get(c.id)}</span>}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="py-16 text-center">
          <span className="mx-auto w-14 h-14 rounded-2xl bg-[#F6F7F9] flex items-center justify-center text-[#9AA0AB]">
            <Store className="w-7 h-7" />
          </span>
          <p className="mt-4 text-[16px] font-semibold">Aucune boutique trouvée</p>
          <p className="mt-1 text-[14px] text-[#7A808C]">
            Essayez un autre mot ou une autre catégorie.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {shown.map((s) => (
            <li key={s.id}>
              <StoreCard store={s} compact />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
