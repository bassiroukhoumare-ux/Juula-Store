'use client';

import React, { useEffect, useRef, useState } from 'react';

// Illustrative series (a growing week), rotated to feel "live".
const SERIES = [
  [32, 48, 41, 63, 55, 78, 61, 90],
  [40, 52, 47, 58, 69, 74, 83, 96],
  [35, 57, 50, 66, 60, 81, 72, 92],
];
const ORDERS = [12, 17, 14];

/** Bars grow when scrolled into view, then gently update every few seconds. */
export const SalesChart: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    const t = reduce ? null : setInterval(() => setStep((s) => (s + 1) % SERIES.length), 2800);
    return () => {
      io.disconnect();
      if (t) clearInterval(t);
    };
  }, []);

  const bars = SERIES[step]!;
  const last = bars.length - 1;

  return (
    <div ref={ref} className="h-full flex items-end gap-3 sm:gap-4" aria-hidden="true">
      {bars.map((h, i) => (
        <div key={i} className="relative flex-1 h-full flex flex-col items-center justify-end">
          {i === last && (
            <span
              key={step}
              className="absolute -top-1 mb-2 text-[11px] font-bold text-white bg-[#201D1D] px-2 py-1 rounded-lg whitespace-nowrap motion-safe:animate-[pop_500ms_cubic-bezier(.2,.9,.3,1.4)]"
              style={{ opacity: visible ? 1 : 0, transition: 'opacity 600ms ease 900ms' }}
            >
              +{ORDERS[step]} commandes
            </span>
          )}
          <div
            className={`w-full max-w-[44px] rounded-t-xl ${
              i === last ? 'bg-gradient-to-t from-[#235BF7] to-[#7FA2FF] shadow-[0_10px_24px_-10px_rgba(35,91,247,0.8)]' : 'bg-[#E3E8F1]'
            }`}
            style={{
              height: visible ? `${h * 0.82}%` : '4%',
              transition: `height 900ms cubic-bezier(.2,.8,.2,1) ${visible && step === 0 ? i * 80 : 0}ms`,
            }}
          />
        </div>
      ))}
    </div>
  );
};
