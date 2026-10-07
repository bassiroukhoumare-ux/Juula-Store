// Shop card of the public directory (landing « Juula Creators » + /boutiques).
import { ArrowUpRight, BadgeCheck, Store } from 'lucide-react';

export interface StoreCardData {
  name: string;
  subdomain: string;
  url: string;
  logoUrl: string | null;
  coverUrl: string | null;
  photos: string[];
  tagline: string | null;
  accent: string | null;
  categoryLabel: string | null;
  products: number;
}

export function StoreCard({ store, compact = false }: { store: StoreCardData; compact?: boolean }) {
  const accent = store.accent || '#235BF7';
  return (
    <article className="group h-full flex flex-col rounded-[24px] bg-white border border-[#ECEFF4] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-28px_rgba(32,29,29,0.35)]">
      <a
        href={store.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visiter ${store.name}`}
        className="relative block aspect-[16/10] bg-[#F1F3F6] overflow-hidden"
      >
        {store.coverUrl ? (
          <img
            src={store.coverUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : store.photos.length > 0 ? (
          <span className="grid h-full grid-cols-3 gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="bg-[#E9ECF1] overflow-hidden">
                {store.photos[i % store.photos.length] && (
                  <img
                    src={store.photos[i % store.photos.length]}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}
              </span>
            ))}
          </span>
        ) : (
          <span
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
          >
            <Store className="w-10 h-10 text-white/80" />
          </span>
        )}
      </a>
      <div
        className={`relative flex-1 flex flex-col ${compact ? 'px-3 sm:px-5 pb-3 sm:pb-5' : 'px-4 sm:px-5 pb-4 sm:pb-5'}`}
      >
        <span className="-mt-6 sm:-mt-7 w-12 h-12 sm:w-14 sm:h-14 rounded-full ring-4 ring-white bg-white shadow-[0_8px_18px_-10px_rgba(32,29,29,0.45)] overflow-hidden flex items-center justify-center shrink-0">
          {store.logoUrl ? (
            <img src={store.logoUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <span
              className="w-full h-full flex items-center justify-center text-white text-[20px] font-extrabold"
              style={{ background: accent }}
            >
              {store.name.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <div className="mt-2.5 flex items-start gap-1.5 min-w-0">
          <h3 className="min-w-0 text-[16px] sm:text-[17px] font-extrabold leading-snug truncate">
            {store.name}
          </h3>
          <BadgeCheck
            className="w-[18px] h-[18px] shrink-0 mt-0.5 text-[#235BF7]"
            aria-label="Boutique vérifiée"
          />
        </div>
        <p className="text-[12px] sm:text-[13px] text-[#7A808C] truncate">
          {store.subdomain}.juula.store
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EEF3FF] text-[#235BF7] text-[11px] font-bold">
            <BadgeCheck className="w-3 h-3" /> Boutique vérifiée
          </span>
          {store.categoryLabel && (
            <span className="px-2 py-0.5 rounded-full bg-[#F1F3F6] text-[#3F4654] text-[11px] font-semibold">
              {store.categoryLabel}
            </span>
          )}
        </div>
        {!compact && store.tagline && (
          <p className="mt-2 text-[13px] sm:text-[14px] text-[#3F4654] leading-relaxed line-clamp-2">
            {store.tagline}
          </p>
        )}
        <a
          href={store.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-auto ${compact ? 'pt-3' : 'pt-4'}`}
        >
          <span className="w-full min-h-11 px-2 rounded-xl bg-[#201D1D] group-hover:bg-[#235BF7] text-white text-[13px] sm:text-[14px] font-semibold whitespace-nowrap inline-flex items-center justify-center gap-1.5 transition-colors">
            {compact ? (
              <>
                <span className="sm:hidden">Visiter</span>
                <span className="hidden sm:inline">Visiter la boutique</span>
              </>
            ) : (
              'Visiter la boutique'
            )}
            <ArrowUpRight className="w-4 h-4 shrink-0" />
          </span>
        </a>
      </div>
    </article>
  );
}
