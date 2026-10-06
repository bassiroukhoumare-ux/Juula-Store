'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  hint?: string;
}

interface DropdownProps<T extends string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name (also shown above the value when `caption` is set). */
  label: string;
  /** Small text above the selected value, e.g. « Section ». */
  caption?: string;
  /** Visual size: `field` matches form inputs, `large` is a full-width switcher. */
  size?: 'field' | 'large';
  className?: string;
}

/** Platform-styled replacement for <select>: same look on every phone and browser. */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  caption,
  size = 'field',
  className = '',
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    // Focus the selected option so arrows / Enter work right away.
    listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const moveFocus = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
    next?.focus();
  };

  const large = size === 'large';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={caption ? undefined : label}
        className={`w-full flex items-center gap-3 text-left cursor-pointer transition-colors ${
          large
            ? 'min-h-14 px-3 py-2 rounded-2xl bg-white border border-[#ECEFF4] hover:border-[#D5DAE2]'
            : 'h-11 px-3.5 rounded-xl bg-[#F6F7F9] border border-[#E3E7EE] hover:bg-white'
        } ${open ? 'border-[#235BF7] bg-white ring-4 ring-[#235BF7]/10' : ''}`}
      >
        {current?.icon && (
          <span
            className={`shrink-0 flex items-center justify-center text-[#235BF7] ${
              large
                ? 'w-10 h-10 rounded-xl bg-[#EEF3FF] [&>svg]:w-5 [&>svg]:h-5'
                : '[&>svg]:w-4 [&>svg]:h-4'
            }`}
          >
            {current.icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          {caption && (
            <span className="block text-[12px] font-semibold text-[#7A808C]">{caption}</span>
          )}
          <span
            className={`block truncate text-[#201D1D] ${large ? 'text-[16px] font-bold' : 'text-[14px]'}`}
          >
            {current?.label}
          </span>
        </span>
        <ChevronDown
          className={`w-5 h-5 shrink-0 text-[#9AA0AB] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          onKeyDown={moveFocus}
          className="absolute left-0 right-0 top-full mt-2 z-50 max-h-80 overflow-y-auto overscroll-contain p-1.5 bg-white rounded-2xl border border-[#ECEFF4] shadow-[0_24px_48px_-20px_rgba(32,29,29,0.35)]"
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 min-h-11 px-3 py-2 rounded-xl text-left text-[14px] font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#235BF7]/40 ${
                    selected ? 'bg-[#EEF3FF] text-[#235BF7]' : 'text-[#3F4654] hover:bg-[#F6F7F9]'
                  }`}
                >
                  {o.icon && (
                    <span className="shrink-0 [&>svg]:w-[18px] [&>svg]:h-[18px]">{o.icon}</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block">{o.label}</span>
                    {o.hint && (
                      <span className="block text-[12px] font-medium text-[#7A808C]">{o.hint}</span>
                    )}
                  </span>
                  {selected && <Check className="w-4 h-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
