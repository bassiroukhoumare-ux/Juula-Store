import { capFaq } from '@/lib/store/product-content';
import { invalidateStorefront } from '@/lib/server/store/public-cache';
import { isStoreCategory } from '@/lib/store/categories';
import { parseAnnouncement } from '@/lib/store/marketing';
import 'server-only';
// Storefront (<subdomain>.juula.store) settings and the payment options a
// customer gets on the shop and on product pages, according to the plan.
import type { Prisma, Store } from '@prisma/client';
import type { FunnelPageConfig } from '@/types/juula';
import { prisma } from '@/lib/server/prisma';
import { isAllowedLogoUrl } from '@/lib/server/store/profile';
import { isStorePro } from '@/lib/store/plans';
import {
  DEFAULT_ACCENT,
  isBannerPlacement,
  isHexColor,
  type CheckoutOptions,
  type DirectPaymentMethod,
  type StoreBanner,
  type StoreSection,
  type StorefrontSettings,
} from '@/lib/store/storefront-types';

const MAX_BANNERS = 5;
const MAX_DIRECT_METHODS = 5;

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function isHttpsUrl(v: string): boolean {
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Stored JSON → banners (drops anything malformed). */
export function parseBanners(raw: unknown): StoreBanner[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((b: Record<string, unknown>) => ({
      id: str(b?.id, 40),
      imageUrl: str(b?.imageUrl, 500),
      title: str(b?.title, 80),
      badge: str(b?.badge, 40),
      buttonLabel: str(b?.buttonLabel, 40),
      category: str(b?.category, 40),
      placement: isBannerPlacement(b?.placement) ? b.placement : ('before_products' as const),
      productSlugs: Array.isArray(b?.productSlugs)
        ? [...new Set((b.productSlugs as unknown[]).map((v) => str(v, 120)).filter(Boolean))].slice(
            0,
            40,
          )
        : [],
    }))
    .filter((b) => b.id && b.imageUrl && b.title)
    .slice(0, MAX_BANNERS);
}

const MAX_SECTIONS = 20;

/** Stored JSON → sections (drops anything malformed). */
export function parseSections(raw: unknown): StoreSection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x: Record<string, unknown>) => ({
      id: str(x?.id, 40),
      type: x?.type === 'testimonials' ? ('testimonials' as const) : ('products' as const),
      title: str(x?.title, 80),
      subtitle: str(x?.subtitle, 160),
      placement: isBannerPlacement(x?.placement) ? x.placement : ('after_products' as const),
      productSlugs: Array.isArray(x?.productSlugs)
        ? [...new Set((x.productSlugs as unknown[]).map((v) => str(v, 120)).filter(Boolean))].slice(
            0,
            40,
          )
        : [],
      images: Array.isArray(x?.images)
        ? (x.images as unknown[])
            .map((v) => str(v, 500))
            .filter(Boolean)
            .slice(0, 30)
        : [],
    }))
    .filter((x) => x.id && x.title)
    .slice(0, MAX_SECTIONS);
}

/** Slugs a shop customer may buy: visible in the shop, or in a banner / section. */
export function shopSellableSlugs(store: Store | null): Set<string> {
  const set = new Set<string>();
  parseBanners(store?.storeBanners).forEach((b) => b.productSlugs.forEach((s) => set.add(s)));
  parseSections(store?.storeSections).forEach((x) => x.productSlugs.forEach((s) => set.add(s)));
  return set;
}

export function parseDirectMethods(raw: unknown): DirectPaymentMethod[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m: Record<string, unknown>) => ({
      id: str(m?.id, 40),
      name: str(m?.name, 40),
      url: str(m?.url, 500),
      qrUrl: str(m?.qrUrl, 500) || null,
    }))
    .filter((m) => m.id && m.name && (m.url || m.qrUrl))
    .slice(0, MAX_DIRECT_METHODS);
}

export function toStorefrontSettings(store: Store | null): StorefrontSettings {
  return {
    published: store?.storefrontPublished ?? false,
    tagline: store?.storeTagline ?? '',
    category: isStoreCategory(store?.storeCategory) ? store.storeCategory : null,
    coverUrl: store?.storeCoverUrl ?? null,
    accent: isHexColor(store?.storeAccent) ? store.storeAccent : DEFAULT_ACCENT,
    banners: parseBanners(store?.storeBanners),
    sections: parseSections(store?.storeSections),
    faq: capFaq(store?.storeFaq),
    announcement: parseAnnouncement(store?.announcementBar),
    codEnabled: store?.codEnabled ?? true,
    onlinePaymentsEnabled: store?.onlinePaymentsEnabled ?? false,
    setupDone: store?.storefrontSetupDone ?? false,
    whatsappOrderEnabled: store?.whatsappOrderEnabled ?? false,
    directPaymentMethods: parseDirectMethods(store?.directPaymentMethods),
  };
}

/**
 * A shop and its product pages are online only with an active subscription,
 * and never while the administration has suspended the shop.
 */
export function isStoreLive(store: Store | null): boolean {
  return isStorePro(store) && !store?.suspendedAt;
}

/**
 * Payment options of a (live) store:
 *   - cash on delivery, if the merchant keeps it on;
 *   - JuulaPay online payment, only if the merchant enabled it (7,5 % fee);
 *   - the merchant's own direct links;
 *   - « Commander sur WhatsApp » whenever the store has a WhatsApp number.
 */
export function checkoutOptionsFor(store: Store | null): CheckoutOptions {
  const settings = toStorefrontSettings(store);
  const whatsapp = store?.whatsapp?.replace(/\D/g, '') || null;
  return {
    online: settings.onlinePaymentsEnabled,
    cod: settings.codEnabled,
    direct: settings.directPaymentMethods,
    whatsapp,
  };
}

export interface StorefrontInput {
  published?: boolean | undefined;
  tagline?: string | undefined;
  category?: string | null | undefined;
  coverUrl?: string | null | undefined;
  accent?: string | undefined;
  banners?: unknown[] | undefined; // normalized by parseBanners
  sections?: unknown[] | undefined; // normalized by parseSections
  faq?: unknown[] | undefined; // normalized by capFaq
  announcement?: unknown; // normalized by parseAnnouncement
  codEnabled?: boolean | undefined;
  onlinePaymentsEnabled?: boolean | undefined;
  setupDone?: boolean | undefined;
  whatsappOrderEnabled?: boolean | undefined;
  directPaymentMethods?: DirectPaymentMethod[] | undefined;
}

export type StorefrontResult =
  | { ok: true; settings: StorefrontSettings }
  | { ok: false; error: string; message: string };

const fail = (error: string, message: string): StorefrontResult => ({ ok: false, error, message });

export async function saveStorefrontSettings(
  userId: string,
  input: StorefrontInput,
): Promise<StorefrontResult> {
  const store = await prisma.store.findUnique({ where: { userId } });
  if (!store?.subdomain) {
    return fail('STORE_NOT_READY', 'Choisissez d’abord l’adresse de votre boutique.');
  }
  const data: Prisma.StoreUpdateInput = {};

  if (input.published === true && !store.storefrontPublished && !isStorePro(store)) {
    return fail(
      'SUBSCRIPTION_REQUIRED',
      'Un abonnement actif est nécessaire pour mettre votre boutique en ligne.',
    );
  }
  if (input.published !== undefined) data.storefrontPublished = input.published;
  if (input.setupDone !== undefined) data.storefrontSetupDone = input.setupDone;
  if (input.onlinePaymentsEnabled !== undefined) {
    data.onlinePaymentsEnabled = input.onlinePaymentsEnabled;
  }
  if (input.tagline !== undefined) data.storeTagline = input.tagline.trim().slice(0, 140) || null;
  if (input.category !== undefined) {
    data.storeCategory = isStoreCategory(input.category) ? input.category : null;
  }
  if (input.coverUrl !== undefined) {
    if (input.coverUrl !== null && !isAllowedLogoUrl(input.coverUrl)) {
      return fail('COVER_INVALID', 'Image de couverture invalide : téléversez une image.');
    }
    data.storeCoverUrl = input.coverUrl;
  }
  if (input.accent !== undefined) {
    if (!isHexColor(input.accent)) return fail('ACCENT_INVALID', 'Couleur invalide.');
    data.storeAccent = input.accent;
  }
  if (input.banners !== undefined) {
    const banners = parseBanners(input.banners);
    if (banners.some((b) => !isAllowedLogoUrl(b.imageUrl))) {
      return fail('BANNER_INVALID', 'Image de bannière invalide : téléversez une image.');
    }
    data.storeBanners = banners as unknown as Prisma.InputJsonValue;
  }
  if (input.sections !== undefined) {
    // Only screenshots hosted on our Cloudinary are kept; anything else is
    // dropped (one bad image must not block saving every other section).
    const sections = parseSections(input.sections).map((x) => ({
      ...x,
      images: x.images.filter((u) => isAllowedLogoUrl(u)),
    }));
    data.storeSections = sections as unknown as Prisma.InputJsonValue;
  }
  if (input.announcement !== undefined) {
    data.announcementBar = parseAnnouncement(
      input.announcement,
    ) as unknown as Prisma.InputJsonValue;
  }
  if (input.faq !== undefined) {
    data.storeFaq = capFaq(input.faq) as unknown as Prisma.InputJsonValue;
  }
  if (input.codEnabled !== undefined) data.codEnabled = input.codEnabled;
  if (input.whatsappOrderEnabled !== undefined) {
    data.whatsappOrderEnabled = input.whatsappOrderEnabled;
  }
  if (input.directPaymentMethods !== undefined) {
    const methods = parseDirectMethods(input.directPaymentMethods);
    for (const m of methods) {
      if (m.url && !isHttpsUrl(m.url)) {
        return fail('METHOD_INVALID', `Lien de paiement « ${m.name} » invalide (https://…).`);
      }
      if (m.qrUrl && !isAllowedLogoUrl(m.qrUrl)) {
        return fail('METHOD_INVALID', `QR code « ${m.name} » invalide : téléversez une image.`);
      }
    }
    data.directPaymentMethods = methods as unknown as Prisma.InputJsonValue;
  }

  const updated = await prisma.store.update({ where: { id: store.id }, data });
  invalidateStorefront({ userId });
  return { ok: true, settings: toStorefrontSettings(updated) };
}

/** Product page config with the payment options the merchant's plan allows. */
export function withCheckoutOptions(
  config: FunnelPageConfig,
  store: Store | null,
): FunnelPageConfig {
  const options = checkoutOptionsFor(store);
  return {
    ...config,
    codEnabled: options.cod && config.codEnabled !== false,
    onlinePaymentsEnabled: options.online,
    directPaymentMethods: options.direct,
    whatsappOrderNumber: options.whatsapp,
  };
}
