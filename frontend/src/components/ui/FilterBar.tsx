'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Search, SlidersHorizontal, X } from 'lucide-react';

export interface FilterGroup {
  id: string;
  label: string;
  value: string;
  /** Value meaning « no filter » for this group (e.g. 'all'). */
  defaultValue: string;
  options: { value: string; label: string; count?: number }[];
  onChange: (value: string) => void;
}

interface FilterBarProps {
  search?: { value: string; onChange: (v: string) => void; placeholder: string };
  groups: FilterGroup[];
  /** Extra element on the right (e.g. « Nouveau produit »). */
  action?: React.ReactNode;
}

/**
 * Minimal toolbar: a search icon that slides open into a field, and one
 * « Filtrer » button opening a panel with every filter group.
 */
export const FilterBar: React.FC<FilterBarProps> = ({ search, groups, action }) => {
  const [searchOpen, setSearchOpen] = useState(Boolean(search?.value));
  const [panelOpen, setPanelOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = groups.filter((g) => g.value !== g.defaultValue);

  useEffect(() => {
    if (search?.value) setSearchOpen(true);
  }, [search?.value]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanelOpen(false);
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPanelOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [panelOpen]);

  const closeSearch = () => {
    search?.onChange('');
    setSearchOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-2">
        {search && (
          <div
            className={`relative h-11 transition-[width,flex-grow] duration-300 ease-out ${
              searchOpen ? 'flex-1 sm:flex-none sm:w-80' : 'w-11'
            }`}
          >
            {searchOpen ? (
              <>
                <Search className="w-4 h-4 text-[#9AA0AB] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="search"
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
                  placeholder={search.placeholder}
                  aria-label={search.placeholder}
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-white border border-[#235BF7] ring-4 ring-[#235BF7]/10 text-[15px] text-[#201D1D] placeholder:text-[#9AA0AB] focus:outline-none motion-safe:animate-[rise_200ms_ease]"
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Fermer la recherche"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[#7A808C] hover:bg-[#F1F3F6] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label={search.placeholder}
                title="Rechercher"
                className="w-11 h-11 rounded-xl bg-white border border-[#E3E7EE] flex items-center justify-center text-[#3F4654] hover:bg-[#F6F7F9] cursor-pointer"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
          className={`shrink-0 inline-flex items-center gap-2 h-11 px-4 rounded-xl border text-[14px] font-semibold transition-colors cursor-pointer ${
            panelOpen || active.length > 0
              ? 'bg-[#EEF3FF] border-[#BFD0FD] text-[#235BF7]'
              : 'bg-white border-[#E3E7EE] text-[#201D1D] hover:bg-[#F6F7F9]'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtrer
          {active.length > 0 && (
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#235BF7] text-white text-[12px] font-bold flex items-center justify-center">
              {active.length}
            </span>
          )}
        </button>

        {action && <div className="ml-auto shrink-0">{action}</div>}
      </div>

      {/* Active filters, one tap to remove */}
      {active.length > 0 && !panelOpen && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {active.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => g.onChange(g.defaultValue)}
              className="inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full bg-white border border-[#E3E7EE] text-[13px] font-semibold text-[#3F4654] hover:bg-[#F6F7F9] cursor-pointer"
            >
              {g.options.find((o) => o.value === g.value)?.label}
              <X className="w-3.5 h-3.5 text-[#9AA0AB]" />
            </button>
          ))}
        </div>
      )}

      {panelOpen && (
        <div className="absolute left-0 right-0 sm:right-auto sm:w-[26rem] top-full mt-2 z-40 p-4 bg-white rounded-2xl border border-[#ECEFF4] shadow-[0_24px_48px_-20px_rgba(32,29,29,0.35)] space-y-4 motion-safe:animate-[rise_200ms_ease]">
          {groups.map((g) => (
            <fieldset key={g.id}>
              <legend className="text-[12px] font-bold uppercase tracking-wide text-[#7A808C] mb-2">
                {g.label}
              </legend>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const on = g.value === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => g.onChange(o.value)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border text-[14px] font-semibold transition-colors cursor-pointer ${
                        on
                          ? 'bg-[#235BF7] border-[#235BF7] text-white'
                          : 'bg-[#F6F7F9] border-transparent text-[#3F4654] hover:bg-[#EEF1F5]'
                      }`}
                    >
                      {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                      {o.label}
                      {o.count !== undefined && (
                        <span className={`text-[12px] ${on ? 'text-white/80' : 'text-[#9AA0AB]'}`}>
                          {o.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#F1F3F6]">
            <button
              type="button"
              disabled={active.length === 0}
              onClick={() => groups.forEach((g) => g.onChange(g.defaultValue))}
              className="h-10 px-3 rounded-xl text-[14px] font-semibold text-[#7A808C] hover:bg-[#F6F7F9] disabled:opacity-40 cursor-pointer disabled:cursor-default"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="h-10 px-5 rounded-xl bg-[#201D1D] text-white text-[14px] font-semibold cursor-pointer"
            >
              Voir les résultats
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
