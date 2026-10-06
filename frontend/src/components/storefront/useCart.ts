'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export interface CartLine {
  /** slug + colour: the same product in two colours is two lines. */
  key: string;
  slug: string;
  color: string | null;
  title: string;
  image: string | null;
  price: number;
  quantity: number;
}

const MAX_QTY = 100;

/** Shop cart kept in localStorage (one cart per shop). */
export function useCart(shop: string) {
  const key = `juula-cart:${shop}`;
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        // Carts saved before colours existed have no `key`.
        const saved = JSON.parse(raw) as Partial<CartLine>[];
        setLines(
          saved
            .filter((l) => l.slug && l.quantity)
            .map((l) => ({
              key: l.key ?? `${l.slug}::${l.color ?? ''}`,
              slug: l.slug!,
              color: l.color ?? null,
              title: l.title ?? '',
              image: l.image ?? null,
              price: l.price ?? 0,
              quantity: l.quantity!,
            })),
        );
      }
    } catch {
      // ignore (private mode, corrupted value)
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(lines));
    } catch {
      // ignore
    }
  }, [key, lines, loaded]);

  const add = useCallback((line: Omit<CartLine, 'quantity' | 'key'>, quantity = 1) => {
    const key = `${line.slug}::${line.color ?? ''}`;
    setLines((cur) => {
      const existing = cur.find((l) => l.key === key);
      if (existing) {
        return cur.map((l) =>
          l.key === key ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l,
        );
      }
      return [...cur, { ...line, key, quantity }];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((cur) =>
      quantity <= 0
        ? cur.filter((l) => l.key !== key)
        : cur.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((cur) => cur.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  /** Drop lines whose product is no longer in the shop and refresh prices. */
  const sync = useCallback((available: { slug: string; price: number; title: string }[]) => {
    setLines((cur) =>
      cur
        .filter((l) => available.some((a) => a.slug === l.slug))
        .map((l) => {
          const a = available.find((x) => x.slug === l.slug)!;
          return { ...l, price: a.price, title: a.title };
        }),
    );
  }, []);

  const count = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines]);
  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.price * l.quantity, 0), [lines]);

  return { lines, count, subtotal, add, setQuantity, remove, clear, sync, loaded };
}
