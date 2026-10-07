#!/usr/bin/env node
// Generates src/app/dash-dark.css — the dark theme of the merchant dashboard.
//
// The dashboard is styled with hard-coded light colours (bg-white,
// text-[#201D1D], border-[#ECEFF4]…). Instead of rewriting every component,
// this script scans the colour utilities they use and emits a dark
// equivalent for each, active only under <html class="juula-dark">.
// Anything inside `.juula-light` (storefront previews) keeps its colours.
//
//   node scripts/generate-dark-theme.mjs     (re-run after adding colours)
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN = [
  'src/components/dashboard',
  'src/components/ui',
  'src/components/store',
  'src/app/dashboard',
  'src/app/settings',
];
const OUT = path.join(ROOT, 'src/app/dash-dark.css');

// Tailwind palette (the shades the dashboard uses).
const PALETTE = {
  white: '#ffffff',
  black: '#000000',
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  zinc: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  yellow: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  violet: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
};

// Dark palette
const D = {
  page: '#0B0F17',
  card: '#161F30',
  soft: '#1E293B',
  softer: '#26324A',
  strong: '#3B4A63', // was the near-black « ink » buttons
  title: '#F8FAFC',
  body: '#CBD5E1',
  muted: '#94A3B8',
  faint: '#7C8BA1',
  line: 'rgba(255, 255, 255, 0.10)',
};

// Page backgrounds of the dashboard (behind the cards).
const PAGE_BG = ['#EDEFF3', '#F2F4F7', '#EEF0F4'];

const hexToRgb = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const rgbToHex = (rgb) =>
  '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
function hsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { s, l };
}
const mix = (rgb, to, t) => rgb.map((v, i) => v + (to[i] - v) * t);
/** Pure hue of a (pale) tint: #EEF3FF → a vivid blue. */
function vivid(rgb) {
  const mn = Math.min(...rgb);
  const mx = Math.max(...rgb);
  return rgb.map((v) => ((v - mn) / (mx - mn || 1)) * 255 * 0.85 + 30);
}
const rgba = (rgb, a) => `rgba(${rgb.map(Math.round).join(', ')}, ${a})`;

function resolveColor(token) {
  const m = token.match(/^\[(#[0-9a-fA-F]{3,8})\]$/);
  if (m) return m[1].slice(0, 7);
  if (token === 'white' || token === 'black') return PALETTE[token];
  const n = token.match(/^([a-z]+)-(\d{2,3})$/);
  if (n && PALETTE[n[1]]?.[n[2]]) return PALETTE[n[1]][n[2]];
  return null;
}

function darkFor(kind, hex, alpha) {
  const rgb = hexToRgb(hex);
  const { s, l } = hsl(rgb);
  // Chroma (not HSL saturation, which explodes for near-white tints).
  const chroma = (Math.max(...rgb) - Math.min(...rgb)) / 255;
  const neutral = chroma < 0.055 || (s < 0.18 && chroma < 0.12);
  const a = alpha ?? 1;
  if (kind === 'bg') {
    if (PAGE_BG.includes(hex.toUpperCase())) return D.page;
    if (l >= 0.995) return alpha !== undefined ? rgba(hexToRgb(D.card), a) : D.card;
    if (l > 0.86) {
      if (neutral) {
        const v = l > 0.955 ? D.soft : D.softer;
        return alpha !== undefined ? rgba(hexToRgb(v), a) : v;
      }
      return rgba(vivid(rgb), 0.16 * a); // tinted chip (blue / green / red / amber…)
    }
    if (l < 0.2 && neutral) return alpha !== undefined ? rgba(hexToRgb(D.strong), a) : D.strong;
    return null; // brand / saturated fills stay as they are
  }
  if (kind === 'text' || kind === 'placeholder' || kind === 'fill' || kind === 'stroke') {
    if (neutral || s < 0.3) {
      if (l < 0.2) return kind === 'placeholder' ? D.faint : D.title;
      if (l < 0.45) return D.body;
      if (l < 0.62) return D.muted;
      if (l < 0.8) return D.faint;
      return null; // light text on dark fills stays light
    }
    if (l > 0.75) return null;
    return rgbToHex(mix(rgb, [255, 255, 255], 0.38)); // brighter accent for contrast
  }
  // border / divide / ring / outline
  if (l > 0.82) {
    if (neutral)
      return alpha !== undefined
        ? `rgba(255, 255, 255, ${Math.min(0.14, 0.1 * a + 0.02)})`
        : D.line;
    return rgba(vivid(rgb), 0.35);
  }
  if (l < 0.2 && neutral) return 'rgba(255, 255, 255, 0.28)';
  return null;
}

const PROP = {
  bg: (c) => `background-color: ${c} !important;`,
  text: (c) => `color: ${c} !important;`,
  placeholder: (c) => `color: ${c} !important;`,
  fill: (c) => `fill: ${c} !important;`,
  stroke: (c) => `stroke: ${c} !important;`,
  border: (c) => `border-color: ${c} !important;`,
  divide: (c) => `border-color: ${c} !important;`,
  ring: (c) => `--tw-ring-color: ${c} !important;`,
  outline: (c) => `outline-color: ${c} !important;`,
};
const BORDER_SIDES = [
  'border',
  'border-t',
  'border-b',
  'border-l',
  'border-r',
  'border-x',
  'border-y',
];
const MEDIA = { sm: '40rem', md: '48rem', lg: '64rem', xl: '80rem', '2xl': '96rem' };
const PSEUDO = {
  hover: ':hover',
  focus: ':focus',
  'focus-visible': ':focus-visible',
  'focus-within': ':focus-within',
  active: ':active',
  disabled: ':disabled',
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}

const esc = (cls) => cls.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
const UTIL =
  /(?<![\w-])((?:[a-z0-9-]+:)*)(bg|text|placeholder|fill|stroke|border(?:-[tblrxy])?|divide|ring|outline)-((?:\[#[0-9a-fA-F]{3,8}\])|white|black|(?:[a-z]+-\d{2,3}))(?:\/(\d{1,3}))?(?![\w\]-])/g;

const found = new Set();
for (const dir of SCAN) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of walk(abs)) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(UTIL)) found.add(m[0]);
  }
}

const rules = new Map(); // media -> lines
let count = 0;
for (const cls of [...found].sort()) {
  const m = cls.match(
    /^((?:[a-z0-9-]+:)*)([a-z-]+?)-((?:\[#[0-9a-fA-F]{3,8}\])|white|black|(?:[a-z]+-\d{2,3}))(?:\/(\d{1,3}))?$/,
  );
  if (!m) continue;
  const [, variantStr, rawKind, colorTok, alphaStr] = m;
  const kind = BORDER_SIDES.includes(rawKind) ? 'border' : rawKind;
  if (!PROP[kind]) continue;
  const hex = resolveColor(colorTok);
  if (!hex) continue;
  const alpha = alphaStr ? Number(alphaStr) / 100 : undefined;
  const dark = darkFor(kind, hex, alpha);
  if (!dark) continue;

  const variants = variantStr ? variantStr.slice(0, -1).split(':') : [];
  let media = '';
  let pseudo = '';
  let group = '';
  let placeholderVariant = kind === 'placeholder';
  let skip = false;
  for (const v of variants) {
    if (MEDIA[v]) media = MEDIA[v];
    else if (PSEUDO[v]) pseudo += PSEUDO[v];
    else if (v === 'group-hover') group = '.group:hover ';
    else if (v === 'placeholder') placeholderVariant = true;
    else skip = true; // dark:, data-*, etc.
  }
  if (skip) continue;
  // The preview exclusion applies to the element itself (before any
  // pseudo-element such as ::placeholder, which must come last).
  let sel = `.${esc(cls)}${pseudo}:not(.juula-light, .juula-light *)`;
  if (kind === 'divide') sel = `${sel} > :not(:last-child)`;
  if (placeholderVariant) sel = `${sel}::placeholder`;
  const scoped = `html.juula-dark ${group}${sel}`;
  const line = `${scoped} { ${PROP[kind](dark)} }`;
  if (!rules.has(media)) rules.set(media, []);
  rules.get(media).push(line);
  count++;
}

let css = `/* GENERATED by scripts/generate-dark-theme.mjs — do not edit by hand. */
/* Dark theme of the merchant dashboard (html.juula-dark), ${count} colour rules. */

html.juula-dark {
  color-scheme: dark;
  background-color: ${D.page};
}
/* Smooth switch (class set for ~350 ms by the theme hook). */
html.juula-theme-anim *,
html.juula-theme-anim *::before,
html.juula-theme-anim *::after {
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease,
    fill 0.3s ease !important;
}
html.juula-dark body {
  background-color: ${D.page};
  color: ${D.body};
}
html.juula-dark .juula-dash-root:not(.juula-light) {
  background-color: ${D.page} !important;
}
/* Official logo (dark ink) → white on dark. */
html.juula-dark img[src='/logo-juula.svg']:not(.juula-light *) {
  filter: brightness(0) invert(1);
}
html.juula-dark :is(input, textarea, select):not(.juula-light *) {
  caret-color: ${D.title};
}
html.juula-dark :is(input, textarea, select):not(.juula-light *)::placeholder {
  color: ${D.faint};
}
html.juula-dark ::-webkit-scrollbar-thumb {
  background-color: #334155;
}

`;
for (const [media, lines] of [...rules.entries()].sort((a, b) => (a[0] ? 1 : 0) - (b[0] ? 1 : 0))) {
  if (!media) css += lines.join('\n') + '\n';
  else css += `\n@media (min-width: ${media}) {\n  ${lines.join('\n  ')}\n}\n`;
}
fs.writeFileSync(OUT, css);
console.log(`dash-dark.css: ${count} rules from ${found.size} colour utilities`);
