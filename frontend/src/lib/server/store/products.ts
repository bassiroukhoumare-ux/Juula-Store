// Product (funnel page) persistence helpers shared by /api/products/*,
// the public page /p/[slug] and the public order route.
import 'server-only';
import type { Prisma, Product } from '@prisma/client';
import { z } from 'zod';
import type { FunnelPageConfig, FunnelPageItem, FunnelPageStatus } from '@/types/juula';
import { cleanComparison, cleanDescription, cleanFaq } from '@/lib/store/product-content';
import { parseCrossSell } from '@/lib/store/marketing';

export { pickStoreWide } from '@/lib/store/store-fields';

export const PRODUCT_STATUSES = ['draft', 'published', 'inactive'] as const;
export const ProductStatusSchema = z.enum(PRODUCT_STATUSES);

// Serialized config cap. Images live on Cloudinary, so a config is a few KB;
// the cap blocks a client from stuffing base64 media into the DB row.
export const MAX_CONFIG_BYTES = 256 * 1024;
export const MAX_PRICE = 100_000_000;

// The editor's config is a large, evolving shape (src/types/juula.ts). We
// validate the fields the server relies on (pricing, display, URLs) and let
// the rest pass through untouched.
const MoneySchema = z.number().int().min(0).max(MAX_PRICE);
export const FunnelConfigSchema = z
  .object({
    productTitle: z.string().max(300),
    price: MoneySchema,
    originalPrice: MoneySchema.optional(),
    currency: z.string().max(10),
    storeName: z.string().max(120),
    storeCode: z.string().max(10),
    mediaItems: z
      .array(
        z
          .object({ id: z.string(), type: z.enum(['image', 'video']), url: z.string() })
          .passthrough(),
      )
      .max(20),
    deliveryFee: MoneySchema.optional(),
    fixedDeliveryFee: MoneySchema.optional(),
    quantityDiscounts: z
      .array(
        z
          .object({
            minQty: z.number().int().min(1).max(1000),
            discountType: z.enum(['percent', 'fixed_price']),
            discountValue: z.number().min(0).max(MAX_PRICE),
          })
          .passthrough(),
      )
      .max(10)
      .optional(),
  })
  .passthrough();

// Only http(s) URLs survive persistence. `data:` (base64 previews) and
// `blob:` (object URLs) are browser-local and meaningless once stored.
function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function sanitizeConfig(config: FunnelPageConfig): FunnelPageConfig {
  return {
    ...config,
    mediaItems: (config.mediaItems ?? []).filter((m) => isHttpUrl(m.url)),
    videoUrl: isHttpUrl(config.videoUrl) ? config.videoUrl : '',
    hasVideo: Boolean(config.hasVideo && isHttpUrl(config.videoUrl)),
    proofItems: (config.proofItems ?? [])
      .filter((p) => isHttpUrl(p.url))
      .map((p) => ({ ...p, thumbnailUrl: isHttpUrl(p.thumbnailUrl) ? p.thumbnailUrl : undefined })),
    proofScreenshots: (config.proofScreenshots ?? []).filter(isHttpUrl),
    // Long-form content: capped, and empty FAQ entries / comparison rows dropped
    // so the public page never shows a blank block.
    description: cleanDescription(config.description),
    faqItems: cleanFaq(config.faqItems),
    comparison: cleanComparison(config.comparison),
    crossSell: parseCrossSell(config.crossSell),
  };
}

export type ParsedConfig =
  | { ok: true; config: FunnelPageConfig }
  | { ok: false; error: 'VALIDATION_FAILED' | 'CONFIG_TOO_LARGE'; issues?: unknown };

export function parseConfig(raw: unknown): ParsedConfig {
  const parsed = FunnelConfigSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: 'VALIDATION_FAILED', issues: parsed.error.issues };
  const config = sanitizeConfig(parsed.data as unknown as FunnelPageConfig);
  if (Buffer.byteLength(JSON.stringify(config), 'utf8') > MAX_CONFIG_BYTES) {
    return { ok: false, error: 'CONFIG_TOO_LARGE' };
  }
  return { ok: true, config };
}

/** Row → the config the editor and showcase consume. Columns win over JSON. */
export function productConfig(product: Product): FunnelPageConfig {
  const config = product.config as unknown as FunnelPageConfig;
  return {
    ...config,
    id: product.id,
    slug: product.slug,
    status: product.status as FunnelPageStatus,
    internalName: product.internalName,
  };
}

/** Adds the store's logo and name to a product config for the public page. */
export function withStoreBranding(
  config: FunnelPageConfig,
  store: { name: string | null; logoUrl: string | null } | null | undefined,
): FunnelPageConfig {
  if (!store) return config;
  return {
    ...config,
    storeLogoUrl: store.logoUrl,
    ...(store.name ? { storeName: store.name } : {}),
  };
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function toFunnelPageItem(product: Product): FunnelPageItem {
  return {
    id: product.id,
    internalName: product.internalName,
    status: product.status as FunnelPageStatus,
    createdAt: dateFmt.format(product.createdAt),
    updatedAt: dateFmt.format(product.updatedAt),
    config: productConfig(product),
  };
}

export function configToJson(config: FunnelPageConfig): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(config)) as Prisma.InputJsonValue;
}
