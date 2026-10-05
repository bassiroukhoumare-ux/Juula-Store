// Shape of /api/store/analytics (shared by the server module and the dashboard).

export interface ProductStats {
  id: string;
  name: string;
  status: string;
  image: string | null;
  views: number;
  visitors: number;
  checkoutOpens: number;
  orders: number;
  revenue: number;
  /** Orders / unique visitors, in %. */
  conversionRate: number;
  abandoned: number;
}

export interface StoreAnalytics {
  totals: {
    views: number;
    visitors: number;
    checkoutOpens: number;
    orders: number;
    revenue: number;
    conversionRate: number;
    abandoned: number;
  };
  products: ProductStats[];
  countries: { code: string | null; label: string; visitors: number }[];
  sources: { source: string; label: string; visitors: number }[];
  abandoned: {
    id: string;
    productId: string;
    productName: string;
    customerName: string | null;
    phone: string | null;
    address: string | null;
    quantity: number;
    country: string | null;
    updatedAt: string;
  }[];
}
