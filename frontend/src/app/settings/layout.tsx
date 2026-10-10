// Dark theme of the merchant space: generated colour layer + pre-paint script.
import '../dash-dark.css';
import type { Metadata, Viewport } from 'next';

// Installable app (PWA): « Ajouter à l'écran d'accueil » on Android and iOS,
// required on iPhone (iOS 16.4+) to receive push notifications.
export const metadata: Metadata = {
  title: 'Espace marchand — Juula Store',
  robots: { index: false, follow: false },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Juula', statusBarStyle: 'default' },
  icons: { apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = { themeColor: '#235BF7' };

export default function ThemedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
