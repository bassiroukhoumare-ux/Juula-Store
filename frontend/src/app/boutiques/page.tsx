// www.juula.store/boutiques — public directory of the published shops with an
// active PRO subscription (search + categories).
import type { Metadata } from 'next';
import { displayFont } from '@/app/fonts';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { StoreDirectory } from '@/components/site/StoreDirectory';
import { directoryStores } from '@/lib/server/store/directory';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Toutes les boutiques · Juula',
  description:
    'Explorez les boutiques vérifiées des marchands Juula : mode, beauté, high-tech, maison et plus encore. Commandez en toute confiance.',
  alternates: { canonical: '/boutiques' },
};

export default async function StoresDirectoryPage() {
  const stores = await directoryStores().catch(() => []);
  return (
    <div className={`${displayFont.className} min-h-screen bg-[#EDEFF3] text-[#201D1D]`}>
      <SiteHeader />
      <main className="px-3 sm:px-5 pb-5">
        <section className="rounded-[36px] bg-white px-4 py-12 sm:py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#235BF7]">
                Juula Creators
              </p>
              <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-[-0.03em]">
                Toutes les boutiques
              </h1>
              <p className="mt-3 text-[16px] sm:text-[18px] text-[#7A808C]">
                {stores.length} boutique{stores.length > 1 ? 's' : ''} vérifiée
                {stores.length > 1 ? 's' : ''}, actives sur Juula.
              </p>
            </div>
            <StoreDirectory stores={stores} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
