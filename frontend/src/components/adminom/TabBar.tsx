'use client';

// Section tabs of /adminom. Phones / small tablets: one swipeable row with
// fading edges (the active tab is scrolled into view); from md: wrapped pills.
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  const nav = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = nav.current;
    if (!el) return;
    setFade({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // Keep the active tab visible on phones.
  useEffect(() => {
    const el = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [value]);

  return (
    <div className="relative -mx-4 sm:mx-0">
      <nav
        ref={nav}
        aria-label="Sections"
        onScroll={measure}
        className="flex flex-nowrap md:flex-wrap gap-1.5 md:gap-2 px-4 sm:px-0 py-1 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-px-4 overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => {
          const on = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-current={on ? 'page' : undefined}
              className={`snap-start shrink-0 inline-flex items-center gap-1.5 md:gap-2 h-10 md:h-11 px-3 md:px-4 rounded-full text-[13px] md:text-[14px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                on
                  ? 'bg-[#235BF7] text-white shadow-[0_8px_20px_-10px_rgba(35,91,247,0.8)]'
                  : 'bg-[var(--a-surface)] text-[var(--a-muted)] border border-[var(--a-border)] hover:text-[var(--a-text)]'
              }`}
            >
              <span className={`relative inline-flex ${t.badge ? 'mr-2' : ''}`}>
                {t.icon}
                {t.badge ? (
                  <span
                    aria-label={`${t.badge} à traiter`}
                    className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-[var(--a-surface)]"
                  >
                    {t.badge > 99 ? '99+' : t.badge}
                  </span>
                ) : null}
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>
      {/* Swipe hints (phones only) */}
      <span
        aria-hidden="true"
        className={`md:hidden pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--a-bg)] to-transparent transition-opacity ${
          fade.left ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <span
        aria-hidden="true"
        className={`md:hidden pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--a-bg)] to-transparent transition-opacity ${
          fade.right ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
