'use client';

import React, { useEffect, useState } from 'react';
import {
  FacebookIcon,
  MastercardIcon,
  OrangeMoneyTile,
  TikTokIcon,
  VisaWordmark,
  WaveTile,
  WhatsAppIcon,
} from './BrandIcons';

const ITEMS: { name: string; desc: string; icon: React.ReactNode }[] = [
  { name: 'Wave', desc: 'Paiement mobile en un clic', icon: <WaveTile size="lg" /> },
  { name: 'Orange Money', desc: 'Paiement mobile sécurisé', icon: <OrangeMoneyTile size="lg" /> },
  {
    name: 'Carte bancaire',
    desc: 'Visa & Mastercard acceptées',
    icon: (
      <span className="flex flex-col items-center gap-1">
        <VisaWordmark className="text-2xl" />
        <MastercardIcon className="w-10 h-6" />
      </span>
    ),
  },
  {
    name: 'Pixel Facebook',
    desc: 'Mesurez vos publicités Meta',
    icon: <FacebookIcon className="w-14 h-14" />,
  },
  {
    name: 'Pixel TikTok',
    desc: 'Optimisez vos campagnes TikTok',
    icon: <TikTokIcon className="w-12 h-12" />,
  },
  {
    name: 'WhatsApp',
    desc: 'Confirmez vos commandes en direct',
    icon: <WhatsAppIcon className="w-14 h-14" />,
  },
];

/** Fan of tilted cards; the centre one is highlighted and auto-rotates. */
export const IntegrationsFan: React.FC = () => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setActive((i) => (i + 1) % ITEMS.length), 2600);
    return () => clearInterval(t);
  }, [paused]);

  const n = ITEMS.length;
  const current = ITEMS[active]!;

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative h-44 sm:h-52 mx-auto max-w-3xl" aria-hidden="true">
        {ITEMS.map((item, i) => {
          let offset = i - active;
          if (offset > n / 2) offset -= n;
          if (offset < -n / 2) offset += n;
          const abs = Math.abs(offset);
          const hidden = abs > 2;
          return (
            <button
              key={item.name}
              type="button"
              tabIndex={-1}
              onClick={() => setActive(i)}
              className="absolute left-1/2 top-1/2 w-28 h-28 sm:w-36 sm:h-36 rounded-[28px] bg-[#F4F6FB] border border-[#E9ECF2] flex items-center justify-center transition-all duration-700 ease-out cursor-pointer"
              style={{
                transform: `translate(-50%, -50%) translateX(${offset * 112}%) translateY(${abs * 14}px) rotate(${offset * 14}deg) scale(${1 - abs * 0.08})`,
                opacity: hidden ? 0 : 1 - abs * 0.32,
                zIndex: 10 - abs,
                boxShadow: abs === 0 ? '0 24px 48px -24px rgba(32,29,29,0.35)' : 'none',
                background: abs === 0 ? '#FFFFFF' : undefined,
                pointerEvents: hidden ? 'none' : 'auto',
              }}
            >
              {item.icon}
            </button>
          );
        })}
      </div>
      <div className="text-center mt-4 min-h-[52px]" aria-live="polite">
        <p className="text-lg font-bold text-[#201D1D]">{current.name}</p>
        <p className="text-sm text-[#7A808C]">{current.desc}</p>
      </div>
      <div className="mt-4 flex justify-center gap-1.5">
        {ITEMS.map((item, i) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setActive(i)}
            aria-label={item.name}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${i === active ? 'w-6 bg-[#235BF7]' : 'w-1.5 bg-[#D5DAE3]'}`}
          />
        ))}
      </div>
    </div>
  );
};
