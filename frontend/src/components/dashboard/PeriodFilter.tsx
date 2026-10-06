'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { PERIODS, toDayInput, type CustomDates, type PeriodId } from '@/lib/store/period';

interface PeriodFilterProps {
  periodId: PeriodId;
  custom: CustomDates | null;
  /** « 7 sept. – 6 oct. 2026 » */
  rangeLabel: string;
  onSelect: (id: PeriodId, custom?: CustomDates) => void;
  /** Stretch the button to the full width (phones). */
  block?: boolean;
}

/** « Filtrer par période »: one button, a short list, and two dates for a custom range. */
export const PeriodFilter: React.FC<PeriodFilterProps> = ({
  periodId,
  custom,
  rangeLabel,
  onSelect,
  block = false,
}) => {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const today = toDayInput(new Date());
  const [from, setFrom] = useState(custom?.from ?? today);
  const [to, setTo] = useState(custom?.to ?? today);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const current =
    periodId === 'custom' ? 'Dates choisies' : PERIODS.find((p) => p.id === periodId)?.label;

  const apply = () => {
    if (!from || !to) return;
    onSelect('custom', from <= to ? { from, to } : { from: to, to: from });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${block ? 'w-full' : ''}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setPicking(periodId === 'custom');
        }}
        aria-expanded={open}
        className={`flex items-center gap-2 h-11 px-3.5 rounded-xl bg-white border border-[#E3E7EE] text-[14px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] transition-colors cursor-pointer ${
          block ? 'w-full' : ''
        }`}
      >
        <SlidersHorizontal className="w-4 h-4 shrink-0 text-[#235BF7]" />
        <span className="min-w-0 flex-1 text-left truncate">
          <span className="sm:hidden">Filtrer par période</span>
          <span className="hidden sm:inline text-[#7A808C] font-medium">{rangeLabel}</span>
          <span className="hidden sm:inline text-[#D5DAE3]"> · </span>
          <span className="hidden sm:inline">{current}</span>
        </span>
        <span className="sm:hidden shrink-0 text-[13px] font-medium text-[#7A808C]">
          {rangeLabel}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-[#9AA0AB] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 sm:left-auto sm:w-80 top-full mt-2 bg-white rounded-2xl p-2 border border-[#ECEFF4] shadow-[0_24px_48px_-24px_rgba(32,29,29,0.35)] z-50">
          <p className="px-3 pt-1 pb-2 text-[13px] font-semibold text-[#9AA0AB]">
            Filtrer par période
          </p>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p.id);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-colors cursor-pointer ${
                periodId === p.id
                  ? 'bg-[#EEF3FF] text-[#235BF7]'
                  : 'text-[#3F4654] hover:bg-[#F6F7F9]'
              }`}
            >
              {p.label}
              {periodId === p.id && <Check className="w-4 h-4" />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            aria-expanded={picking}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-colors cursor-pointer ${
              periodId === 'custom'
                ? 'bg-[#EEF3FF] text-[#235BF7]'
                : 'text-[#3F4654] hover:bg-[#F6F7F9]'
            }`}
          >
            <span className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Choisir des dates
            </span>
            {periodId === 'custom' && <Check className="w-4 h-4" />}
          </button>

          {picking && (
            <div className="mt-1 p-3 rounded-xl bg-[#F6F7F9] space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1 min-w-0">
                  <span className="text-[13px] font-semibold text-[#3F4654]">Du</span>
                  <input
                    type="date"
                    value={from}
                    max={today}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      if (e.target.value > to) setTo(e.target.value);
                    }}
                    className="w-full min-w-0 h-11 px-2.5 rounded-xl border border-[#E3E7EE] bg-white text-[14px] text-[#201D1D] focus:outline-none focus:border-[#235BF7]"
                  />
                </label>
                <label className="block space-y-1 min-w-0">
                  <span className="text-[13px] font-semibold text-[#3F4654]">Au</span>
                  <input
                    type="date"
                    value={to}
                    min={from}
                    max={today}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full min-w-0 h-11 px-2.5 rounded-xl border border-[#E3E7EE] bg-white text-[14px] text-[#201D1D] focus:outline-none focus:border-[#235BF7]"
                  />
                </label>
              </div>
              <p className="text-[12px] text-[#7A808C]">
                Même date des deux côtés pour voir une seule journée.
              </p>
              <button
                type="button"
                onClick={apply}
                className="w-full h-11 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold cursor-pointer"
              >
                Appliquer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
