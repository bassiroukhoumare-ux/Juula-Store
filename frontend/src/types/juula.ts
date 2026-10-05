export type DashboardTab =
  | 'cockpit'
  | 'kanban'
  | 'wallet'
  | 'wizard'
  | 'customers'
  | 'analytics'
  | 'settings';

export type OrderStatus = 'new' | 'confirmed' | 'delivered' | 'cancelled';
export type PaymentType = 'cod' | 'online_wave' | 'online_orange';
export type PaymentStatus = 'paid' | 'pending_cod' | 'pending_online';

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
  /** received = paid but inside the 72h hold; confirmed = withdrawable. */
  status: 'received' | 'confirmed';
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
  deliveryNotice: string;
  benefits: string[];
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
