// Storefront home: https://<shop>.juula.store (rewritten here by middleware).
// Lists the store's published products.
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { MessageCircle, PackageOpen, ShieldCheck, Truck } from 'lucide-react';
import { prisma } from '@/lib/server/prisma';
import { productConfig } from '@/lib/server/store/products';
import { loadStoreBySubdomain, pixelsOf, storeMetadata } from '@/lib/server/store/public';
import { PixelsInit } from '@/components/storefront/PixelsInit';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import { formatNumber } from '@/lib/orderUtils';
import { platformOrigin, storeOrigin, storeProductUrl } from '@/lib/store/subdomain';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ shop: string }>;
}

async function load(shop: string) {
  const found = await loadStoreBySubdomain(shop.toLowerCase());
  if (found.kind === 'moved') redirect(storeOrigin(found.subdomain));
  if (found.kind === 'none') notFound();
  const products = await prisma.product.findMany({
    where: { userId: found.store.userId, status: 'published' },
    orderBy: { updatedAt: 'desc' },
  });
  return {
    store: found.store,
    products: products.map((p) => ({ slug: p.slug, config: productConfig(p) })),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shop } = await params;
  const { store, products } = await load(shop);
  const image = products[0]?.config.mediaItems.find((m) => m.type === 'image')?.url;
  return storeMetadata(store, products.length, image);
}

export default async function StorefrontPage({ params }: PageProps) {
  const { shop } = await params;
  const { store, products } = await load(shop);
  const name = store.name || store.subdomain!;
  const whatsapp = products
    .map((p) => p.config.whatsappSupportNumber)
    .find((n) => n && n.replace(/[^\d]/g, '').length >= 9)
    ?.replace(/[^\d]/g, '');
  const delivery = products[0]?.config.deliveryNotice;

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-[#201D1D]">
      <PixelsInit pixels={pixelsOf(store)} />

      <header className="bg-white border-b border-[#E6EAF2]">
        <div className="h-1.5 bg-[#235BF7]" />
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#235BF7] text-white flex items-center justify-center text-2xl font-black shadow-[0_8px_24px_-8px_rgba(35,91,247,0.6)] shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight truncate">{name}</h1>
            <p className="text-sm text-[#6B7280] mt-1">
              {products.length} produit{products.length > 1 ? 's' : ''} disponible
              {products.length > 1 ? 's' : ''}
              {delivery ? ` · ${delivery}` : ''}
            </p>
          </div>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-black transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Nous écrire sur WhatsApp
            </a>
          )}
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-5 flex flex-wrap gap-2 text-xs font-bold text-[#3F4654]">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EEF3FF] text-[#235BF7]">
            <Truck className="w-3.5 h-3.5" /> Paiement à la livraison
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4F6FB]">
            Wave · Orange Money
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4F6FB]">
            <ShieldCheck className="w-3.5 h-3.5" /> Paiement sécurisé
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <PackageOpen className="w-12 h-12 text-[#235BF7] mx-auto" />
            <p className="mt-4 text-lg font-black">Bientôt disponible</p>
            <p className="text-sm text-[#6B7280] mt-1">
              Cette boutique prépare ses premiers produits.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-3">
            {products.map(({ slug, config }) => {
              const image = config.mediaItems.find((m) => m.type === 'image')?.url;
              const discount =
                config.originalPrice > config.price && config.price > 0
                  ? Math.round(((config.originalPrice - config.price) / config.originalPrice) * 100)
                  : 0;
              return (
                <li key={slug}>
                  <a
                    href={storeProductUrl(store.subdomain!, slug)}
                    className="group block h-full rounded-3xl bg-white border border-[#E6EAF2] overflow-hidden hover:shadow-[0_18px_40px_-20px_rgba(32,29,29,0.35)] hover:border-[#235BF7]/40 transition-all"
                  >
                    <div className="relative aspect-square bg-[#EEF3FF]">
                      {image ? (
                        <img
                          src={image}
                          alt={config.productTitle}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PackageOpen className="w-10 h-10 text-[#235BF7]/50" />
                        </div>
                      )}
                      {discount > 0 && (
                        <span className="absolute top-3 left-3 text-[11px] font-black text-white bg-[#DC2626] px-2 py-1 rounded-full">
                          -{discount}%
                        </span>
                      )}
                    </div>
                    <div className="p-3 sm:p-4">
                      <p className="text-sm sm:text-base font-black leading-snug line-clamp-2">
                        {config.productTitle}
                      </p>
                      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                        <span className="text-base sm:text-lg font-black text-[#235BF7]">
                          {formatNumber(config.price)} F
                        </span>
                        {discount > 0 && (
                          <span className="text-xs text-[#9CA3AF] line-through">
                            {formatNumber(config.originalPrice)} F
                          </span>
                        )}
                      </div>
                      <span className="mt-3 block w-full py-2.5 rounded-xl bg-[#201D1D] group-hover:bg-[#235BF7] text-white text-xs sm:text-sm font-black text-center transition-colors">
                        Commander
                      </span>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <footer className="py-8 text-center">
        <a
          href={platformOrigin()}
          className="inline-flex items-center gap-2 text-xs text-[#6B7280] hover:text-[#235BF7]"
        >
          Boutique propulsée par <JuulaLogo height={18} />
        </a>
      </footer>
    </div>
  );
}
