'use client';

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

export const PRESET_CATEGORIES = [
  'Mode',
  'Chaussures',
  'Sacs',
  'Accessoires',
  'Bijoux',
  'Beauté',
  'Parfums',
  'Électronique',
  'Maison',
  'Enfants',
  'Alimentation',
];

interface CategoryFieldProps {
  value: string;
  /** Categories already used by the shop (shown with the presets). */
  existing: string[];
  onChange: (category: string) => void;
  label: string;
}

/** Category picker: presets + the shop's own + « Autre… » (free text). */
export const CategoryField: React.FC<CategoryFieldProps> = ({
  value,
  existing,
  onChange,
  label,
}) => {
  const options = [...new Set([...PRESET_CATEGORIES, ...existing].filter(Boolean))];
  const [custom, setCustom] = useState<string | null>(null);

  if (custom !== null) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = custom.trim().slice(0, 40);
          if (v) onChange(v);
          setCustom(null);
        }}
        className="flex items-center gap-1.5"
      >
        <input
          autoFocus
          value={custom}
          maxLength={40}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Nouvelle catégorie"
          aria-label={`${label} : nouvelle catégorie`}
          className="w-40 h-10 px-3 rounded-xl border border-[#235BF7] bg-white text-[14px] text-[#201D1D] focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Valider la catégorie"
          className="w-10 h-10 rounded-xl bg-[#235BF7] text-white flex items-center justify-center cursor-pointer"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setCustom(null)}
          aria-label="Annuler"
          className="w-10 h-10 rounded-xl border border-[#E3E7EE] text-[#7A808C] flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </form>
    );
  }

  return (
    <select
      value={value}
      aria-label={label}
      onChange={(e) => {
        if (e.target.value === '__other__') setCustom('');
        else onChange(e.target.value);
      }}
      className="w-40 h-10 px-3 rounded-xl border border-[#E3E7EE] bg-[#F6F7F9] text-[14px] text-[#201D1D] focus:outline-none focus:border-[#235BF7] cursor-pointer"
    >
      <option value="">Sans catégorie</option>
      {options.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      {value && !options.includes(value) && <option value={value}>{value}</option>}
      <option value="__other__">Autre…</option>
    </select>
  );
};
