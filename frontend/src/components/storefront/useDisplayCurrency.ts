'use client';

import { useEffect, useState } from 'react';
import { applyDisplayCurrency, isDisplayCurrency } from '@/lib/money';

/** Prices render in FCFA on the server; switch to the shop's display currency in the browser. */
export function useDisplayCurrency(currency: string): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isDisplayCurrency(currency) || currency === 'XOF') return;
    void applyDisplayCurrency(currency).then(() => setTick((t) => t + 1));
  }, [currency]);
}
