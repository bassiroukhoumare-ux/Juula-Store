'use client';

import React from 'react';
import { ArrowLeft, Check, Eye, Lock } from 'lucide-react';
import { AnnouncementBar } from './AnnouncementBar';
import type { AnnouncementBar as AnnouncementBarData } from '@/lib/store/marketing';

export type ShopStep = 1 | 2 | 3;

const STEPS: { n: ShopStep; label: string }[] = [
  { n: 1, label: 'Panier' },
  { n: 2, label: 'Informations' },
  { n: 3, label: 'Confirmation' },
];

interface ShopPageShellProps {
  storeName: string;
  logoUrl: string | null;
  accent: string;
  /** Shop home (relative URL). */
  homeHref: string;
  step: ShopStep;
  /** « Continuer mes achats » / « Retour au panier ». */
  back: { href: string; label: string };
  isPreview: boolean;
  announcement?: AnnouncementBarData | undefined;
  /** Shop URL prefix, for the announcement link. */
  base?: string | undefined;
  children: React.ReactNode;
}

/** Frame of the full-page cart and checkout: store header, progress, footer. */
export const ShopPageShell: React.FC<ShopPageShellProps> = ({
  storeName,
  logoUrl,
  accent,
  homeHref,
  step,
  back,
  isPreview,
  announcement,
  base = '',
  children,
}) => (
  <div
    className="min-h-screen flex flex-col bg-[#F1F3F2] text-[#201D1D]"
    style={{ ['--accent' as string]: accent }}
  >
    <AnnouncementBar bar={announcement} accent={accent} base={base} />
    {isPreview && (
      <div className="bg-[#201D1D] text-white text-[13px] font-semibold text-center py-2 px-4 flex items-center justify-center gap-2">
        <Eye className="w-4 h-4" /> Aperçu privé — votre boutique n’est pas encore publiée.
      </div>
    )}

    <header className="sticky top-0 z-40 bg-[#F1F3F2]/90 backdrop-blur-md border-b border-black/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <a
          href={back.href}
          className="justify-self-start inline-flex items-center gap-2 h-10 pl-2 pr-3 -ml-2 rounded-full text-[14px] font-semibold text-[#3F4654] hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{back.label}</span>
        </a>
        <a href={homeHref} className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="w-9 h-9 rounded-full object-cover border border-black/5 bg-white"
            />
          ) : (
            <span className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold">
              {storeName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="font-bold text-[17px] truncate max-w-[40vw]">{storeName}</span>
        </a>
        <span className="justify-self-end inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
          <Lock className="w-4 h-4" />
          <span className="hidden sm:inline">Commande sécurisée</span>
        </span>
      </div>
    </header>

    {/* Progress */}
    <nav
      aria-label="Étapes de la commande"
      className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8"
    >
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((s, i) => {
          const done = s.n < step;
          const on = s.n === step;
          return (
            <li
              key={s.n}
              className="flex items-center gap-2 sm:gap-3 flex-1 last:flex-none min-w-0"
            >
              <span
                className="flex items-center gap-2 min-w-0"
                aria-current={on ? 'step' : undefined}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0 ${
                    done || on
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-white text-[#9AA0AB] border border-black/10'
                  }`}
                >
                  {done ? <Check className="w-4 h-4" strokeWidth={3} /> : s.n}
                </span>
                <span
                  className={`text-[14px] font-semibold truncate ${on ? 'text-[#201D1D]' : 'text-[#7A808C]'} ${on ? '' : 'hidden sm:inline'}`}
                >
                  {s.label}
                </span>
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={`h-0.5 flex-1 rounded-full ${done ? 'bg-[var(--accent)]' : 'bg-black/10'}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>

    <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>

    <footer className="bg-[var(--accent)] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo ${storeName}`}
              className="w-10 h-10 rounded-full object-cover bg-white ring-2 ring-white/40 shrink-0"
            />
          ) : (
            <span className="w-10 h-10 rounded-full bg-white/15 ring-2 ring-white/40 flex items-center justify-center font-bold shrink-0">
              {storeName.charAt(0).toUpperCase()}
            </span>
          )}
          <p className="text-[16px] font-bold">{storeName}</p>
        </div>
        <p className="text-[13px] text-white/70">
          Paiement sécurisé · Boutique propulsée par{' '}
          <a
            href="https://www.juula.store"
            className="font-semibold text-white/85 hover:text-white"
          >
            Juula
          </a>
        </p>
      </div>
    </footer>
  </div>
);

/** White card used by both pages. */
export const Card: React.FC<{
  title?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, className = '', children }) => (
  <section className={`rounded-[24px] bg-white border border-black/5 p-5 sm:p-6 ${className}`}>
    {title && <h2 className="text-[18px] sm:text-[20px] font-extrabold mb-4">{title}</h2>}
    {children}
  </section>
);
