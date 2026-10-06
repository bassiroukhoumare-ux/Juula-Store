import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// viewport-fit=cover: lets fixed bars use env(safe-area-inset-*) on iPhone.
// Pinch-zoom stays allowed (accessibility); field zoom is handled in CSS.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const siteUrl = process.env.APP_URL || 'https://www.juula.store';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Juula Store — Boutique en ligne, paiement à la livraison & Mobile Money',
  description:
    "La plateforme E-commerce pensée pour l'Afrique. Des pages produits conçues pour convertir.",
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: siteUrl,
    siteName: 'Juula Store',
    title: "Juula — La plateforme E-commerce pensée pour l'Afrique",
    description:
      'Des pages produits conçues pour convertir. Vendez sur WhatsApp & encaissez par Wave, Orange Money ou à la livraison.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: "Juula — La plateforme E-commerce pensée pour l'Afrique",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Juula — La plateforme E-commerce pensée pour l'Afrique",
    description: 'Des pages produits conçues pour convertir.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body
        className={`${inter.className} min-h-screen bg-[#F2F4F7] text-[#0F172A] antialiased selection:bg-[#1E60F8] selection:text-white`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
