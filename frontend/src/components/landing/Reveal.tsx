'use client';

import React, { useEffect, useRef, useState } from 'react';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in ms (use for staggering siblings). */
  delay?: number;
  /** Start offset: rise from below (default), or slide in from a side. */
  from?: 'up' | 'left' | 'right' | 'zoom';
}

const HIDDEN: Record<NonNullable<RevealProps['from']>, string> = {
  up: 'translate3d(0, 28px, 0)',
  left: 'translate3d(-36px, 0, 0)',
  right: 'translate3d(36px, 0, 0)',
  zoom: 'scale(0.94)',
};

/**
 * Fades/slides its children in the first time they enter the viewport.
 * Respects prefers-reduced-motion (shown immediately, no movement).
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  className = '',
  delay = 0,
  from = 'up',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => setShown(true);
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      show();
      return;
    }
    // Already on screen (or scrolled past) at mount: reveal right away.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95) {
      const t = setTimeout(show, 30);
      return () => clearTimeout(t);
    }
    let observerAlive = false;
    const io = new IntersectionObserver(
      (entries) => {
        observerAlive = true; // fires once right after observe(), even off-screen
        if (entries.some((e) => e.isIntersecting)) {
          show();
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 },
    );
    io.observe(el);
    // Safety net: if the observer never reports (odd browsers / webviews),
    // never leave content hidden.
    const safety = setTimeout(() => {
      if (!observerAlive) show();
    }, 2500);
    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : HIDDEN[from],
        filter: shown ? 'none' : 'blur(6px)',
        transition: `opacity 900ms cubic-bezier(.2,.75,.2,1) ${delay}ms, transform 900ms cubic-bezier(.2,.75,.2,1) ${delay}ms, filter 900ms ease ${delay}ms`,
        willChange: shown ? undefined : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
};
