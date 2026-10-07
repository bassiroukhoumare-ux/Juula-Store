'use client';

import React, { useEffect, useId, useState } from 'react';

// Theme tokens (light / dark) used by every /adminom component.
export const THEMES = {
  light: {
    '--a-bg': '#EEF1F5',
    '--a-surface': '#FFFFFF',
    '--a-soft': '#F5F7FA',
    '--a-text': '#0F172A',
    '--a-muted': '#64748B',
    '--a-border': '#E5E9F0',
  },
  dark: {
    '--a-bg': '#0A0E16',
    '--a-surface': '#121826',
    '--a-soft': '#1A2233',
    '--a-text': '#F1F5F9',
    '--a-muted': '#94A3B8',
    '--a-border': '#232C3D',
  },
} as const;

export const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
export const fShort = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;

export const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
export const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** GET/POST to /api/adminom/* (mutations carry the x-adminom header). */
export async function adminFetch<T>(
  url: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: {
      ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.method && init.method !== 'GET' ? { 'x-adminom': '1' } : {}),
    },
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (res.status === 401) {
    window.location.reload();
    throw new Error('Session expirée.');
  }
  if (!res.ok || !body) throw new Error(body?.message ?? 'Le chargement a échoué.');
  return body;
}

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children,
}) => (
  <section
    className={`rounded-[26px] bg-[var(--a-surface)] border border-[var(--a-border)] p-5 sm:p-6 ${className}`}
  >
    {children}
  </section>
);

export const IconBubble: React.FC<{ tone: string; children: React.ReactNode }> = ({
  tone,
  children,
}) => (
  <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${tone}`}>
    {children}
  </span>
);

export const Kpi: React.FC<{
  label: string;
  value: string;
  hint: React.ReactNode;
  icon: React.ReactNode;
  tone: string;
  valueClass?: string;
}> = ({ label, value, hint, icon, tone, valueClass = '' }) => (
  <Card className="!p-4 sm:!p-5">
    <div className="flex items-start justify-between gap-2">
      <p className="text-[13px] font-semibold text-[var(--a-muted)]">{label}</p>
      <IconBubble tone={tone}>{icon}</IconBubble>
    </div>
    <p
      className={`mt-1 text-[22px] sm:text-[26px] font-extrabold tabular-nums leading-tight ${valueClass}`}
    >
      {value}
    </p>
    <p className="mt-1 text-[12px] sm:text-[13px] text-[var(--a-muted)]">{hint}</p>
  </Card>
);

export const Badge: React.FC<{
  tone: 'green' | 'amber' | 'red' | 'blue' | 'grey' | 'violet';
  children: React.ReactNode;
}> = ({ tone, children }) => {
  const cls = {
    green: 'bg-emerald-500/12 text-emerald-600 border-emerald-500/25',
    amber: 'bg-amber-500/12 text-amber-600 border-amber-500/25',
    red: 'bg-rose-500/12 text-rose-600 border-rose-500/25',
    blue: 'bg-sky-500/12 text-sky-600 border-sky-500/25',
    violet: 'bg-violet-500/12 text-violet-600 border-violet-500/25',
    grey: 'bg-slate-500/10 text-[var(--a-muted)] border-[var(--a-border)]',
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[12px] font-bold whitespace-nowrap ${cls}`}
    >
      {children}
    </span>
  );
};

/** Smooth area chart (SVG), green gradient. */
export const AreaChart: React.FC<{ series: { day: string; value: number }[]; color?: string }> = ({
  series,
  color = '#10B981',
}) => {
  const gid = useId().replace(/:/g, '');
  const W = 600;
  const H = 180;
  const max = Math.max(1, ...series.map((s) => s.value));
  const step = series.length > 1 ? W / (series.length - 1) : W;
  const pts = series.map((s, i) => [i * step, H - 8 - (s.value / max) * (H - 24)] as const);
  const line = pts
    .map(([x, y], i) => {
      if (i === 0) return `M${x},${y}`;
      const [px, py] = pts[i - 1]!;
      const cx = (px + x) / 2;
      return `C${cx},${py} ${cx},${y} ${x},${y}`;
    })
    .join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const first = series[0]?.day;
  const last = series[series.length - 1]?.day;
  const short = (d?: string) =>
    d
      ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(d))
      : '';
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-44"
        role="img"
        aria-label="Graphique des recettes"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={H * f}
            y2={H * f}
            stroke="var(--a-border)"
            strokeDasharray="4 6"
          />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[12px] text-[var(--a-muted)]">
        <span>{short(first)}</span>
        <span>{short(last)}</span>
      </div>
    </div>
  );
};

export const Pill: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({
  on,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`shrink-0 h-9 sm:h-10 px-3 sm:px-4 rounded-full text-[13px] sm:text-[14px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
      on
        ? 'bg-[var(--a-text)] text-[var(--a-bg)]'
        : 'bg-[var(--a-surface)] text-[var(--a-muted)] border border-[var(--a-border)] hover:text-[var(--a-text)]'
    }`}
  >
    {children}
  </button>
);

export const Loading: React.FC = () => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Chargement" role="status">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="h-32 rounded-[26px] bg-[var(--a-surface)] border border-[var(--a-border)] animate-pulse"
      />
    ))}
  </div>
);

/** Loads `url` whenever it (or the refresh tick) changes. */
export function useAdminData<T>(
  url: string,
  tick: number,
): { data: T | null; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setError(null);
    adminFetch<T>(url)
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'Erreur'));
    return () => {
      alive = false;
    };
  }, [url, tick]);
  return { data, error };
}

export const ErrorBox: React.FC<{ error: string }> = ({ error }) => (
  <Card className="text-center text-rose-500 font-semibold">{error}</Card>
);

export const SearchBox: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full sm:max-w-sm h-11 px-4 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] text-[15px] focus:outline-none focus:border-[#235BF7]"
  />
);

export function useDebounced(v: string, ms = 300): string {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

/** True when the viewport is at least `px` wide (layout switches done in JS). */
export function useMinWidth(px: number): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const q = window.matchMedia(`(min-width: ${px}px)`);
    const update = () => setMatch(q.matches);
    update();
    q.addEventListener('change', update);
    return () => q.removeEventListener('change', update);
  }, [px]);
  return match;
}
