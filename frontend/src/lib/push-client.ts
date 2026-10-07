'use client';

// Web Push on the merchant side: service worker registration, permission,
// subscription (VAPID) and sync with /api/push/subscribe.
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type PushState =
  | 'loading'
  | 'unsupported' // browser without Push API
  | 'ios-install' // iPhone / iPad: must first « Ajouter à l'écran d'accueil »
  | 'not-configured' // no VAPID public key on this deployment
  | 'denied' // the user blocked notifications in the browser settings
  | 'off' // supported, not subscribed
  | 'on'; // subscribed on this device

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/** VAPID public key (base64url) → Uint8Array expected by pushManager.subscribe. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** Launched from the home screen (installed PWA). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function deviceKind(): 'android' | 'ios' | 'desktop' {
  if (isIOS()) return 'ios';
  if (/Android/i.test(navigator.userAgent)) return 'android';
  return 'desktop';
}

function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Registers /sw.js once (idempotent). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  await api('/api/push/subscribe', {
    method: 'POST',
    body: {
      subscription: { endpoint: json.endpoint, keys: json.keys },
      device: deviceKind(),
    },
  });
}

/** State + actions of push notifications on this device. */
export function usePushNotifications(): {
  state: PushState;
  busy: boolean;
  error: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
} {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial state; an existing subscription is re-sent so the server always
  // has it (new account on this phone, subscription renewed by the browser…).
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!VAPID_PUBLIC_KEY) return alive && setState('not-configured');
      if (!pushSupported()) {
        return alive && setState(isIOS() && !isStandalone() ? 'ios-install' : 'unsupported');
      }
      if (Notification.permission === 'denied') return alive && setState('denied');
      const reg = await registerServiceWorker();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub && Notification.permission === 'granted') {
        await saveSubscription(sub).catch(() => undefined);
        if (alive) setState('on');
      } else if (alive) {
        setState('off');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
      await saveSubscription(sub);
      setState('on');
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? `Activation impossible : ${e.message}`
          : 'Activation impossible. Réessayez.',
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await api('/api/push/subscribe', {
          method: 'DELETE',
          body: { endpoint: sub.endpoint },
        }).catch(() => undefined);
        await sub.unsubscribe();
      }
      setState('off');
    } catch {
      setError('Désactivation impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, error, enable, disable };
}
