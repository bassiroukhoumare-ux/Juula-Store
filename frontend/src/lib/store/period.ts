// Dashboard period filter: which orders the KPIs, charts and analytics use.
// Dakar is UTC+0 all year, so UTC day boundaries are local day boundaries.
import type { OrderLead } from '@/types/juula';

export type PeriodId = 'today' | '7d' | '30d' | '90d' | 'year' | 'custom';

/** Custom range picked in the calendar, as YYYY-MM-DD (both days included). */
export interface CustomDates {
  from: string;
  to: string;
}

export const PERIODS: { id: PeriodId; label: string; shortLabel: string }[] = [
  { id: 'today', label: 'Aujourd’hui', shortLabel: 'Jour' },
  { id: '7d', label: '7 derniers jours', shortLabel: 'Semaine' },
  { id: '30d', label: '30 derniers jours', shortLabel: 'Mois' },
  { id: '90d', label: '90 derniers jours', shortLabel: '90j' },
  { id: 'year', label: 'Cette année', shortLabel: 'Année' },
];

const CUSTOM_LABEL = 'Dates choisies';

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

function parseDay(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** YYYY-MM-DD of a date (UTC = Dakar time). */
export function toDayInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function periodRange(
  id: PeriodId,
  now: Date = new Date(),
  custom?: CustomDates | null,
): PeriodRange {
  const tomorrow = new Date(startOfDay(now).getTime() + DAY);
  if (id === 'custom' && custom) {
    const a = parseDay(custom.from);
    const b = parseDay(custom.to);
    if (a && b) {
      const [from, to] = a <= b ? [a, b] : [b, a];
      const start = from;
      const end = new Date(to.getTime() + DAY);
      const span = end.getTime() - start.getTime();
      return {
        id,
        label: CUSTOM_LABEL,
        start,
        end,
        previousStart: new Date(start.getTime() - span),
      };
    }
  }
  const safeId = id === 'custom' ? '30d' : id;
  const label = PERIODS.find((p) => p.id === safeId)?.label ?? '';
  let start: Date;
  if (safeId === 'today') start = startOfDay(now);
  else if (safeId === 'year') start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  else start = new Date(tomorrow.getTime() - Number.parseInt(safeId, 10) * DAY);
  const span = tomorrow.getTime() - start.getTime();
  return {
    id: safeId,
    label,
    start,
    end: tomorrow,
    previousStart: new Date(start.getTime() - span),
  };
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
  if (r.end.getTime() - r.start.getTime() <= DAY) return dayYearFmt.format(last);
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
