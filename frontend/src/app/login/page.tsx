import type { Metadata } from 'next';
import { GoogleAuthScreen } from '@/components/auth/GoogleAuthScreen';

export const metadata: Metadata = { title: 'Connexion — Juula Store' };

export default function LoginPage() {
  return <GoogleAuthScreen mode="login" />;
}
