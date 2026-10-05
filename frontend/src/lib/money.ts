// Display currency for amounts. Every price is STORED and CHARGED in FCFA
// (XOF, integer); the merchant can choose to *display* amounts in FCFA,
// euros or US dollars (Paramètres). EUR uses the fixed CFA parity; USD uses
// a daily rate served by /api/fx.
//
// `formatFCFA` (lib/orderUtils) reads the active currency set here, so every
// existing call site follows the merchant's choice. The active currency is
// only ever changed in the browser (never during server rendering), so
// server-rendered HTML is always in FCFA.

export type DisplayCurrency = 'XOF' | 'EUR' | 'USD';

export const DISPLAY_CURRENCIES: { id: DisplayCurrency; label: string; symbol: string }[] = [
  { id: 'XOF', label: 'Franc CFA (FCFA)', symbol: 'FCFA' },
  { id: 'EUR', label: 'Euro (€)', symbol: '€' },
  { id: 'USD', label: 'Dollar américain ($)', symbol: '$' },
];

/** Fixed parity of the CFA franc. */
export const XOF_PER_EUR = 655.957;
/** Fallback when the live USD rate is unavailable. */
export const DEFAULT_XOF_PER_USD = 605;

let active: { currency: DisplayCurrency; xofPerUsd: number } = {
  currency: 'XOF',
  xofPerUsd: DEFAULT_XOF_PER_USD,
};

export function isDisplayCurrency(v: unknown): v is DisplayCurrency {
  return v === 'XOF' || v === 'EUR' || v === 'USD';
}

/** Browser-only: switch every formatted amount to `currency`. */
export function setDisplayCurrency(currency: DisplayCurrency, xofPerUsd?: number): void {
  active = {
    currency,
    xofPerUsd: xofPerUsd && xofPerUsd > 0 ? xofPerUsd : active.xofPerUsd,
  };
}

export function getDisplayCurrency(): DisplayCurrency {
  return active.currency;
}

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** XOF amount → value in the display currency. */
export function convertFromXof(
  amountXof: number,
  currency: DisplayCurrency = active.currency,
  xofPerUsd: number = active.xofPerUsd,
): number {
  if (currency === 'EUR') return amountXof / XOF_PER_EUR;
  if (currency === 'USD') return amountXof / xofPerUsd;
  return amountXof;
}

/** "32 000 FCFA" · "48,78 €" · "52,89 $" */
export function formatMoney(
  amountXof: number,
  currency: DisplayCurrency = active.currency,
  xofPerUsd?: number,
): string {
  if (amountXof === undefined || amountXof === null || Number.isNaN(amountXof)) amountXof = 0;
  if (currency === 'XOF') return `${groupThousands(Math.round(amountXof).toString())} FCFA`;
  const value = convertFromXof(amountXof, currency, xofPerUsd);
  const negative = value < 0;
  const [i, d] = Math.abs(value).toFixed(2).split('.');
  const text = `${negative ? '-' : ''}${groupThousands(i ?? '0')},${d}`;
  return currency === 'EUR' ? `${text} €` : `${text} $`;
}

/** Short axis label: "15K FCFA" → "15K", "1,2M"… in the display currency. */
export function formatMoneyCompact(
  amountXof: number,
  currency: DisplayCurrency = active.currency,
): string {
  const v = convertFromXof(amountXof, currency);
  const abs = Math.abs(v);
  const fmt = (n: number) => (Number.isInteger(n) ? n.toString() : n.toFixed(1).replace('.', ','));
  if (abs >= 1_000_000) return `${fmt(Math.round(v / 100_000) / 10)}M`;
  if (abs >= 1_000) return `${fmt(Math.round(v / 100) / 10)}K`;
  return currency === 'XOF' ? Math.round(v).toString() : v.toFixed(0);
}

/** Browser: activate `currency`, fetching the live USD rate when needed. */
export async function applyDisplayCurrency(currency: DisplayCurrency): Promise<void> {
  let rate: number | undefined;
  if (currency === 'USD') {
    try {
      const res = await fetch('/api/fx');
      const body = (await res.json()) as { xofPerUsd?: number };
      rate = body.xofPerUsd;
    } catch {
      // keep the previous / fallback rate
    }
  }
  setDisplayCurrency(currency, rate);
}
