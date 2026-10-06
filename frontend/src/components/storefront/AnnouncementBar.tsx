'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import {
  countdownEnd,
  isAnnouncementVisible,
  type AnnouncementBar as Bar,
} from '@/lib/store/marketing';

interface AnnouncementBarProps {
  bar: Bar | undefined;
  accent: string;
  /** Shop URL prefix ('' on the subdomain); guessed from the URL when omitted. */
  base?: string | undefined;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Where the bar's link goes: a category of the shop or a product page. */
export function announcementHref(link: string, base: string): string | null {
  if (link.startsWith('product:')) return `${base}/${encodeURIComponent(link.slice(8))}`;
  if (link.startsWith('cat:'))
    return `${base || ''}/?categorie=${encodeURIComponent(link.slice(4))}`;
  return null;
}

/** Thin bar on top of the shop: message, optional live countdown, close. */
export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  bar,
  accent,
  base: baseProp,
}) => {
  const [now, setNow] = useState<Date | null>(null);
  const [guessedBase, setGuessedBase] = useState('');
  const base = baseProp ?? guessedBase;
  const [closed, setClosed] = useState(false);
  const storageKey = bar ? `juula-bar:${bar.text}` : '';

  useEffect(() => {
    setNow(new Date());
    // www preview pages live under /boutique/<shop>/…
    const m = /^\/boutique\/[^/]+/.exec(window.location.pathname);
    setGuessedBase(m ? m[0] : '');
    try {
      if (storageKey && sessionStorage.getItem(storageKey) === '1') setClosed(true);
    } catch {
      // private mode
    }
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [storageKey]);

  if (!bar || closed || !now || !isAnnouncementVisible(bar, now)) return null;

  const end = countdownEnd(bar, now);
  let countdown: string | null = null;
  if (end) {
    const s = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    countdown = `${d > 0 ? `${d}j ` : ''}${pad(h)}h ${pad(Math.floor((s % 3600) / 60))}m ${pad(s % 60)}s`;
  }
  const background = bar.style === 'red' ? '#DC2626' : bar.style === 'accent' ? accent : '#201D1D';
  const href = announcementHref(bar.link, base);

  const content = (
    <>
      <span className="min-w-0 truncate sm:whitespace-normal">{bar.text}</span>
      {countdown && (
        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 font-bold tabular-nums">
          {countdown}
        </span>
      )}
      {href && <ArrowRight className="hidden sm:block w-4 h-4 shrink-0" />}
    </>
  );

  return (
    <div
      role="region"
      aria-label="Annonce"
      className="relative z-50 text-white text-[13px] sm:text-[14px] font-semibold"
      style={{ background }}
    >
      <div className="max-w-7xl mx-auto pl-4 pr-11 sm:px-12 py-2.5 flex items-center justify-center gap-2 sm:gap-3 text-center">
        {href ? (
          <a
            href={href}
            className="min-w-0 flex items-center justify-center gap-2 sm:gap-3 hover:underline underline-offset-2"
          >
            {content}
          </a>
        ) : (
          content
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setClosed(true);
          try {
            sessionStorage.setItem(storageKey, '1');
          } catch {
            // ignore
          }
        }}
        aria-label="Masquer l’annonce"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
