'use client';

import React, { useState } from 'react';
import { Check, Loader2, Plus } from 'lucide-react';
import type { FunnelPageItem } from '@/types/juula';

interface ProductPickerProps {
  pages: FunnelPageItem[];
  selected: string[];
  onChange: (slugs: string[]) => void;
  /** Creates a product for this block, then opens its editor. */
  onCreate?: (name: string) => Promise<void>;
  createLabel: string;
}

/** Choose existing products for a banner / section, or create a new one. */
export const ProductPicker: React.FC<ProductPickerProps> = ({
  pages,
  selected,
  onChange,
  onCreate,
  createLabel,
}) => {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-3">
      {onCreate &&
        (creating ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              try {
                await onCreate(name.trim() || 'Nouveau produit');
                setCreating(false);
                setName('');
              } finally {
                setBusy(false);
              }
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Nom du nouveau produit"
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E3E7EE] bg-[#F6F7F9] text-[14px] text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold disabled:opacity-60 cursor-pointer"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer et configurer
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="h-11 px-4 rounded-xl border border-[#E3E7EE] text-[14px] font-semibold text-[#3F4654] cursor-pointer"
            >
              Annuler
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#EEF3FF] text-[#235BF7] text-[14px] font-semibold hover:bg-[#DFE8FF] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {createLabel}
          </button>
        ))}

      {pages.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {pages.map((p) => {
            const slug = p.config.slug;
            const on = selected.includes(slug);
            const image = p.config.mediaItems.find((m) => m.type === 'image')?.url;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                disabled={p.status === 'inactive'}
                onClick={() =>
                  onChange(on ? selected.filter((x) => x !== slug) : [...selected, slug])
                }
                className={`flex items-center gap-3 p-2 rounded-xl border-2 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  on ? 'border-[#235BF7] bg-[#F7F9FF]' : 'border-[#ECEFF4] hover:bg-[#F6F7F9]'
                }`}
              >
                <span className="w-10 h-10 rounded-lg overflow-hidden bg-[#F1F3F6] shrink-0">
                  {image && <img src={image} alt="" className="w-full h-full object-cover" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold text-[#201D1D] truncate">
                    {p.config.productTitle || p.internalName}
                  </span>
                  <span className="block text-[12px] text-[#7A808C]">
                    {p.status === 'inactive'
                      ? 'Désactivé'
                      : `${p.config.price.toLocaleString('fr-FR')} FCFA`}
                  </span>
                </span>
                <span
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                    on ? 'bg-[#235BF7] border-[#235BF7] text-white' : 'border-[#D5DAE2]'
                  }`}
                >
                  {on && <Check className="w-3 h-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
