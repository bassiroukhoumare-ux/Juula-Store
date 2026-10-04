import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Juula Store — Boutique en ligne, paiement à la livraison & Mobile Money',
  description:
    'Plateforme e-commerce & funnel builder nouvelle génération pour les marchands africains.',
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
