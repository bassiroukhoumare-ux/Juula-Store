import type { Metadata } from 'next';
import { GoogleAuthScreen } from '@/components/auth/GoogleAuthScreen';

export const metadata: Metadata = {
  title: 'Connexion — Juula Store',
  description:
    'Connectez-vous à votre espace marchand Juula : commandes, paiements Wave et Orange Money, boutique et pages produits.',
  alternates: { canonical: '/login' },
};

export default function LoginPage() {
  return <GoogleAuthScreen mode="login" />;
}
