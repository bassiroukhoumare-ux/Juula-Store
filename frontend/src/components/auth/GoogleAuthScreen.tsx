'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Link2, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { api, clearCsrfToken } from '@/lib/api';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import { displayFont } from '@/app/fonts';
import { JuulaMark } from '@/components/landing/HeroNetwork';
import {
  FacebookIcon,
  OrangeMoneyTile,
  TikTokIcon,
  WaveTile,
} from '@/components/landing/BrandIcons';

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

const rise = (delay: number): React.CSSProperties => ({
  animation: `rise 900ms cubic-bezier(.2,.75,.2,1) ${delay}s forwards`,
});

const BENEFITS = [
  { icon: Link2, text: 'Votre boutique pro en un seul lien' },
  { icon: Wallet, text: 'Wave, Orange Money, carte ou à la livraison' },
  { icon: ShieldCheck, text: 'Connexion sécurisée par Google' },
];

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
    <div
      className={`${displayFont.className} min-h-screen bg-[#EDEFF3] text-[#201D1D] p-3 sm:p-5 flex flex-col`}
    >
      {/* Top bar: back to the landing page */}
      <div className="flex items-center justify-between gap-3 px-1 sm:px-2 pb-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-[14px] bg-white border border-[#E3E7EE] text-sm font-semibold hover:bg-[#F6F7F9] hover:-translate-x-0.5 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à l’accueil
        </Link>
        <Link href="/" aria-label="Juula — accueil" className="sm:hidden">
          <JuulaLogo height={26} />
        </Link>
      </div>

      <main className="flex-1 grid lg:grid-cols-[1fr_1.05fr] gap-3 sm:gap-5">
        {/* Form */}
        <section className="rounded-[36px] bg-[#F6F7F9] border border-white flex items-center justify-center px-4 py-12 sm:py-16">
          <div className="w-full max-w-[420px]">
            <div
              className="opacity-0 motion-reduce:opacity-100 hidden sm:flex justify-center"
              style={rise(0.05)}
            >
              <Link href="/" aria-label="Juula — accueil">
                <JuulaLogo height={44} />
              </Link>
            </div>

            <div
              className="mt-8 text-center opacity-0 motion-reduce:opacity-100"
              style={rise(0.15)}
            >
              <h1 className="text-[38px] sm:text-5xl leading-[1.05] font-extrabold tracking-[-0.035em]">
                {isSignup ? (
                  <>
                    Créez votre <span className="text-[#235BF7]">boutique</span>
                  </>
                ) : (
                  <>
                    Bon <span className="text-[#235BF7]">retour</span> !
                  </>
                )}
              </h1>
              <p className="mt-3 text-[15px] sm:text-base text-[#7A808C]">
                {isSignup
                  ? 'Inscription gratuite, en un clic, avec votre compte Google.'
                  : 'Connectez-vous pour retrouver votre tableau de bord.'}
              </p>
            </div>

            <div
              className="mt-8 rounded-[28px] bg-white border border-[#ECEFF4] p-5 sm:p-6 shadow-[0_30px_60px_-36px_rgba(32,29,29,0.35)] opacity-0 motion-reduce:opacity-100"
              style={rise(0.28)}
            >
              <button
                type="button"
                onClick={handleGoogle}
                disabled={checking || redirecting}
                className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-[#201D1D] hover:bg-black text-white text-[15px] font-bold shadow-[0_14px_28px_-14px_rgba(32,29,29,0.8)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-wait"
              >
                {checking || redirecting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                    <GoogleIcon className="w-4 h-4" />
                  </span>
                )}
                {isSignup ? 'S’inscrire avec Google' : 'Se connecter avec Google'}
              </button>

              <ul className="mt-5 space-y-3">
                {BENEFITS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm text-[#3F4654]">
                    <span className="w-8 h-8 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>

              <p className="mt-5 pt-4 border-t border-[#F0F2F6] text-center text-sm text-[#7A808C]">
                {isSignup ? (
                  <>
                    Déjà une boutique ?{' '}
                    <Link href="/login" className="font-bold text-[#235BF7] hover:underline">
                      Se connecter
                    </Link>
                  </>
                ) : (
                  <>
                    Pas encore de boutique ?{' '}
                    <Link href="/signup" className="font-bold text-[#235BF7] hover:underline">
                      Créer un compte
                    </Link>
                  </>
                )}
              </p>
            </div>

            <p
              className="mt-5 text-center text-xs text-[#9AA0AB] leading-relaxed opacity-0 motion-reduce:opacity-100"
              style={rise(0.4)}
            >
              En continuant, vous acceptez les{' '}
              <Link href="/conditions" className="underline hover:text-[#235BF7]">
                conditions d’utilisation
              </Link>{' '}
              et la{' '}
              <Link href="/confidentialite" className="underline hover:text-[#235BF7]">
                politique de confidentialité
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Visual panel (desktop) */}
        <aside
          className="hidden lg:flex relative rounded-[36px] overflow-hidden bg-gradient-to-br from-[#2F63FF] via-[#235BF7] to-[#1638B8] text-white items-center justify-center p-12"
          aria-hidden="true"
        >
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-[#7FA2FF]/30 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" />

          <div className="relative w-full max-w-md">
            {/* Hub with floating payment / ads tiles */}
            <div className="relative h-72">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-[38px] bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center motion-safe:animate-[glow_3.2s_ease-in-out_infinite]">
                <div className="w-24 h-24 rounded-full border-[3px] border-white/85 flex items-center justify-center">
                  <JuulaMark className="w-14 h-14" />
                </div>
              </div>
              {[
                { el: <WaveTile size="md" />, pos: 'left-[6%] top-[8%]', d: 0.3, f: '6s' },
                {
                  el: <OrangeMoneyTile size="md" />,
                  pos: 'right-[6%] top-[12%]',
                  d: 0.42,
                  f: '7s',
                },
                {
                  el: (
                    <span className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center">
                      <FacebookIcon className="w-7 h-7" />
                    </span>
                  ),
                  pos: 'left-[12%] bottom-[6%]',
                  d: 0.54,
                  f: '7.5s',
                },
                {
                  el: (
                    <span className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center">
                      <TikTokIcon className="w-6 h-6" />
                    </span>
                  ),
                  pos: 'right-[10%] bottom-[10%]',
                  d: 0.66,
                  f: '6.5s',
                },
              ].map((t, i) => (
                <div
                  key={i}
                  className={`absolute ${t.pos} opacity-0 motion-reduce:opacity-100`}
                  style={rise(t.d)}
                >
                  <div
                    className="rounded-2xl shadow-[0_20px_40px_-18px_rgba(0,0,0,0.45)] motion-safe:animate-[float_6s_ease-in-out_infinite]"
                    style={{ animationDuration: t.f }}
                  >
                    {t.el}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center opacity-0 motion-reduce:opacity-100" style={rise(0.5)}>
              <p className="text-4xl font-extrabold tracking-[-0.03em] leading-tight">
                Votre boutique pro,
                <br />
                en un seul lien.
              </p>
              <p className="mt-3 text-white/75">Créez. Partagez. Encaissez.</p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};
