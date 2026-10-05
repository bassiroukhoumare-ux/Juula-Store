// Dashboard period filter: which orders the KPIs, charts and analytics use.
// Dakar is UTC+0 all year, so UTC day boundaries are local day boundaries.
import type { OrderLead } from '@/types/juula';

export type PeriodId = 'today' | '7d' | '30d' | '90d' | 'year';

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: 'today', label: 'Aujourd’hui' },
  { id: '7d', label: '7 derniers jours' },
  { id: '30d', label: '30 derniers jours' },
  { id: '90d', label: '90 derniers jours' },
  { id: 'year', label: 'Cette année' },
];

export interface PeriodRange {
  id: PeriodId;
  label: string;
  start: Date;
  end: Date;
  /** Same-length window right before `start`. */
  previousStart: Date;
}

const DAY = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function periodRange(id: PeriodId, now: Date = new Date()): PeriodRange {
  const label = PERIODS.find((p) => p.id === id)?.label ?? '';
  const tomorrow = new Date(startOfDay(now).getTime() + DAY);
  let start: Date;
  if (id === 'today') start = startOfDay(now);
  else if (id === 'year') start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  else start = new Date(tomorrow.getTime() - Number.parseInt(id, 10) * DAY);
  const span = tomorrow.getTime() - start.getTime();
  return { id, label, start, end: tomorrow, previousStart: new Date(start.getTime() - span) };
}

const dayFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Dakar',
});
const dayYearFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Africa/Dakar',
});

/** "5 sept. – 4 oct. 2026" (or "4 oct. 2026" for today). */
export function rangeLabel(r: PeriodRange): string {
  const last = new Date(r.end.getTime() - 1);
  if (r.id === 'today') return dayYearFmt.format(last);
  return `${dayFmt.format(r.start)} – ${dayYearFmt.format(last)}`;
}

function inWindow(o: OrderLead, from: Date, to: Date): boolean {
  if (!o.createdAtIso) return false;
  const t = Date.parse(o.createdAtIso);
  return t >= from.getTime() && t < to.getTime();
}

export function ordersInPeriod(orders: OrderLead[], r: PeriodRange): OrderLead[] {
  return orders.filter((o) => inWindow(o, r.start, r.end));
}

export function ordersInPreviousPeriod(orders: OrderLead[], r: PeriodRange): OrderLead[] {
  return orders.filter((o) => inWindow(o, r.previousStart, r.start));
}
