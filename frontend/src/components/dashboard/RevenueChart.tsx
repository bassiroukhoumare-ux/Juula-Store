'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { OrderLead } from '@/types/juula';
import { formatMoney, formatMoneyCompact } from '@/lib/money';
import type { PeriodRange } from '@/lib/store/period';

interface RevenueChartProps {
  /** Orders of the selected period (already filtered). */
  orders: OrderLead[];
  /** Orders of the previous period of the same length. */
  previousOrders: OrderLead[];
  range: PeriodRange;
  height?: number;
}

type Bucket = {
  start: number;
  label: string;
  tooltip: string;
  value: number;
  prev: number;
  count: number;
};

const DAY = 86_400_000;
const shortDay = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Dakar',
});
const longDay = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  timeZone: 'Africa/Dakar',
});
const monthFmt = new Intl.DateTimeFormat('fr-FR', {
  month: 'short',
  year: 'numeric',
  timeZone: 'Africa/Dakar',
});

const amountOf = (o: OrderLead) => (o.status === 'cancelled' ? 0 : (o.totalAmount ?? o.amount));
const timeOf = (o: OrderLead) => (o.createdAtIso ? Date.parse(o.createdAtIso) : NaN);

const HOUR = 3_600_000;

/** ~7–14 points whatever the period, so the curve stays readable. */
function stepFor(span: number): number {
  if (span <= DAY + 1) return 2 * HOUR; // today: 12 points
  if (span <= 14 * DAY) return DAY; // 7 days: daily
  if (span <= 45 * DAY) return 3 * DAY; // 30 days: 10 points
  if (span <= 120 * DAY) return 7 * DAY; // 90 days: weekly
  return 28 * DAY; // year: ~monthly
}

function buildBuckets(orders: OrderLead[], previous: OrderLead[], range: PeriodRange): Bucket[] {
  const span = range.end.getTime() - range.start.getTime();
  const step = stepFor(span);
  const n = Math.max(1, Math.ceil(span / step));
  const start = range.start.getTime();
  const buckets: Bucket[] = Array.from({ length: n }, (_, i) => {
    const t = start + i * step;
    const d = new Date(t);
    const last = new Date(Math.min(t + step, range.end.getTime()) - 1);
    const label =
      step < DAY
        ? `${d.getUTCHours()}h`
        : step === 28 * DAY
          ? monthFmt.format(d)
          : shortDay.format(d);
    const tooltip =
      step < DAY
        ? `${d.getUTCHours()}h – ${d.getUTCHours() + step / HOUR}h`
        : step === DAY
          ? longDay.format(d)
          : `${shortDay.format(d)} – ${shortDay.format(last)}`;
    return { start: t, label, tooltip, value: 0, prev: 0, count: 0 };
  });
  const prevOffset = span;
  for (const o of orders) {
    const t = timeOf(o);
    if (Number.isNaN(t)) continue;
    const i = Math.min(n - 1, Math.floor((t - start) / step));
    if (i >= 0) {
      buckets[i]!.value += amountOf(o);
      buckets[i]!.count += 1;
    }
  }
  for (const o of previous) {
    const t = timeOf(o);
    if (Number.isNaN(t)) continue;
    const i = Math.min(n - 1, Math.floor((t + prevOffset - start) / step));
    if (i >= 0) buckets[i]!.prev += amountOf(o);
  }
  return buckets;
}

/** Smooth path (monotone cubic) through points. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0]![0]} ${pts[0]![1]}`;
  let d = `M ${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1] ?? pts[i]!;
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[i + 1]!;
    const [x3, y3] = pts[i + 2] ?? pts[i + 1]!;
    const t = 0.2;
    const c1x = x1 + (x2 - x0) * t;
    let c1y = y1 + (y2 - y0) * t;
    const c2x = x2 - (x3 - x1) * t;
    let c2y = y2 - (y3 - y1) * t;
    // Keep the curve between the two points (no overshoot below zero).
    const lo = Math.min(y1, y2);
    const hi = Math.max(y1, y2);
    c1y = Math.min(Math.max(c1y, lo), hi);
    c2y = Math.min(Math.max(c2y, lo), hi);
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
  }
  return d;
}

function niceMax(v: number): number {
  if (v <= 0) return 15_000;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 3, 5, 10]) if (m * exp >= v * 1.1) return m * exp;
  return 10 * exp;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  orders,
  previousOrders,
  range,
  height = 240,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const buckets = useMemo(
    () => buildBuckets(orders, previousOrders, range),
    [orders, previousOrders, range],
  );
  const max = niceMax(Math.max(...buckets.map((b) => Math.max(b.value, b.prev))));
  const empty = buckets.every((b) => b.value === 0 && b.prev === 0);

  const padL = 44;
  const padR = 12;
  const padT = 14;
  const padB = 30;
  const w = width;
  const h = height;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const x = (i: number) =>
    padL + (buckets.length === 1 ? innerW / 2 : (i / (buckets.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const cur = buckets.map((b, i) => [x(i), y(b.value)] as [number, number]);
  const prev = buckets.map((b, i) => [x(i), y(b.prev)] as [number, number]);
  const line = smoothPath(cur);
  const area = `${line} L ${x(buckets.length - 1)} ${padT + innerH} L ${x(0)} ${padT + innerH} Z`;
  const prevLine = smoothPath(prev);

  const ticks = [0, 1 / 3, 2 / 3, 1].map((f) => max * f);
  const labelEvery = Math.max(1, Math.ceil(buckets.length / Math.max(2, Math.floor(innerW / 90))));

  const onMove = (e: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
    const rel = (clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(buckets.length - 1, Math.round(rel * (buckets.length - 1)))));
  };

  const hb = hover !== null ? buckets[hover] : null;
  const hx = hover !== null ? x(hover) : 0;

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <svg
        width={w}
        height={h}
        className="block overflow-visible"
        role="img"
        aria-label="Évolution du chiffre d’affaires"
      >
        <defs>
          <linearGradient id="rev-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#235BF7" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#235BF7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid + Y labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={w - padR}
              y1={y(t)}
              y2={y(t)}
              stroke={i === 0 ? '#E3E7EE' : '#EEF0F4'}
              strokeDasharray={i === 0 ? undefined : '4 5'}
            />
            <text
              x={padL - 10}
              y={y(t) + 4}
              textAnchor="end"
              fontSize="12"
              fill="#9AA0AB"
              fontWeight="500"
            >
              {formatMoneyCompact(t)}
            </text>
          </g>
        ))}

        {/* X labels */}
        {buckets.map((b, i) =>
          i % labelEvery === 0 || i === buckets.length - 1 ? (
            <text
              key={b.start}
              x={x(i)}
              y={h - 8}
              textAnchor={i === 0 ? 'start' : i === buckets.length - 1 ? 'end' : 'middle'}
              fontSize="12"
              fill="#9AA0AB"
              fontWeight="500"
            >
              {b.label}
            </text>
          ) : null,
        )}

        {/* Previous period (dotted) */}
        {!empty && (
          <path
            d={prevLine}
            fill="none"
            stroke="#B7BEC9"
            strokeWidth="2"
            strokeDasharray="3 5"
            strokeLinecap="round"
          />
        )}

        {/* Current period: area + line (draws on mount) */}
        <path d={area} fill="url(#rev-area)" className="motion-safe:animate-[rise_900ms_ease]" />
        <path
          key={line}
          d={line}
          fill="none"
          stroke="#235BF7"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
          style={{ animation: 'draw 1.2s cubic-bezier(.4,0,.2,1) forwards' }}
        />

        {/* Hover */}
        {hb && (
          <g pointerEvents="none">
            <line
              x1={hx}
              x2={hx}
              y1={padT}
              y2={padT + innerH}
              stroke="#235BF7"
              strokeOpacity="0.25"
              strokeDasharray="3 4"
            />
            <circle cx={hx} cy={y(hb.value)} r="6" fill="#fff" stroke="#235BF7" strokeWidth="3" />
          </g>
        )}
        <rect
          x={padL}
          y={padT}
          width={innerW}
          height={innerH}
          fill="transparent"
          onMouseMove={onMove}
          onTouchMove={onMove}
          onTouchStart={onMove}
          onMouseLeave={() => setHover(null)}
          className="cursor-crosshair"
        />
      </svg>

      {hb && (
        <div
          className="absolute top-0 z-10 pointer-events-none rounded-2xl bg-[#201D1D] text-white px-3.5 py-2.5 shadow-xl text-sm whitespace-nowrap"
          style={{
            left: hx,
            transform: `translateX(${hx > w * 0.7 ? '-105%' : hx < w * 0.3 ? '5%' : '-50%'})`,
          }}
        >
          <p className="text-white/60 text-[13px] capitalize">{hb.tooltip}</p>
          <p className="font-bold text-base">{formatMoney(hb.value)}</p>
          <p className="text-white/70 text-[13px]">
            {hb.count} commande{hb.count > 1 ? 's' : ''} · période préc. {formatMoney(hb.prev)}
          </p>
        </div>
      )}

      {empty && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center pointer-events-none">
          <p className="inline-block px-4 py-2 rounded-xl bg-white/90 border border-[#ECEFF4] text-[15px] text-[#7A808C]">
            Vos ventes s’afficheront ici dès votre première commande.
          </p>
        </div>
      )}

      <div className="mt-2 flex items-center gap-5 text-sm text-[#7A808C]">
        <span className="flex items-center gap-2">
          <span className="w-4 h-[3px] rounded-full bg-[#235BF7]" /> {range.label}
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 border-t-2 border-dotted border-[#B7BEC9]" /> Période précédente
        </span>
      </div>
    </div>
  );
};
