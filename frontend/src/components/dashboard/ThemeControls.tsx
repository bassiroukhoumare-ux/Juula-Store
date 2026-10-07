'use client';

// Light / dark / automatic switch of the merchant space.
import React, { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePref } from '@/lib/theme';

const OPTIONS: { id: ThemePref; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'Clair', hint: 'Fond blanc lumineux', icon: <Sun className="w-4 h-4" /> },
  { id: 'dark', label: 'Sombre', hint: 'Reposant le soir', icon: <Moon className="w-4 h-4" /> },
  {
    id: 'system',
    label: 'Automatique',
    hint: 'Suit le réglage de l’appareil',
    icon: <Monitor className="w-4 h-4" />,
  },
];

/** Header button (sun / moon) with a 3-choice menu. */
export const ThemeToggle: React.FC<{
  pref: ThemePref;
  dark: boolean;
  onChange: (p: ThemePref) => void;
}> = ({ pref, dark, onChange }) => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Thème : ${OPTIONS.find((o) => o.id === pref)?.label ?? ''}`}
        className="w-11 h-11 rounded-2xl border bg-white border-[#E3E7EE] text-[#3F4654] hover:text-[#201D1D] hover:bg-[#F6F7F9] flex items-center justify-center transition-colors cursor-pointer"
      >
        {dark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-50 w-60 p-1.5 rounded-2xl bg-white border border-[#E3E7EE] shadow-[0_18px_40px_-18px_rgba(15,23,42,0.45)]"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitemradio"
              aria-checked={pref === o.id}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer transition-colors ${
                pref === o.id ? 'bg-[#EEF3FF]' : 'hover:bg-[#F6F7F9]'
              }`}
            >
              <span className="w-8 h-8 rounded-xl bg-[#F6F7F9] text-[#235BF7] flex items-center justify-center shrink-0">
                {o.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-[#201D1D]">{o.label}</span>
                <span className="block text-[12px] text-[#7A808C]">{o.hint}</span>
              </span>
              {pref === o.id && <Check className="w-4 h-4 text-[#235BF7] shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** Settings card: three large choices with a mini preview. */
export const ThemeChooser: React.FC<{ pref: ThemePref; onChange: (p: ThemePref) => void }> = ({
  pref,
  onChange,
}) => (
  <section className="p-5 sm:p-6 rounded-[24px] bg-white border border-[#ECEFF4] space-y-4">
    <div>
      <h3 className="text-[17px] font-extrabold text-[#201D1D]">Apparence</h3>
      <p className="text-[14px] text-[#7A808C]">
        Choisissez le thème de votre espace. Votre choix est enregistré sur votre compte.
      </p>
    </div>
    <div role="radiogroup" aria-label="Thème" className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map((o) => {
        const on = pref === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`p-3 rounded-2xl border-2 text-left transition-colors cursor-pointer ${
              on ? 'border-[#235BF7] bg-[#EEF3FF]' : 'border-[#E3E7EE] hover:bg-[#F6F7F9]'
            }`}
          >
            {/* Mini preview — fixed colours, never themed */}
            <span
              aria-hidden="true"
              className="juula-light block h-20 rounded-xl overflow-hidden border border-black/5"
              style={{
                background:
                  o.id === 'light'
                    ? '#EDEFF3'
                    : o.id === 'dark'
                      ? '#0B0F17'
                      : 'linear-gradient(90deg, #EDEFF3 50%, #0B0F17 50%)',
              }}
            >
              <span className="flex h-full gap-1.5 p-2">
                <span
                  className="w-6 rounded-md"
                  style={{ background: o.id === 'dark' ? '#161F30' : '#FFFFFF' }}
                />
                <span className="flex-1 flex flex-col gap-1.5">
                  <span
                    className="h-3 rounded"
                    style={{ background: o.id === 'dark' ? '#1E293B' : '#FFFFFF' }}
                  />
                  <span
                    className="flex-1 rounded-md"
                    style={{ background: o.id === 'light' ? '#FFFFFF' : '#161F30' }}
                  />
                </span>
              </span>
            </span>
            <span className="mt-2.5 flex items-center gap-2 text-[14px] font-bold text-[#201D1D]">
              <span className="text-[#235BF7]">{o.icon}</span> {o.label}
              {on && <Check className="ml-auto w-4 h-4 text-[#235BF7]" />}
            </span>
            <span className="block text-[12px] text-[#7A808C]">{o.hint}</span>
          </button>
        );
      })}
    </div>
  </section>
);
