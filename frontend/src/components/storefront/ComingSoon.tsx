// Shown when a shop or a product page is not (or no longer) published.
import { displayFont } from '@/app/fonts';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import { Store } from 'lucide-react';

export function ComingSoon({ storeName }: { storeName?: string | null | undefined }) {
  return (
    <main
      className={`min-h-screen bg-[#F6F7F9] text-[#201D1D] flex flex-col items-center justify-center px-6 text-center ${displayFont.className}`}
    >
      <span className="w-16 h-16 rounded-[22px] bg-white border border-[#ECEFF4] text-[#235BF7] flex items-center justify-center">
        <Store className="w-7 h-7" />
      </span>
      <h1 className="mt-6 text-2xl sm:text-3xl font-extrabold tracking-tight">
        Boutique introuvable ou en cours de préparation
      </h1>
      <p className="mt-2 max-w-md text-[15px] text-[#7A808C]">
        {storeName
          ? `${storeName} prépare sa boutique. Revenez très bientôt !`
          : 'Cette page n’est pas encore en ligne. Revenez très bientôt !'}
      </p>
      <a
        href="https://www.juula.store"
        className="mt-10 opacity-70 hover:opacity-100 transition-opacity"
      >
        <JuulaLogo height={22} />
      </a>
    </main>
  );
}
