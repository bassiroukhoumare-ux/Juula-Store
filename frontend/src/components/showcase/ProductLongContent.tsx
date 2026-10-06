'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import {
  hasComparison,
  type ComparisonValue,
  type FaqItem,
  type ProductComparison,
} from '@/lib/store/product-content';

// ─────────────────────────────────────────────────────────────────────────
// Rich text: **gras**, lines starting with « - » / « • » / « 1. » become
// lists, a blank line starts a new paragraph. Built as React nodes — never
// injected as HTML.
// ─────────────────────────────────────────────────────────────────────────
function inline(text: string, key: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={`${key}-${i}`} className="font-bold text-[#201D1D]">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={`${key}-${i}`}>{part}</React.Fragment>
    ),
  );
}

/** Section title of the long-form area (sizes follow the `page` container). */
export const SECTION_TITLE =
  'text-[22px] leading-tight @3xl/page:text-[30px] font-extrabold tracking-[-0.02em] text-[#201D1D]';

/**
 * One block of the long-form area. Stacked on phones; from a wide `page`
 * container, title + short intro + action on the left and the content using
 * all the remaining width on the right (like a website section).
 */
export function PageSection({
  id,
  title,
  intro,
  aside,
  children,
}: {
  id: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  /** Extra element under the intro (rating, button…). */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid grid-cols-1 gap-4 @3xl/page:gap-6 @5xl/page:grid-cols-[300px_minmax(0,1fr)] @5xl/page:gap-14"
    >
      <div className="space-y-2 @5xl/page:sticky @5xl/page:top-24 @5xl/page:self-start">
        <h3 id={id} className={SECTION_TITLE}>
          {title}
        </h3>
        {intro && (
          <p className="text-[15px] @3xl/page:text-[17px] leading-relaxed text-[#7A808C]">
            {intro}
          </p>
        )}
        {aside && <div className="pt-2">{aside}</div>}
      </div>
      <div className="min-w-0 @container space-y-4">{children}</div>
    </section>
  );
}

const BULLET = /^\s*[-•*]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim() !== '');
  return (
    <>
      {blocks.map((block, b) => {
        const lines = block.split('\n').filter((l) => l.trim() !== '');
        const out: React.ReactNode[] = [];
        let para: string[] = [];
        let list: { ordered: boolean; items: string[] } | null = null;
        const flushPara = () => {
          if (para.length === 0) return;
          const lines2 = para;
          out.push(
            <p key={`p${b}-${out.length}`}>
              {lines2.map((l, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <br />}
                  {inline(l, `p${b}-${i}`)}
                </React.Fragment>
              ))}
            </p>,
          );
          para = [];
        };
        const flushList = () => {
          if (!list) return;
          const { ordered, items } = list;
          const Tag = ordered ? 'ol' : 'ul';
          out.push(
            <Tag
              key={`l${b}-${out.length}`}
              className={`space-y-1.5 pl-5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-[var(--accent,#235BF7)]`}
            >
              {items.map((it, i) => (
                <li key={i}>{inline(it, `l${b}-${i}`)}</li>
              ))}
            </Tag>,
          );
          list = null;
        };
        for (const line of lines) {
          const ordered = NUMBERED.test(line);
          if (BULLET.test(line) || ordered) {
            flushPara();
            if (!list || list.ordered !== ordered) {
              flushList();
              list = { ordered, items: [] };
            }
            list.items.push(line.replace(ordered ? NUMBERED : BULLET, ''));
          } else {
            flushList();
            para.push(line.trim());
          }
        }
        flushPara();
        flushList();
        return <React.Fragment key={b}>{out}</React.Fragment>;
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Description with « Lire la suite / Voir moins »
// ─────────────────────────────────────────────────────────────────────────
const COLLAPSED_PX = 300;

export function ProductDescription({ text }: { text: string | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(0);
  const [open, setOpen] = useState(false);
  const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;

  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setFull(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  if (!text || text.trim() === '') return null;
  const long = full > COLLAPSED_PX + 60;

  return (
    <PageSection
      id="desc-title"
      title="Description du produit"
      intro="Tout ce qu’il faut savoir avant de commander."
    >
      <div className="relative">
        <div
          ref={ref}
          style={{ maxHeight: long && !open ? COLLAPSED_PX : long ? full : undefined }}
          className="overflow-hidden transition-[max-height] duration-500 ease-out space-y-4 text-[16px] @3xl/page:text-[18px] leading-[1.75] text-[#3F4654]"
        >
          <RichText text={text} />
        </div>
        {long && !open && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#F6F7F9] to-transparent" />
        )}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-white border border-[#E3E7EE] text-[15px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] cursor-pointer"
        >
          {open ? 'Voir moins' : 'Lire la suite'}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </PageSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// « Nous vs Les autres »
// ─────────────────────────────────────────────────────────────────────────
function Cell({ value, ours }: { value: ComparisonValue; ours: boolean }) {
  if (value.kind === 'yes') {
    return (
      <span
        className={`inline-flex w-8 h-8 rounded-full items-center justify-center ${
          ours ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'
        }`}
        aria-label="Oui"
      >
        <Check className="w-4 h-4" strokeWidth={3} />
      </span>
    );
  }
  if (value.kind === 'no') {
    return (
      <span
        className="inline-flex w-8 h-8 rounded-full items-center justify-center bg-rose-50 text-rose-500"
        aria-label="Non"
      >
        <X className="w-4 h-4" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      className={`text-[15px] @3xl:text-[17px] leading-snug ${ours ? 'font-bold text-[#201D1D]' : 'text-[#7A808C]'}`}
    >
      {value.text}
    </span>
  );
}

export function ComparisonTable({ comparison }: { comparison: ProductComparison | undefined }) {
  if (!hasComparison(comparison)) return null;
  const { title, oursLabel, othersLabel, rows } = comparison;

  return (
    <PageSection
      id="cmp-title"
      title={title}
      intro="Comparez avant d’acheter : la différence se voit tout de suite."
    >
      {/* Wide: a real 3-column table, our column raised and outlined */}
      <div className="hidden @min-[30rem]:block">
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] items-stretch">
          <div />
          <div className="rounded-t-[20px] bg-[var(--accent,#235BF7)] text-white text-center px-3 py-4">
            <span className="text-[16px] @3xl:text-[18px] font-extrabold">{oursLabel}</span>
          </div>
          <div className="text-center px-3 py-4 text-[16px] @3xl:text-[18px] font-bold text-[#9AA0AB]">
            {othersLabel}
          </div>
          {rows.map((r, i) => {
            const last = i === rows.length - 1;
            return (
              <React.Fragment key={r.id}>
                <div
                  className={`flex items-center py-4 pr-4 text-[16px] @3xl:text-[17px] font-semibold text-[#201D1D] ${last ? '' : 'border-b border-[#ECEFF4]'}`}
                >
                  {r.criterion}
                </div>
                <div
                  className={`flex items-center justify-center text-center px-3 py-4 bg-[#F3F6FF] border-x-2 border-[var(--accent,#235BF7)] ${last ? 'border-b-2 rounded-b-[20px]' : 'border-b border-b-[#DCE5FF]'}`}
                >
                  <Cell value={r.ours} ours />
                </div>
                <div
                  className={`flex items-center justify-center text-center px-3 py-4 ${last ? '' : 'border-b border-[#ECEFF4]'}`}
                >
                  <Cell value={r.others} ours={false} />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Narrow (phones): one card per criterion, no sideways scroll */}
      <div className="@min-[30rem]:hidden space-y-2.5">
        <div className="grid grid-cols-2 gap-2 text-center text-[15px] font-extrabold">
          <span className="py-2.5 px-2 rounded-xl bg-[var(--accent,#235BF7)] text-white">
            {oursLabel}
          </span>
          <span className="py-2.5 px-2 rounded-xl bg-[#F1F3F6] text-[#7A808C]">{othersLabel}</span>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl bg-white border border-[#ECEFF4] p-3.5 space-y-3">
            <p className="text-[16px] font-bold text-[#201D1D] text-center">{r.criterion}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-h-14 flex items-center justify-center text-center p-2.5 rounded-xl bg-[#F3F6FF] ring-2 ring-[var(--accent,#235BF7)]">
                <Cell value={r.ours} ours />
              </div>
              <div className="min-h-14 flex items-center justify-center text-center p-2.5 rounded-xl bg-[#F6F7F9]">
                <Cell value={r.others} ours={false} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FAQ accordion (first question open)
// ─────────────────────────────────────────────────────────────────────────
/** The accordion alone (used by the product page and the shop). */
export function FaqList({ items }: { items: FaqItem[] | undefined }) {
  const list = (items ?? []).filter((x) => x.question.trim() && x.answer.trim());
  const [open, setOpen] = useState<string | null>(list[0]?.id ?? null);
  if (list.length === 0) return null;
  return (
    <div className="space-y-2.5 @3xl:space-y-3">
      {list.map((x) => {
        const on = open === x.id;
        return (
          <div
            key={x.id}
            className={`rounded-2xl border bg-white transition-colors ${on ? 'border-black/15' : 'border-[#ECEFF4]'}`}
          >
            <h4>
              <button
                type="button"
                onClick={() => setOpen(on ? null : x.id)}
                aria-expanded={on}
                aria-controls={`faq-${x.id}`}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 @3xl/page:py-5 text-left cursor-pointer"
              >
                <span className="text-[16px] @3xl/page:text-[18px] font-bold text-[#201D1D]">
                  {x.question}
                </span>
                <span
                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    on
                      ? 'bg-[var(--accent,#235BF7)] text-white rotate-180'
                      : 'bg-[#F1F3F6] text-[#3F4654]'
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </span>
              </button>
            </h4>
            <div
              id={`faq-${x.id}`}
              role="region"
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 space-y-3 text-[15px] @3xl/page:text-[17px] leading-relaxed text-[#3F4654]">
                  <RichText text={x.answer} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FaqAccordion({ items }: { items: FaqItem[] | undefined }) {
  if (!(items ?? []).some((x) => x.question.trim() && x.answer.trim())) return null;
  return (
    <PageSection
      id="faq-title"
      title="Questions fréquentes"
      intro="Les réponses aux questions qu’on nous pose le plus."
    >
      <FaqList items={items} />
    </PageSection>
  );
}
