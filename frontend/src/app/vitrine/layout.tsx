import type { Metadata } from 'next';

// Demo showcase with sample data: useful for visitors, not a search result.
export const metadata: Metadata = {
  title: 'Exemple de page produit — Juula Store',
  robots: { index: false, follow: true },
};

export default function VitrineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
