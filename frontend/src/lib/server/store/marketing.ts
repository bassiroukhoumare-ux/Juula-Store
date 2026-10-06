import 'server-only';
// Render-time marketing data of a product page: the shop announcement bar
// and the « souvent acheté avec » products (with their bundle price).
import type { Store } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { productConfig } from '@/lib/server/store/products';
import { toStorefrontSettings } from '@/lib/server/store/storefront';
import { bundlePrice, parseCrossSell } from '@/lib/store/marketing';
import { computeDeliveryFee } from '@/lib/store/pricing';
import type { FunnelPageConfig } from '@/types/juula';

export async function withMarketing(
  config: FunnelPageConfig,
  store: Store | null,
  merchantId: string,
): Promise<FunnelPageConfig> {
  const settings = toStorefrontSettings(store);
  const crossSell = parseCrossSell(config.crossSell);
  let crossSellProducts: FunnelPageConfig['crossSellProducts'] = [];
  if (crossSell.slugs.length > 0) {
    const rows = await prisma.product.findMany({
      where: { slug: { in: crossSell.slugs }, userId: merchantId, status: { not: 'inactive' } },
    });
    crossSellProducts = crossSell.slugs
      .map((slug) => rows.find((r) => r.slug === slug))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => {
        const c = productConfig(r);
        return {
          slug: r.slug,
          title: c.productTitle || r.internalName,
          image: c.mediaItems.find((m) => m.type === 'image')?.url ?? null,
          price: c.price,
          bundlePrice: bundlePrice(c.price, crossSell.discountPercent),
          deliveryFee: computeDeliveryFee(c),
        };
      });
  }
  return {
    ...config,
    storeAnnouncement: settings.announcement,
    storeAccent: settings.accent,
    crossSellProducts,
  };
}
