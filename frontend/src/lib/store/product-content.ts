// Long-form product content: rich description, FAQ and the « Nous vs Les
// autres » comparison table. Stored inside the product's JSON config; shared
// by the editor, the server validation and the public product page.

export const DESCRIPTION_MAX_WORDS = 2000;
/** Hard cap on characters, above 2 000 long words so the word limit applies first. */
export const DESCRIPTION_MAX_CHARS = 20_000;
export const FAQ_MAX_ITEMS = 30;
export const FAQ_QUESTION_MAX = 200;
export const FAQ_ANSWER_MAX = 2000;
export const COMPARISON_MAX_ROWS = 15;
export const COMPARISON_TEXT_MAX = 80;
export const DEFAULT_COMPARISON_TITLE = 'Pourquoi choisir notre produit ?';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/** A comparison cell: a green check, a red cross, or a short text. */
export type ComparisonValue = { kind: 'yes' } | { kind: 'no' } | { kind: 'text'; text: string };

export interface ComparisonRow {
  id: string;
  criterion: string;
  ours: ComparisonValue;
  others: ComparisonValue;
}

export interface ProductComparison {
  enabled: boolean;
  title: string;
  /** Column headers, e.g. « Notre produit » / « Les autres ». */
  oursLabel: string;
  othersLabel: string;
  rows: ComparisonRow[];
}

export const DEFAULT_COMPARISON: ProductComparison = {
  enabled: false,
  title: DEFAULT_COMPARISON_TITLE,
  oursLabel: 'Notre produit',
  othersLabel: 'Les autres',
  rows: [],
};

export function countWords(text: string): number {
  const words = text
    .replace(/\*\*/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  return words.length;
}

/** Keeps the first `max` words, preserving the original spacing and line breaks. */
export function truncateWords(text: string, max: number): string {
  if (countWords(text) <= max) return text;
  let seen = 0;
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (/[\p{L}\p{N}]/u.test(m[0])) seen += 1;
    if (seen === max) return text.slice(0, m.index + m[0].length);
  }
  return text;
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');

function cleanValue(v: unknown): ComparisonValue {
  if (v && typeof v === 'object') {
    const kind = (v as { kind?: unknown }).kind;
    if (kind === 'yes' || kind === 'no') return { kind };
    if (kind === 'text') {
      return {
        kind: 'text',
        text: str((v as { text?: unknown }).text, COMPARISON_TEXT_MAX).trim(),
      };
    }
  }
  return { kind: 'yes' };
}

const isEmptyValue = (v: ComparisonValue) => v.kind === 'text' && v.text === '';

/** Editor storage: keeps entries being written (even empty), caps sizes. */
export function capFaq(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, FAQ_MAX_ITEMS).map((x, i) => ({
    id: str((x as FaqItem)?.id, 40) || `faq-${i}`,
    question: str((x as FaqItem)?.question, FAQ_QUESTION_MAX),
    answer: str((x as FaqItem)?.answer, FAQ_ANSWER_MAX),
  }));
}

/** Server/page side: drops empty FAQ entries, caps sizes. */
export function cleanFaq(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, FAQ_MAX_ITEMS)
    .map((x, i) => ({
      id: str((x as FaqItem)?.id, 40) || `faq-${i}`,
      question: str((x as FaqItem)?.question, FAQ_QUESTION_MAX).trim(),
      answer: str((x as FaqItem)?.answer, FAQ_ANSWER_MAX).trim(),
    }))
    .filter((x) => x.question !== '' && x.answer !== '');
}

/** Server/page side: drops rows without a criterion or with two empty cells. */
export function cleanComparison(raw: unknown): ProductComparison {
  if (!raw || typeof raw !== 'object') return DEFAULT_COMPARISON;
  const c = raw as Partial<ProductComparison>;
  const rows = Array.isArray(c.rows) ? c.rows : [];
  return {
    enabled: c.enabled === true,
    title: str(c.title, 120).trim() || DEFAULT_COMPARISON_TITLE,
    oursLabel: str(c.oursLabel, 40).trim() || DEFAULT_COMPARISON.oursLabel,
    othersLabel: str(c.othersLabel, 40).trim() || DEFAULT_COMPARISON.othersLabel,
    rows: rows
      .slice(0, COMPARISON_MAX_ROWS)
      .map((r, i) => ({
        id: str(r?.id, 40) || `row-${i}`,
        criterion: str(r?.criterion, COMPARISON_TEXT_MAX).trim(),
        ours: cleanValue(r?.ours),
        others: cleanValue(r?.others),
      }))
      .filter((r) => r.criterion !== '' && !(isEmptyValue(r.ours) && isEmptyValue(r.others))),
  };
}

export function cleanDescription(raw: unknown): string {
  return truncateWords(str(raw, DESCRIPTION_MAX_CHARS), DESCRIPTION_MAX_WORDS).trim();
}

/** Is there anything to show on the public page? */
export function hasComparison(c: ProductComparison | undefined): c is ProductComparison {
  return Boolean(c && c.enabled && c.rows.length > 0);
}
