'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { StoreAnalytics } from '@/lib/store/analytics-types';

export type { StoreAnalytics };

/** Product-page analytics of the signed-in merchant for [from, to). */
export function useStoreAnalytics(range: {
  from: Date;
  to: Date;
  productId?: string | undefined;
}): { data: StoreAnalytics | null; loading: boolean; error: boolean } {
  const [data, setData] = useState<StoreAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const from = range.from.toISOString();
  const to = range.to.toISOString();
  const productId = range.productId;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const q = new URLSearchParams({ from, to });
    if (productId) q.set('productId', productId);
    api<{ analytics: StoreAnalytics }>(`/api/store/analytics?${q.toString()}`)
      .then(({ analytics }) => {
        if (!cancelled) setData(analytics);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, productId]);

  return { data, loading, error };
}
