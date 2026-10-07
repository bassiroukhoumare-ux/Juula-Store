// Landing « Juula Creators »: 4 featured shops + link to the full directory.
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { featuredStores } from '@/lib/server/store/directory';
import { StoreCard } from '@/components/site/StoreCard';
import { Reveal } from '@/components/landing/Reveal';

export async function StoreShowcase() {
  const { stores, total } = await featuredStores().catch(() => ({ stores: [], total: 0 }));
  if (stores.length === 0) return null;
  return (
    <section
      id="boutiques"
      className="scroll-mt-28 rounded-[36px] bg-[#F6F7F9] px-4 py-16 sm:py-20"
    >
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#ECEFF4] text-[13px] font-bold text-[#235BF7]">
              <Sparkles className="w-3.5 h-3.5" /> Juula Creators
            </span>
            <h2 className="mt-5 text-3xl sm:text-5xl font-extrabold tracking-[-0.03em]">
              Des boutiques qui vendent chaque jour sur Juula
            </h2>
            <p className="mt-3 text-[16px] sm:text-[18px] text-[#7A808C]">
              Explorez les univers de nos marchands partenaires.
            </p>
          </div>
        </Reveal>
        <ul className="mt-10 sm:mt-12 flex flex-wrap justify-center gap-4">
          {stores.map((s, i) => (
            <li
              key={s.id}
              className="w-full min-[520px]:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]"
            >
              <Reveal delay={i * 110} className="h-full">
                <StoreCard store={s} />
              </Reveal>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex justify-center">
          <Link
            href="/boutiques"
            className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-2xl bg-white border border-[#E3E7EE] text-[15px] font-bold text-[#201D1D] hover:border-[#235BF7] hover:text-[#235BF7] transition-colors"
          >
            Découvrir toutes les boutiques ({total}) <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
