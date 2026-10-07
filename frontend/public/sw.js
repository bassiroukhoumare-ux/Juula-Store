/* Juula — Service Worker (Web Push).
 *
 * Deliberately no offline cache: the dashboard always talks to the live API,
 * so a stale cached shell could never show outdated orders or balances.
 * Its jobs: make the app installable (PWA) and display push notifications.
 */
/* global self */

self.addEventListener('install', () => {
  // Activate the new version right away.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A push arrives: { title, body, url, icon, badge, tag } (JSON, see lib/server/push.ts).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Juula';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/dashboard' },
    lang: 'fr',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tap on the notification: focus an open Juula tab (and navigate it) or open one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || '/dashboard',
    self.location.origin,
  );
  if (target.origin !== self.location.origin) return; // same-origin links only

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === target.origin) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(target.href);
            } catch {
              // Navigation can fail on an uncontrolled client: open a new one.
              await self.clients.openWindow(target.href);
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});
