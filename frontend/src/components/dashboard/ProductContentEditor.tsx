'use client';

import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bold,
  Check,
  HelpCircle,
  List,
  ListOrdered,
  Plus,
  Scale,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import {
  COMPARISON_MAX_ROWS,
  COMPARISON_TEXT_MAX,
  DEFAULT_COMPARISON,
  DESCRIPTION_MAX_CHARS,
  DESCRIPTION_MAX_WORDS,
  FAQ_ANSWER_MAX,
  FAQ_MAX_ITEMS,
  FAQ_QUESTION_MAX,
  countWords,
  truncateWords,
  type ComparisonRow,
  type ComparisonValue,
  type FaqItem,
  type ProductComparison,
} from '@/lib/store/product-content';

interface ProductContentEditorProps {
  description: string | undefined;
  faqItems: FaqItem[] | undefined;
  comparison: ProductComparison | undefined;
  onChange: (patch: {
    description?: string;
    faqItems?: FaqItem[];
    comparison?: ProductComparison;
  }) => void;
}

const newId = () => Math.random().toString(36).slice(2, 10);

const INPUT =
  'w-full min-w-0 px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[14px] text-[#201D1D] placeholder:text-[#9AA0AB] focus:outline-none focus:border-[#235BF7] focus:bg-white';

const FAQ_SUGGESTIONS: Omit<FaqItem, 'id'>[] = [
  {
    question: 'Quels sont les délais de livraison ?',
    answer: 'Livraison sous 24 h à 48 h à Dakar, 2 à 4 jours dans les régions.',
  },
  {
    question: 'Comment se passe le paiement ?',
    answer: 'Vous payez à la livraison, en espèces, après avoir vérifié votre commande.',
  },
  {
    question: 'Puis-je échanger le produit ?',
    answer: 'Oui, l’échange est possible sous 7 jours si le produit n’a pas été utilisé.',
  },
];

const COMPARISON_EXAMPLES: Omit<ComparisonRow, 'id'>[] = [
  { criterion: 'Qualité premium', ours: { kind: 'yes' }, others: { kind: 'no' } },
  { criterion: 'Paiement à la livraison', ours: { kind: 'yes' }, others: { kind: 'no' } },
  {
    criterion: 'Livraison',
    ours: { kind: 'text', text: '24 h à Dakar' },
    others: { kind: 'text', text: '5 à 10 jours' },
  },
];

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

const IconBtn: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, disabled = false, danger = false, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default ${
      danger
        ? 'text-[#94A3B8] hover:text-red-600 hover:bg-red-50'
        : 'text-[#64748B] hover:bg-[#F1F5F9]'
    }`}
  >
    {children}
  </button>
);

const Heading: React.FC<{ icon: React.ReactNode; title: string; hint: string; badge?: string }> = ({
  icon,
  title,
  hint,
  badge,
}) => (
  <div className="flex items-start gap-3">
    <span className="w-10 h-10 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
      {icon}
    </span>
    <div className="min-w-0">
      <h4 className="text-[16px] font-extrabold text-[#201D1D] flex flex-wrap items-center gap-2">
        {title}
        {badge && (
          <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B]">
            {badge}
          </span>
        )}
      </h4>
      <p className="text-[13px] text-[#7A808C]">{hint}</p>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
// Description
// ─────────────────────────────────────────────────────────────────────────
function DescriptionField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const words = countWords(value);
  const ratio = Math.min(1, words / DESCRIPTION_MAX_WORDS);
  const tone = ratio >= 1 ? 'bg-red-500' : ratio >= 0.9 ? 'bg-amber-500' : 'bg-[#235BF7]';

  const set = (v: string) =>
    onChange(truncateWords(v.slice(0, DESCRIPTION_MAX_CHARS), DESCRIPTION_MAX_WORDS));

  /** Wraps the selection in **…**, or prefixes each selected line. */
  const format = (kind: 'bold' | 'bullet' | 'number') => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    let next: string;
    let caret: [number, number];
    if (kind === 'bold') {
      const sel = value.slice(a, b) || 'texte en gras';
      next = `${value.slice(0, a)}**${sel}**${value.slice(b)}`;
      caret = [a + 2, a + 2 + sel.length];
    } else {
      const lineStart = value.lastIndexOf('\n', a - 1) + 1;
      const block = value.slice(lineStart, b) || '';
      const lines = (block || ' ').split('\n');
      const prefixed = lines
        .map(
          (l, i) =>
            `${kind === 'bullet' ? '- ' : `${i + 1}. `}${l.replace(/^\s*([-•*]|\d+[.)])\s+/, '')}`,
        )
        .join('\n');
      next = `${value.slice(0, lineStart)}${prefixed}${value.slice(Math.max(b, lineStart))}`;
      caret = [lineStart + prefixed.length, lineStart + prefixed.length];
    }
    set(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret[0], caret[1]);
    });
  };

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] focus-within:border-[#235BF7] focus-within:bg-white transition-colors">
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#E2E8F0]">
          <IconBtn label="Gras" onClick={() => format('bold')}>
            <Bold className="w-4 h-4" />
          </IconBtn>
          <IconBtn label="Liste à puces" onClick={() => format('bullet')}>
            <List className="w-4 h-4" />
          </IconBtn>
          <IconBtn label="Liste numérotée" onClick={() => format('number')}>
            <ListOrdered className="w-4 h-4" />
          </IconBtn>
          <span className="ml-auto pr-2 text-[12px] text-[#9AA0AB] hidden sm:inline">
            Ligne vide = nouveau paragraphe
          </span>
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => set(e.target.value)}
          rows={10}
          placeholder={
            'Présentez votre produit : matière, utilisation, pour qui, pourquoi il change la vie de vos clients…\n\n- Point fort 1\n- Point fort 2'
          }
          className="w-full min-h-[220px] px-4 py-3 bg-transparent text-[15px] leading-relaxed text-[#201D1D] placeholder:text-[#9AA0AB] resize-y focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-[#EEF1F5] overflow-hidden" aria-hidden="true">
          <div
            className={`h-full rounded-full transition-all duration-300 ${tone}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <span
          className={`shrink-0 text-[13px] font-semibold tabular-nums ${ratio >= 1 ? 'text-red-600' : 'text-[#7A808C]'}`}
          aria-live="polite"
        >
          {words.toLocaleString('fr-FR')} / {DESCRIPTION_MAX_WORDS.toLocaleString('fr-FR')} mots
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────
export function FaqEditor({
  items,
  onChange,
}: {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const full = items.length >= FAQ_MAX_ITEMS;
  const add = (seed?: Omit<FaqItem, 'id'>) =>
    !full &&
    onChange([
      ...items,
      { id: newId(), question: seed?.question ?? '', answer: seed?.answer ?? '' },
    ]);
  const update = (id: string, p: Partial<FaqItem>) =>
    onChange(items.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const unused = FAQ_SUGGESTIONS.filter((s) => !items.some((x) => x.question === s.question));

  return (
    <div className="space-y-3">
      {items.map((x, i) => (
        <div
          key={x.id}
          className="rounded-2xl border border-[#E2E8F0] bg-white p-3 sm:p-4 space-y-2.5 motion-safe:animate-[rise_200ms_ease]"
        >
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-bold text-[#235BF7] mr-auto">Question {i + 1}</span>
            <IconBtn
              label="Monter"
              disabled={i === 0}
              onClick={() => onChange(move(items, i, i - 1))}
            >
              <ArrowUp className="w-4 h-4" />
            </IconBtn>
            <IconBtn
              label="Descendre"
              disabled={i === items.length - 1}
              onClick={() => onChange(move(items, i, i + 1))}
            >
              <ArrowDown className="w-4 h-4" />
            </IconBtn>
            {confirmId === x.id ? (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onChange(items.filter((y) => y.id !== x.id));
                    setConfirmId(null);
                  }}
                  className="h-9 px-3 rounded-xl bg-red-600 text-white text-[13px] font-semibold cursor-pointer"
                >
                  Supprimer
                </button>
                <IconBtn label="Annuler" onClick={() => setConfirmId(null)}>
                  <X className="w-4 h-4" />
                </IconBtn>
              </span>
            ) : (
              <IconBtn
                label="Supprimer la question"
                danger
                onClick={() =>
                  x.question.trim() || x.answer.trim()
                    ? setConfirmId(x.id)
                    : onChange(items.filter((y) => y.id !== x.id))
                }
              >
                <Trash2 className="w-4 h-4" />
              </IconBtn>
            )}
          </div>
          <input
            value={x.question}
            maxLength={FAQ_QUESTION_MAX}
            onChange={(e) => update(x.id, { question: e.target.value })}
            placeholder="Question (ex : Quels sont les délais de livraison ?)"
            aria-label={`Question ${i + 1}`}
            className={`${INPUT} font-semibold`}
          />
          <textarea
            value={x.answer}
            maxLength={FAQ_ANSWER_MAX}
            onChange={(e) => update(x.id, { answer: e.target.value })}
            rows={3}
            placeholder="Réponse (ex : Livraison sous 24 h à 48 h partout à Dakar.)"
            aria-label={`Réponse ${i + 1}`}
            className={`${INPUT} resize-y`}
          />
          {(!x.question.trim() || !x.answer.trim()) && (
            <p className="text-[12px] text-amber-700">
              Remplissez la question et la réponse pour qu’elle apparaisse sur la page.
            </p>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => add()}
        disabled={full}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-dashed border-[#C9D6F5] text-[#235BF7] text-[14px] font-semibold hover:bg-[#F5F8FF] disabled:opacity-50 cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Ajouter une question FAQ
      </button>
      {unused.length > 0 && !full && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-[#7A808C]">Idées :</span>
          {unused.map((s) => (
            <button
              key={s.question}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-[#F1F5F9] text-[12px] font-semibold text-[#3F4654] hover:bg-[#E2E8F0] cursor-pointer"
            >
              <Plus className="w-3 h-3" /> {s.question}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Comparison
// ─────────────────────────────────────────────────────────────────────────
function ValuePicker({
  value,
  onChange,
  label,
}: {
  value: ComparisonValue;
  onChange: (v: ComparisonValue) => void;
  label: string;
}) {
  const opt = (kind: ComparisonValue['kind'], icon: React.ReactNode, name: string, on: string) => (
    <button
      type="button"
      onClick={() =>
        onChange(
          kind === 'text' ? { kind, text: value.kind === 'text' ? value.text : '' } : { kind },
        )
      }
      aria-pressed={value.kind === kind}
      aria-label={`${label} : ${name}`}
      title={name}
      className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
        value.kind === kind ? on : 'text-[#94A3B8] hover:bg-white'
      }`}
    >
      {icon}
    </button>
  );
  return (
    <div className="space-y-1.5 min-w-0">
      <span className="block text-[12px] font-semibold text-[#64748B]">{label}</span>
      <div className="flex gap-1 p-1 rounded-xl bg-[#F1F5F9]">
        {opt(
          'yes',
          <Check className="w-4 h-4" strokeWidth={3} />,
          'Coche verte',
          'bg-emerald-500 text-white',
        )}
        {opt(
          'no',
          <X className="w-4 h-4" strokeWidth={3} />,
          'Croix rouge',
          'bg-rose-500 text-white',
        )}
        {opt('text', <Type className="w-4 h-4" />, 'Texte', 'bg-[#235BF7] text-white')}
      </div>
      {value.kind === 'text' && (
        <input
          value={value.text}
          maxLength={COMPARISON_TEXT_MAX}
          onChange={(e) => onChange({ kind: 'text', text: e.target.value })}
          placeholder="Ex : 24 h"
          aria-label={`${label} : texte`}
          className={INPUT}
        />
      )}
    </div>
  );
}

function ComparisonEditor({
  value,
  onChange,
}: {
  value: ProductComparison;
  onChange: (v: ProductComparison) => void;
}) {
  const set = (p: Partial<ProductComparison>) => onChange({ ...value, ...p });
  const setRow = (id: string, p: Partial<ComparisonRow>) =>
    set({ rows: value.rows.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  const full = value.rows.length >= COMPARISON_MAX_ROWS;

  return (
    <div className="space-y-4">
      <button
        type="button"
        role="switch"
        aria-checked={value.enabled}
        onClick={() =>
          set({
            enabled: !value.enabled,
            // First activation: start from examples the merchant edits.
            ...(!value.enabled && value.rows.length === 0
              ? { rows: COMPARISON_EXAMPLES.map((r) => ({ ...r, id: newId() })) }
              : {}),
          })
        }
        className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-colors cursor-pointer ${
          value.enabled
            ? 'border-[#235BF7] bg-[#F5F8FF]'
            : 'border-[#E2E8F0] bg-white hover:border-[#C9D6F5]'
        }`}
      >
        <span
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${
            value.enabled ? 'bg-[#235BF7] border-[#235BF7] text-white' : 'border-[#CBD5E1]'
          }`}
        >
          {value.enabled && <Check className="w-4 h-4" strokeWidth={3} />}
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-bold text-[#201D1D]">
            Activer le tableau comparatif sur la fiche produit
          </span>
          <span className="block text-[13px] text-emerald-700 font-semibold">
            Recommandé pour booster les ventes
          </span>
        </span>
      </button>

      {value.enabled && (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-[13px] font-semibold text-[#201D1D]">Titre du comparatif</span>
            <input
              value={value.title}
              maxLength={120}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Pourquoi choisir notre produit ?"
              className={INPUT}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1.5 min-w-0">
              <span className="text-[13px] font-semibold text-[#201D1D]">Colonne 1</span>
              <input
                value={value.oursLabel}
                maxLength={40}
                onChange={(e) => set({ oursLabel: e.target.value })}
                placeholder="Notre produit"
                className={INPUT}
              />
            </label>
            <label className="block space-y-1.5 min-w-0">
              <span className="text-[13px] font-semibold text-[#201D1D]">Colonne 2</span>
              <input
                value={value.othersLabel}
                maxLength={40}
                onChange={(e) => set({ othersLabel: e.target.value })}
                placeholder="Les autres"
                className={INPUT}
              />
            </label>
          </div>

          {value.rows.map((r, i) => (
            <div
              key={r.id}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-3 sm:p-4 space-y-3"
            >
              <div className="flex items-center gap-1">
                <span className="text-[13px] font-bold text-[#235BF7] mr-auto">
                  Critère {i + 1}
                </span>
                <IconBtn
                  label="Monter"
                  disabled={i === 0}
                  onClick={() => set({ rows: move(value.rows, i, i - 1) })}
                >
                  <ArrowUp className="w-4 h-4" />
                </IconBtn>
                <IconBtn
                  label="Descendre"
                  disabled={i === value.rows.length - 1}
                  onClick={() => set({ rows: move(value.rows, i, i + 1) })}
                >
                  <ArrowDown className="w-4 h-4" />
                </IconBtn>
                <IconBtn
                  label="Supprimer le critère"
                  danger
                  onClick={() => set({ rows: value.rows.filter((x) => x.id !== r.id) })}
                >
                  <Trash2 className="w-4 h-4" />
                </IconBtn>
              </div>
              <input
                value={r.criterion}
                maxLength={COMPARISON_TEXT_MAX}
                onChange={(e) => setRow(r.id, { criterion: e.target.value })}
                placeholder="Critère (ex : Qualité du tissu, Garantie…)"
                aria-label={`Critère ${i + 1}`}
                className={`${INPUT} font-semibold`}
              />
              <div className="grid grid-cols-2 gap-2">
                <ValuePicker
                  label={value.oursLabel || 'Notre produit'}
                  value={r.ours}
                  onChange={(ours) => setRow(r.id, { ours })}
                />
                <ValuePicker
                  label={value.othersLabel || 'Les autres'}
                  value={r.others}
                  onChange={(others) => setRow(r.id, { others })}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            disabled={full}
            onClick={() =>
              set({
                rows: [
                  ...value.rows,
                  { id: newId(), criterion: '', ours: { kind: 'yes' }, others: { kind: 'no' } },
                ],
              })
            }
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-dashed border-[#C9D6F5] text-[#235BF7] text-[14px] font-semibold hover:bg-[#F5F8FF] disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Ajouter un critère
          </button>
        </div>
      )}
    </div>
  );
}

/** Étape « Description & FAQ » of the product editor. */
export const ProductContentEditor: React.FC<ProductContentEditorProps> = ({
  description,
  faqItems,
  comparison,
  onChange,
}) => (
  <div className="space-y-8">
    <section className="space-y-3">
      <Heading
        icon={<Type className="w-5 h-5" />}
        title="Description du produit"
        hint="Jusqu’à 2 000 mots. Gras, listes à puces et paragraphes sont pris en charge."
      />
      <DescriptionField value={description ?? ''} onChange={(d) => onChange({ description: d })} />
    </section>

    <section className="space-y-3">
      <Heading
        icon={<HelpCircle className="w-5 h-5" />}
        title="Questions fréquentes"
        badge="Optionnel"
        hint="Répondez aux doutes avant qu’ils ne bloquent l’achat. Affichées en accordéon sur la page."
      />
      <FaqEditor items={faqItems ?? []} onChange={(items) => onChange({ faqItems: items })} />
    </section>

    <section className="space-y-3">
      <Heading
        icon={<Scale className="w-5 h-5" />}
        title="Tableau « Nous vs Les autres »"
        badge="Optionnel"
        hint="Montrez en un coup d’œil pourquoi votre produit est le meilleur choix."
      />
      <ComparisonEditor
        value={comparison ?? DEFAULT_COMPARISON}
        onChange={(c) => onChange({ comparison: c })}
      />
    </section>
  </div>
);
