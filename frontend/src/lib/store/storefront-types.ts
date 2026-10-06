import type { FaqItem } from '@/lib/store/product-content';
// Storefront settings shared by the dashboard, the public shop and the API.

export interface StoreBanner {
  id: string;
  imageUrl: string;
  title: string;
  /** Small label above the title, e.g. « Offre du moment ». */
  badge: string;
  buttonLabel: string;
  /** Product category the button filters on ('' = all products). */
  category: string;
  /** Where the banner sits on the shop page. */
  placement: BannerPlacement;
  /** Products of this banner (e.g. a promotion): the button shows them. */
  productSlugs: string[];
}

export const BANNER_PLACEMENTS = [
  { id: 'before_products', label: 'Avant les articles' },
  { id: 'after_products', label: 'Après les articles' },
  { id: 'after_new', label: 'Après les nouveautés' },
  { id: 'bottom', label: 'En bas de page' },
] as const;

export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number]['id'];

export function isBannerPlacement(v: unknown): v is BannerPlacement {
  return BANNER_PLACEMENTS.some((p) => p.id === v);
}

/** Merchant-made block of the shop page. */
export interface StoreSection {
  id: string;
  type: 'products' | 'testimonials';
  title: string;
  subtitle: string;
  placement: BannerPlacement;
  /** type 'products': products shown (buyable) in this section. */
  productSlugs: string[];
  /** type 'testimonials': screenshots of real customer messages (Cloudinary). */
  images: string[];
}

export interface DirectPaymentMethod {
  id: string;
  /** e.g. « Wave Business », « Orange Money », « Free Money ». */
  name: string;
  /** Merchant payment link (https). */
  url: string;
  /** Optional QR code image (Cloudinary). */
  qrUrl: string | null;
}

export interface StorefrontSettings {
  published: boolean;
  tagline: string;
  coverUrl: string | null;
  accent: string;
  banners: StoreBanner[];
  sections: StoreSection[];
  /** Shop FAQ, shown just before the footer (incomplete entries are hidden). */
  faq: FaqItem[];
  codEnabled: boolean;
  /** JuulaPay online payments (optional, 7,5 % per payment). */
  onlinePaymentsEnabled: boolean;
  /** First-time guided setup finished. */
  setupDone: boolean;
  whatsappOrderEnabled: boolean;
  directPaymentMethods: DirectPaymentMethod[];
}

/** What a customer may use to pay, given the merchant's plan and options. */
export interface CheckoutOptions {
  /** JuulaPay online payment (Mobile Money / card) — only if the merchant enabled it. */
  online: boolean;
  /** Cash on delivery. */
  cod: boolean;
  /** Merchant's own links / QR codes; money goes straight to the merchant. */
  direct: DirectPaymentMethod[];
  /** Digits of the merchant's WhatsApp (wa.me) for « Commander sur WhatsApp », or null. */
  whatsapp: string | null;
}

// Button / badge colours of the shop (all readable with white text).
export const ACCENT_PRESETS = [
  { hex: '#235BF7', label: 'Bleu Juula' },
  { hex: '#1E3A8A', label: 'Bleu nuit' },
  { hex: '#0284C7', label: 'Bleu ciel' },
  { hex: '#0F766E', label: 'Turquoise' },
  { hex: '#16794A', label: 'Vert' },
  { hex: '#047857', label: 'Émeraude' },
  { hex: '#4D7C0F', label: 'Olive' },
  { hex: '#DB2777', label: 'Rose' },
  { hex: '#E0457B', label: 'Rose bonbon' },
  { hex: '#BE185D', label: 'Framboise' },
  { hex: '#C0607A', label: 'Vieux rose' },
  { hex: '#A21CAF', label: 'Fuchsia' },
  { hex: '#7C3AED', label: 'Violet' },
  { hex: '#6B2C5C', label: 'Prune' },
  { hex: '#DC2626', label: 'Rouge' },
  { hex: '#E4572E', label: 'Corail' },
  { hex: '#C2410C', label: 'Orange' },
  { hex: '#B4472E', label: 'Terracotta' },
  { hex: '#A16207', label: 'Or' },
  { hex: '#7C4A2D', label: 'Chocolat' },
  { hex: '#374151', label: 'Anthracite' },
  { hex: '#201D1D', label: 'Noir' },
] as const;

export const DEFAULT_ACCENT = '#235BF7';

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);
}
