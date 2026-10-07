import type { Metadata } from 'next';
import { GoogleAuthScreen } from '@/components/auth/GoogleAuthScreen';

export const metadata: Metadata = {
  title: 'Créer ma boutique en ligne gratuitement — Juula Store',
  description:
    'Créez votre boutique en ligne en quelques minutes : pages produits, paiement à la livraison, Wave, Orange Money et carte bancaire.',
  alternates: { canonical: '/signup' },
};

export default function SignupPage() {
  return <GoogleAuthScreen mode="signup" />;
}
