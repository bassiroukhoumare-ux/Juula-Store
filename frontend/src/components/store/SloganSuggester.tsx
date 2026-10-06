'use client';

import React, { useState } from 'react';
import { Lightbulb, RefreshCw, X } from 'lucide-react';
import { SHOP_TYPES, suggestSlogans, type ShopTypeId } from '@/lib/store/slogans';

interface SloganSuggesterProps {
  storeName?: string | undefined;
  onPick: (slogan: string) => void;
}

/** « Me proposer des slogans »: describe the shop, pick an idea. */
export const SloganSuggester: React.FC<SloganSuggesterProps> = ({ storeName, onPick }) => {
  const [open, setOpen] = useState(false);
  const [what, setWhat] = useState('');
  const [type, setType] = useState<ShopTypeId | null>(null);
  const [seed, setSeed] = useState(1);
  const [ideas, setIdeas] = useState<string[]>([]);

  const generate = (nextSeed = seed) => {
    setIdeas(suggestSlogans({ what, type, storeName, seed: nextSeed }));
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#EEF3FF] text-[#235BF7] text-[14px] font-semibold hover:bg-[#DFE8FF] cursor-pointer"
      >
        <Lightbulb className="w-4 h-4" /> Me proposer des slogans
      </button>
    );
  }

  return (
    <div className="p-4 rounded-2xl border border-[#DFE8FF] bg-[#F7F9FF] space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold text-[#201D1D]">Que vend votre boutique ?</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A808C] hover:bg-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {SHOP_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(type === t.id ? null : t.id)}
            aria-pressed={type === t.id}
            className={`h-9 px-3 rounded-full text-[13px] font-semibold border cursor-pointer ${
              type === t.id
                ? 'bg-[#235BF7] text-white border-[#235BF7]'
                : 'bg-white text-[#3F4654] border-[#E3E7EE]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <input
        value={what}
        onChange={(e) => setWhat(e.target.value)}
        maxLength={60}
        placeholder="Décrivez en quelques mots (ex : robes wax et sacs en cuir)"
        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E7EE] bg-white text-[15px] text-[#201D1D] focus:outline-none focus:border-[#235BF7]"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => generate()}
          className="h-10 px-4 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold cursor-pointer"
        >
          Générer des slogans
        </button>
        {ideas.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const next = seed + 1;
              setSeed(next);
              generate(next);
            }}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-[#E3E7EE] text-[14px] font-semibold text-[#201D1D] cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Autres idées
          </button>
        )}
      </div>
      {ideas.length > 0 && (
        <ul className="grid grid-cols-1 gap-2">
          {ideas.map((idea) => (
            <li key={idea}>
              <button
                type="button"
                onClick={() => {
                  onPick(idea);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-xl bg-white border border-[#E3E7EE] hover:border-[#235BF7] text-[15px] text-[#201D1D] cursor-pointer"
              >
                {idea}
                <span className="block text-[12px] font-semibold text-[#235BF7] mt-0.5">
                  Utiliser ce slogan
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
