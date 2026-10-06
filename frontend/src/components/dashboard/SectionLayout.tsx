'use client';

import React from 'react';
import { Dropdown } from '@/components/ui/Dropdown';

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
 * Settings-style page: the section menu sits on the LEFT from 768px, and
 * becomes one « Section » dropdown at the top on phones.
 */
export function SectionLayout<T extends string>({
  sections,
  active,
  onChange,
  children,
}: SectionLayoutProps<T>) {
  const go = (id: T) => {
    onChange(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const index = sections.findIndex((s) => s.id === active);

  return (
    <div className="md:grid md:grid-cols-[230px_minmax(0,1fr)] md:gap-6 md:items-start">
      {/* Phones: one dropdown */}
      <div className="md:hidden mb-4">
        <Dropdown
          size="large"
          label="Choisir une section"
          caption={`Section ${index + 1} sur ${sections.length}`}
          value={active}
          onChange={go}
          options={sections.map((s) => ({
            value: s.id,
            label: s.label,
            icon: s.icon,
            ...(s.hint ? { hint: s.hint } : {}),
          }))}
        />
      </div>

      {/* From 768px: menu on the left */}
      <nav
        aria-label="Sections"
        className="hidden md:flex sticky top-28 flex-col gap-1 p-2 rounded-[22px] bg-white border border-[#ECEFF4]"
      >
        {sections.map((s) => {
          const on = s.id === active;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => go(s.id)}
              aria-current={on ? 'page' : undefined}
              className={`flex items-center gap-2.5 h-11 px-3.5 rounded-xl text-left transition-colors cursor-pointer ${
                on ? 'bg-[#EEF3FF] text-[#235BF7]' : 'text-[#3F4654] hover:bg-[#F6F7F9]'
              }`}
            >
              <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{s.icon}</span>
              <span className="text-[14px] font-semibold whitespace-nowrap truncate">
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
