'use client';

import React from 'react';

export interface SectionItem<T extends string> {
  id: T;
  label: string;
  icon: React.ReactNode;
  hint?: string;
}

interface SectionLayoutProps<T extends string> {
  sections: SectionItem<T>[];
  active: T;
  onChange: (id: T) => void;
  children: React.ReactNode;
}

/**
 * Settings-style page with the section menu always on the LEFT:
 * a labelled column from 768px, a narrow icon rail on phones.
 */
export function SectionLayout<T extends string>({
  sections,
  active,
  onChange,
  children,
}: SectionLayoutProps<T>) {
  return (
    <div className="grid grid-cols-[68px_minmax(0,1fr)] md:grid-cols-[230px_minmax(0,1fr)] gap-3 md:gap-6 items-start">
      <nav
        aria-label="Sections"
        className="sticky top-24 md:top-28 flex flex-col gap-1 p-1.5 md:p-2 rounded-[20px] md:rounded-[22px] bg-white border border-[#ECEFF4]"
      >
        {sections.map((s) => {
          const on = s.id === active;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange(s.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-current={on ? 'page' : undefined}
              title={s.label}
              className={`flex flex-col md:flex-row items-center gap-1 md:gap-2.5 py-2 md:py-0 md:h-11 px-1 md:px-3.5 rounded-xl text-center md:text-left transition-colors cursor-pointer ${
                on ? 'bg-[#EEF3FF] text-[#235BF7]' : 'text-[#3F4654] hover:bg-[#F6F7F9]'
              }`}
            >
              <span className="shrink-0 [&>svg]:w-5 [&>svg]:h-5 md:[&>svg]:w-4 md:[&>svg]:h-4">
                {s.icon}
              </span>
              <span className="text-[10.5px] leading-tight font-semibold md:text-[14px] md:whitespace-nowrap line-clamp-2">
                {s.label}
              </span>
            </button>
          );
        })}
      </nav>
      <div className="min-w-0 space-y-5">{children}</div>
    </div>
  );
}
