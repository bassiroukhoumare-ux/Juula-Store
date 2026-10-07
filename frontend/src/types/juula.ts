import type { FaqItem, ProductComparison } from '@/lib/store/product-content';
import type { AnnouncementBar, CrossSell } from '@/lib/store/marketing';
import type { DirectPaymentMethod } from '@/lib/store/storefront-types';

export type DashboardTab =
  | 'cockpit'
  | 'kanban'
  | 'wallet'
  | 'products'
  | 'storefront'
  | 'notifications'
  | 'wizard'
  | 'customers'
  | 'analytics'
  | 'marketing'
  | 'settings';

export type OrderStatus = 'new' | 'confirmed' | 'delivered' | 'cancelled';
export type PaymentType =
  | 'cod'
  | 'online_momo'
  | 'online_wave'
  | 'online_orange'
  | 'direct'
  | 'whatsapp';
export type PaymentStatus =
  | 'paid'
  | 'pending_cod'
  | 'pending_online'
  | 'pending_direct'
  | 'paid_direct'
  | 'refunded'; // refunded to the customer after a dispute (/adminom)

export interface OrderLead {
  id: string;
  sequenceNumber?: number;
  customerName: string;
  phone: string;
  whatsappNumber: string;
  neighborhood: string;
  city: string;
  productName: string;
  productId?: string | undefined;
  productImage?: string;
  amount: number;
  deliveryFee?: number;
  totalAmount?: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  /** ISO timestamp (for date filters and charts); absent on locally simulated orders. */
  createdAtIso?: string | undefined;
  deliveryNotes?: string | undefined;
  deliveryAddress?: string | undefined;
  hasVoiceNote?: boolean | undefined;
  voiceNoteUrl?: string | undefined;
  quantity?: number | undefined;
  selectedColor?: string | undefined;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  /** paymentType 'direct': merchant's method name (e.g. « Wave Business »). */
  paymentMethodName?: string | undefined;
  /** Public checkout only: id of the merchant's direct payment link. */
  directMethodId?: string | undefined;
  /** Shop cart orders: one line per product. */
  items?: OrderItem[] | undefined;
  /** Public product page → order route: applied promo code and ticked suggestions. */
  promoCode?: string | undefined;
  extras?: { slug: string }[] | undefined;
  discountAmount?: number | undefined;
  /** Affiliate partner that brought the order, and its commission. */
  partnerName?: string | undefined;
  partnerCommission?: number | undefined;
}

export interface OrderItem {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  color: string | null;
  /** Set when bought at the « acheté ensemble » price. */
  originalUnitPrice?: number | undefined;
}

export interface KpiMetrics {
  todayVisits: {
    value: number;
    changePercent: number;
    target: number;
  };
  ordersBreakdown: {
    total: number;
    codCount: number;
    onlineCount: number;
    conversionRate: number;
    changePercent: number;
  };
  revenue: {
    total: number;
    codAmount: number;
    onlineAmount: number;
    currency: string;
    changePercent: number;
  };
  leadCredits: {
    remaining: number;
    total: number;
    plan: string;
  };
}

export interface InflowRecord {
  id: string;
  orderId: string;
  customerName: string;
  neighborhood: string;
  source: 'online_wave' | 'online_orange' | 'cod_cash';
  amount: number;
  date: string;
  /** received = paid but inside the 72h hold; confirmed = withdrawable; frozen = dispute. */
  status: 'received' | 'confirmed' | 'frozen';
  availableAt?: string;
}

export interface WalletState {
  availableBalance: number;
  todayRevenue?: number;
  monthRevenue?: number;
  codCollectedAmount?: number;
  pendingCodAmount: number;
  /** Paid online but still inside the payout hold (not yet withdrawable). */
  pendingOnlineAmount?: number;
  /** ISO date of the next hold release, if any. */
  nextReleaseAt?: string | null;
  payoutHoldHours?: number;
  /** Paid online but frozen by the administration (dispute in progress). */
  frozenAmount?: number;
  totalWithdrawn: number;
  currency: string;
  payoutHistory: PayoutRecord[];
  inflowHistory?: InflowRecord[];
}

export interface PayoutRecord {
  id: string;
  amount: number;
  provider: 'wave' | 'orange_money';
  phoneNumber: string;
  recipientName: string;
  date: string;
  status: 'completed' | 'processing' | 'failed';
  reference: string;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  isPrimary?: boolean;
}

export interface CustomerReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  city?: string;
}

export interface ProofItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  title: string;
  authorName: string;
  city?: string | undefined;
  duration?: string | undefined;
  thumbnailUrl?: string | undefined;
}

export interface QuantityDiscountTier {
  id: string;
  minQty: number; // e.g. 2, 3, 4
  discountType: 'percent' | 'fixed_price'; // either -10% or fixed unit price e.g. 22 000 F / piece
  discountValue: number; // e.g. 10 (%) or 22000 (FCFA per unit)
  label?: string; // e.g. "Pack Duo (2 pièces)", "Pack Famille (3 pièces)"
  isPopular?: boolean;
}

export type FunnelPageStatus = 'published' | 'draft' | 'inactive';

export interface FunnelPageItem {
  id: string;
  internalName: string; // Nom interne réservé à l'organisation du marchand
  status: FunnelPageStatus;
  createdAt: string;
  updatedAt: string;
  config: FunnelPageConfig;
  /** Set when the Juula administration disabled the product (reason shown to the merchant). */
  adminDisabled?: { reason: string | null } | null;
}

export interface FunnelPageConfig {
  id: string;
  internalName?: string;
  status?: FunnelPageStatus;
  storeName: string;
  storeCode: string;
  productTitle: string;
  slug: string;
  mediaItems: MediaItem[];
  videoUrl?: string;
  hasVideo: boolean;
  price: number;
  originalPrice: number;
  currency: string;
  discountPercent?: string;
  reviewScore?: string;
  guaranteeBadge?: string;
  deliveryFee: number;
  deliveryFree: boolean;
  deliveryPricingType?: 'free' | 'fixed';
  fixedDeliveryFee?: number;
  showUrgencyBadge: boolean;
  /** Urgency message on the sales page (empty → default viewers message). */
  urgencyText: string;
  /** Shows the urgency message (on unless explicitly turned off). */
  urgencyEnabled?: boolean | undefined;
  /** Injected at render time from the merchant's store (never stored). */
  storeLogoUrl?: string | null | undefined;
  /** Injected at render time (Pro): merchant's own payment links / QR codes. */
  directPaymentMethods?: DirectPaymentMethod[] | undefined;
  /** Injected at render time: JuulaPay online payment offered by the store. */
  onlinePaymentsEnabled?: boolean | undefined;
  /** Injected at render time (Pro, option on): wa.me digits for « Commander sur WhatsApp ». */
  whatsappOrderNumber?: string | null | undefined;
  /** Shop: category shown on the storefront (e.g. « Mode »). */
  category?: string | undefined;
  /** Shop: listed in the storefront catalogue (default true). */
  showInStore?: boolean | undefined;
  /** Shop: highlighted in « La sélection du moment ». */
  featured?: boolean | undefined;
  deliveryNotice: string;
  benefits: string[];
  /** Long description (≤ 2 000 words): **gras**, « - » lists, blank line = paragraph. */
  description?: string | undefined;
  /** Optional FAQ shown as an accordion (empty → hidden). */
  faqItems?: FaqItem[] | undefined;
  /** Optional « Nous vs Les autres » table. */
  comparison?: ProductComparison | undefined;
  /** « Souvent acheté avec » : 1–3 suggested products + bundle discount. */
  crossSell?: CrossSell | undefined;
  /** Injected at render time: the suggested products, priced when bought together. */
  crossSellProducts?:
    | {
        slug: string;
        title: string;
        image: string | null;
        price: number;
        bundlePrice: number;
        deliveryFee: number;
      }[]
    | undefined;
  /** Injected at render time: the shop announcement bar and accent colour. */
  storeAnnouncement?: AnnouncementBar | undefined;
  storeAccent?: string | undefined;
  ctaButtonText: string;
  codEnabled: boolean;
  mobileMoneyEnabled: boolean;
  reassuranceText: string;
  whatsappSupportNumber: string;
  proofScreenshots?: string[];
  proofItems?: ProofItem[];
  reviews?: CustomerReview[];
  quantityDiscountsEnabled?: boolean;
  quantityDiscounts?: QuantityDiscountTier[];
  stockQuantity?: number | undefined;
  showStockBadge?: boolean | undefined;
  availableColors?: ProductColorOption[] | undefined;
}

export interface ProductColorOption {
  id: string;
  name: string;
  hex: string;
}
