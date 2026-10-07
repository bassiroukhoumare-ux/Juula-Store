import type { Metadata } from 'next';

// Auth error / callback screens: transient, never indexed.
export const metadata: Metadata = {
  title: 'Connexion — Juula Store',
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
