import type { Metadata } from 'next';
import Link from 'next/link';
import { displayFont } from '@/app/fonts';
import { JuulaLogo } from '@/components/brand/JuulaLogo';

// Real 404 (status + noindex) instead of a soft one, with a way back.
export const metadata: Metadata = {
  title: 'Page introuvable — Juula Store',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main
      className={`${displayFont.className} min-h-screen bg-[#EDEFF3] flex items-center justify-center px-4`}
    >
      <div className="w-full max-w-md text-center">
        <Link href="/" aria-label="Accueil Juula" className="inline-flex text-[#201D1D]">
          <JuulaLogo height={36} />
        </Link>
        <p className="mt-10 text-[72px] leading-none font-black text-[#235BF7]">404</p>
        <h1 className="mt-4 text-[26px] font-extrabold text-[#201D1D]">Page introuvable</h1>
        <p className="mt-2 text-[16px] text-[#3F4654]">
          Le lien est peut-être incorrect, ou la page a été déplacée ou retirée.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="min-h-12 px-6 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white font-semibold inline-flex items-center justify-center transition-colors"
          >
            Retour à l’accueil
          </Link>
          <Link
            href="/boutiques"
            className="min-h-12 px-6 rounded-xl border border-[#D6DBE4] bg-white hover:bg-[#F6F7F9] text-[#201D1D] font-semibold inline-flex items-center justify-center transition-colors"
          >
            Voir les boutiques
          </Link>
        </div>
      </div>
    </main>
  );
}
