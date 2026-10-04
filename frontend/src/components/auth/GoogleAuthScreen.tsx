'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Zap, Link2 } from 'lucide-react';
import { api, clearCsrfToken } from '@/lib/api';
import { JuulaLogo } from '@/components/brand/JuulaLogo';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
    />
  </svg>
);

// After Google sign-in the OAuth callback redirects to `next` (same-origin
// only, validated again server-side): the dashboard, or the page that sent
// the user to /login (e.g. an order opened from an email link).
function nextPath(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const next = new URLSearchParams(window.location.search).get('next') ?? '';
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
    ? next
    : '/dashboard';
}

interface GoogleAuthScreenProps {
  mode: 'login' | 'signup';
}

export const GoogleAuthScreen: React.FC<GoogleAuthScreenProps> = ({ mode }) => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  // Already signed in → straight to the dashboard.
  useEffect(() => {
    let cancelled = false;
    api('/api/auth/me')
      .then(() => {
        if (!cancelled) router.replace(nextPath());
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleGoogle = () => {
    setRedirecting(true);
    // The callback issues a fresh CSRF cookie; drop any token cached by a
    // previous session so the next mutation doesn't send a stale one.
    clearCsrfToken();
    window.location.href = `/api/auth/oauth/google/start?next=${encodeURIComponent(nextPath())}`;
  };

  const isSignup = mode === 'signup';

  return (
    <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <JuulaLogo height={48} />
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-6">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
              {isSignup ? 'Créez votre boutique' : 'Bon retour !'}
            </h1>
            <p className="text-sm text-[#64748B]">
              {isSignup
                ? 'Inscription gratuite en un clic avec votre compte Google.'
                : 'Connectez-vous à votre tableau de bord marchand.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={checking || redirecting}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white border-2 border-[#E2E8F0] hover:border-[#1E60F8] hover:bg-[#F8FAFF] text-sm font-bold text-[#0F172A] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            {checking || redirecting ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#1E60F8]" />
            ) : (
              <GoogleIcon />
            )}
            <span>{isSignup ? "S'inscrire avec Google" : 'Se connecter avec Google'}</span>
          </button>

          {isSignup && (
            <ul className="space-y-2.5 text-xs text-[#475569]">
              <li className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-[#1E60F8] shrink-0" />
                Aucun mot de passe ni code à retenir
              </li>
              <li className="flex items-center gap-2.5">
                <Link2 className="w-4 h-4 text-[#1E60F8] shrink-0" />
                Un lien de vente partageable pour chaque produit
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#1E60F8] shrink-0" />
                Connexion sécurisée par Google
              </li>
            </ul>
          )}

          <p className="text-center text-xs text-[#64748B] pt-2 border-t border-[#F1F5F9]">
            {isSignup ? (
              <>
                Déjà un compte ?{' '}
                <Link href="/login" className="font-bold text-[#1E60F8] hover:underline">
                  Se connecter
                </Link>
              </>
            ) : (
              <>
                Pas encore de boutique ?{' '}
                <Link href="/signup" className="font-bold text-[#1E60F8] hover:underline">
                  Créer un compte
                </Link>
              </>
            )}
          </p>
        </div>

        <p className="text-center text-[11px] text-[#94A3B8] mt-4">
          En continuant, vous acceptez les{' '}
          <Link href="/conditions" className="underline hover:text-[#1E60F8]">
            conditions d&apos;utilisation
          </Link>{' '}
          et la{' '}
          <Link href="/confidentialite" className="underline hover:text-[#1E60F8]">
            politique de confidentialité
          </Link>{' '}
          de Juula Store.
        </p>
      </div>
    </div>
  );
};
