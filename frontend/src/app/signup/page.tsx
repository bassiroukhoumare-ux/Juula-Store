import type { Metadata } from 'next';
import { GoogleAuthScreen } from '@/components/auth/GoogleAuthScreen';

export const metadata: Metadata = { title: 'Inscription — Juula Store' };

export default function SignupPage() {
  return <GoogleAuthScreen mode="signup" />;
}
