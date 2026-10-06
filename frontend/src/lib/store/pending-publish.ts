// « Payer et publier » (Pro): the publication waits for the payment. The
// intent survives the redirect to the hosted checkout in localStorage.
export type PendingPublish = { kind: 'product'; id: string } | { kind: 'storefront' };

const KEY = 'juula-pending-publish';

export function savePendingPublish(intent: PendingPublish): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...intent, at: Date.now() }));
  } catch {
    // private mode: the merchant publishes by hand after paying
  }
}

/** Reads and clears the saved intent (ignored after 1 hour). */
export function takePendingPublish(): PendingPublish | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { kind?: string; id?: string; at?: number };
    if (!v.at || Date.now() - v.at > 3_600_000) return null;
    if (v.kind === 'storefront') return { kind: 'storefront' };
    if (v.kind === 'product' && typeof v.id === 'string') return { kind: 'product', id: v.id };
    return null;
  } catch {
    return null;
  }
}
