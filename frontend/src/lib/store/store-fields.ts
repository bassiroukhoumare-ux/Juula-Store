// Store-wide fields: set once by the merchant (Paramètres) and shared by all
// their product pages. The dashboard applies them to every product on save;
// the server copies them into each newly created product.
import type { FunnelPageConfig } from '@/types/juula';

export const STORE_WIDE_FIELDS = [
  'storeName',
  'storeCode',
  'whatsappSupportNumber',
  'deliveryFee',
  'deliveryFree',
  'deliveryPricingType',
  'fixedDeliveryFee',
  'deliveryNotice',
  'codEnabled',
  'mobileMoneyEnabled',
  'reassuranceText',
] as const satisfies readonly (keyof FunnelPageConfig)[];

export function pickStoreWide(config: FunnelPageConfig): Partial<FunnelPageConfig> {
  const out: Record<string, unknown> = {};
  for (const key of STORE_WIDE_FIELDS) {
    if (config[key] !== undefined) out[key] = config[key];
  }
  return out as Partial<FunnelPageConfig>;
}
