'use client';

// « Nouveau produit » — guided creation in 4 steps: name (with AI name ideas),
// photos & video (uploaded from the device), price & delivery, then the sales
// copy written by AI (optional). Full-screen sheet on phones, dialog on desktop.
import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgePercent,
  Banknote,
  Check,
  ChevronLeft,
  Film,
  Gift,
  ImagePlus,
  Images,
  Lightbulb,
  Link2,
  ListChecks,
  MessagesSquare,
  Pencil,
  Plus,
  ShieldCheck,
  Loader2,
  PackagePlus,
  PenLine,
  RefreshCw,
  Scale,
  FileText,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import type { FunnelPageConfig } from '@/types/juula';
import type { FullProductGenerationOutput } from '@/lib/server/ai/product-page-wizard';
import type { ComparisonRow, ComparisonValue, FaqItem } from '@/lib/store/product-content';
import { postAi } from '@/lib/ai-client';
import { uploadMedia } from '@/lib/upload';
import { formatNumber } from '@/lib/orderUtils';
import { AiIcon } from '@/components/ui/AiIcon';

interface ProductCreationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProduct: (
    configPatch: Partial<FunnelPageConfig>,
    internalName: string,
  ) => Promise<boolean | void>;
  storeName?: string | undefined;
}

type Step = 1 | 2 | 3 | 4;

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 1, label: 'Nom', icon: <PenLine className="w-[18px] h-[18px]" /> },
  { id: 2, label: 'Photos & vidéo', icon: <Images className="w-[18px] h-[18px]" /> },
  { id: 3, label: 'Prix & livraison', icon: <Banknote className="w-[18px] h-[18px]" /> },
  { id: 4, label: 'Texte de vente', icon: <AiIcon className="w-[18px] h-[18px]" tone="white" /> },
];

const MAX_PHOTOS = 5;

const input =
  'w-full min-h-12 px-4 rounded-2xl border-2 border-[#E2E8F0] bg-white text-[16px] text-[#201D1D] placeholder:text-[#9AA0AB] focus:outline-none focus:border-[#235BF7] focus:ring-4 focus:ring-[#235BF7]/15 transition-all';
const btnPrimary =
  'min-h-12 px-5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors';
const btnGhost =
  'min-h-12 px-5 rounded-xl border border-[#E3E7EE] bg-white hover:bg-[#F6F7F9] disabled:opacity-50 text-[#3F4654] text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors';

const numberOrZero = (v: string) => {
  const n = Number(v.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

function IconTile({
  children,
  tone = 'blue',
}: {
  children: React.ReactNode;
  tone?: 'blue' | 'dark';
}) {
  return (
    <span
      className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center ${
        tone === 'dark' ? 'bg-[#201D1D] text-white' : 'bg-[#EEF3FF] text-[#235BF7]'
      }`}
    >
      {children}
    </span>
  );
}

function StepTitle({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-[19px] sm:text-[20px] font-extrabold text-[#201D1D]">{title}</h3>
      <p className="mt-1 text-[14px] text-[#7A808C] leading-relaxed">{text}</p>
    </div>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: React.ReactNode;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-semibold text-[#201D1D]">
        {label}
      </label>
      <div className="mt-1.5 flex items-stretch rounded-2xl border-2 border-[#E2E8F0] bg-white focus-within:border-[#235BF7] focus-within:ring-4 focus-within:ring-[#235BF7]/15 transition-all overflow-hidden">
        <input
          id={id}
          inputMode="numeric"
          value={value ? formatNumber(value) : ''}
          onChange={(e) => onChange(numberOrZero(e.target.value))}
          placeholder="0"
          className="flex-1 min-w-0 min-h-12 px-4 text-[16px] font-semibold text-[#201D1D] bg-transparent focus:outline-none"
        />
        <span className="flex items-center px-2.5 sm:px-4 bg-[#F4F6FB] border-l border-[#E6EAF2] text-[13px] sm:text-[14px] font-bold text-[#6B7280]">
          FCFA
        </span>
      </div>
      {hint && <p className="mt-1.5 text-[13px] text-[#7A808C]">{hint}</p>}
    </div>
  );
}

function cellText(v: ComparisonValue): string {
  return v.kind === 'text' ? v.text : v.kind === 'yes' ? 'Oui' : 'Non';
}

function CopySection({
  icon,
  title,
  editing,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  editing: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`p-4 rounded-2xl border bg-white transition-colors ${
        editing ? 'border-[#BFD0FD] ring-4 ring-[#235BF7]/10' : 'border-[#ECEFF4]'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center">
            {icon}
          </span>
          <span className="text-[15px] font-extrabold text-[#201D1D]">{title}</span>
        </span>
        <button
          type="button"
          onClick={onToggle}
          className={`min-h-10 px-3 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
            editing
              ? 'bg-[#235BF7] text-white hover:bg-[#1B4AD6]'
              : 'border border-[#E3E7EE] text-[#3F4654] hover:bg-[#F6F7F9]'
          }`}
        >
          {editing ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          {editing ? 'Terminé' : 'Modifier'}
        </button>
      </div>
      {children}
    </section>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-12 h-12 shrink-0 rounded-xl border border-[#F3D4D4] text-[#DC2626] hover:bg-[#FEF2F2] flex items-center justify-center cursor-pointer"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-11 rounded-xl border-2 border-dashed border-[#BFD0FD] text-[14px] font-semibold text-[#235BF7] hover:bg-[#F7F9FF] inline-flex items-center justify-center gap-1.5 cursor-pointer"
    >
      <Plus className="w-4 h-4" /> {label}
    </button>
  );
}

export const ProductCreationWizardModal: React.FC<ProductCreationWizardModalProps> = ({
  isOpen,
  onClose,
  onCreateProduct,
  storeName,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const bodyRef = useRef<HTMLDivElement>(null);

  // 1 · Nom
  const [productName, setProductName] = useState('');
  const [idea, setIdea] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [namesBusy, setNamesBusy] = useState(false);
  const [namesError, setNamesError] = useState<string | null>(null);

  // 2 · Médias
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoProgress, setPhotoProgress] = useState<number | null>(null);
  const [photoLink, setPhotoLink] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  // 3 · Prix & livraison
  const [price, setPrice] = useState(15000);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [freeShipping, setFreeShipping] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState(2000);

  // 4 · Texte de vente
  const [content, setContent] = useState<FullProductGenerationOutput | null>(null);
  const [contentBusy, setContentBusy] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const [edited, setEdited] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const busy =
    namesBusy || contentBusy || submitting || photoProgress !== null || videoProgress !== null;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, busy, onClose]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step]);

  if (!isOpen) return null;

  const discount =
    originalPrice > price && price > 0 ? Math.round((1 - price / originalPrice) * 100) : 0;
  const canContinue = step === 1 ? productName.trim().length >= 2 : step === 3 ? price > 0 : true;

  // ───────────────────────────── actions
  const suggestNames = async () => {
    const base = (idea || productName).trim();
    if (!base) return;
    setNamesBusy(true);
    setNamesError(null);
    try {
      const res = await postAi<{ suggestions?: string[] }>('/api/store/ai/product-names', {
        baseIdea: base,
      });
      if (res.ok && Array.isArray(res.data.suggestions) && res.data.suggestions.length > 0) {
        setNames(res.data.suggestions.slice(0, 5));
      } else {
        setNamesError(res.data.message || 'Aucune proposition pour le moment. Réessayez.');
      }
    } catch {
      setNamesError('Connexion impossible. Vérifiez votre réseau.');
    } finally {
      setNamesBusy(false);
    }
  };

  const addPhotoFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setMediaError(null);
    const room = MAX_PHOTOS - photos.length;
    for (const file of Array.from(files).slice(0, room)) {
      setPhotoProgress(0);
      try {
        const url = await uploadMedia(file, 'image', { onProgress: setPhotoProgress });
        setPhotos((p) => [...p, url].slice(0, MAX_PHOTOS));
      } catch (e) {
        setMediaError(e instanceof Error ? e.message : 'L’envoi de la photo a échoué.');
      }
    }
    setPhotoProgress(null);
  };

  const addPhotoLink = () => {
    const url = photoLink.trim();
    if (!/^https:\/\/\S+$/i.test(url)) {
      setMediaError('Collez un lien d’image qui commence par https://');
      return;
    }
    setMediaError(null);
    setPhotos((p) => [...p, url].slice(0, MAX_PHOTOS));
    setPhotoLink('');
  };

  const uploadVideo = async (file: File | undefined) => {
    if (!file) return;
    setMediaError(null);
    setVideoProgress(0);
    try {
      setVideoUrl(await uploadMedia(file, 'video', { onProgress: setVideoProgress }));
    } catch (e) {
      setMediaError(e instanceof Error ? e.message : 'L’envoi de la vidéo a échoué.');
    } finally {
      setVideoProgress(null);
    }
  };

  const generateContent = async () => {
    setContentBusy(true);
    setContentError(null);
    try {
      const res = await postAi<{ generated?: FullProductGenerationOutput }>(
        '/api/store/ai/product-full',
        {
          productName: productName.trim(),
          price,
          deliveryFree: freeShipping,
          deliveryFee: freeShipping ? 0 : deliveryFee,
          ...(storeName ? { storeName } : {}),
        },
      );
      if (res.ok && res.data.generated) {
        setContent(res.data.generated);
        setEditing(new Set());
        setEdited(false);
      } else {
        // A failed regeneration keeps the current text.
        setContentError(res.data.message || 'La rédaction a échoué. Réessayez.');
      }
    } catch {
      setContentError('Connexion impossible. Vérifiez votre réseau.');
    } finally {
      setContentBusy(false);
    }
  };

  // ── manual edits of the generated copy
  const patchContent = (p: Partial<FullProductGenerationOutput>) => {
    setContent((c) => (c ? { ...c, ...p } : c));
    setEdited(true);
  };
  const toggleEdit = (key: string) =>
    setEditing((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const patchRow = (i: number, p: Partial<ComparisonRow>) => {
    if (!content) return;
    const rows = content.comparison.rows.map((r, j) => (j === i ? { ...r, ...p } : r));
    patchContent({ comparison: { ...content.comparison, rows } });
  };
  const removeRow = (i: number) => {
    if (!content) return;
    const rows = content.comparison.rows.filter((_, j) => j !== i);
    patchContent({ comparison: { ...content.comparison, rows } });
  };
  const addRow = () => {
    if (!content) return;
    const row: ComparisonRow = {
      id: `row-${Date.now()}`,
      criterion: '',
      ours: { kind: 'text', text: '' },
      others: { kind: 'text', text: '' },
    };
    patchContent({
      comparison: { ...content.comparison, rows: [...content.comparison.rows, row] },
    });
  };
  const patchFaq = (i: number, p: Partial<FaqItem>) => {
    if (!content) return;
    patchContent({ faqItems: content.faqItems.map((f, j) => (j === i ? { ...f, ...p } : f)) });
  };

  const submit = async () => {
    if (productName.trim().length < 2) return setStep(1);
    setSubmitting(true);
    try {
      const patch: Partial<FunnelPageConfig> & Record<string, unknown> = {
        productTitle: productName.trim(),
        price,
        originalPrice: originalPrice > price ? originalPrice : price,
        deliveryFree: freeShipping,
        deliveryFee: freeShipping ? 0 : deliveryFee,
        deliveryPricingType: freeShipping ? 'free' : 'fixed',
        fixedDeliveryFee: freeShipping ? 0 : deliveryFee,
        hasVideo: Boolean(videoUrl.trim()),
        ...(videoUrl.trim() ? { videoUrl: videoUrl.trim() } : {}),
        ...(photos.length
          ? {
              mediaItems: photos.map((url, i) => ({
                id: `img-${Date.now()}-${i}`,
                type: 'image' as const,
                url,
                isPrimary: i === 0,
              })),
            }
          : {}),
      };
      // AI copy. Customer reviews are NOT taken from the AI: invented reviews
      // shown as real (« Achat vérifié », star rating) mislead buyers — the
      // merchant adds the real ones in the page editor.
      if (content) {
        Object.assign(patch, {
          benefits: content.benefits.map((b) => b.trim()).filter(Boolean),
          description: content.description.trim(),
          faqItems: content.faqItems.filter((f) => f.question.trim() && f.answer.trim()),
          comparison: {
            ...content.comparison,
            rows: content.comparison.rows.filter((r) => r.criterion.trim()),
          },
          urgencyText: content.urgencyText,
          reassuranceText: content.reassuranceText,
          ctaButtonText: content.ctaButtonText,
        });
      }
      await onCreateProduct(patch, productName.trim());
      toast('Produit créé. Vous pouvez maintenant le compléter et le publier.', 'success');
      onClose();
    } catch {
      toast('La création du produit a échoué. Réessayez.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const current = STEPS[step - 1]!;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
        className="w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[92vh] bg-white sm:rounded-[28px] sm:border sm:border-[#ECEFF4] shadow-2xl flex flex-col overflow-hidden motion-safe:animate-[rise_300ms_cubic-bezier(.2,.75,.2,1)]"
      >
        {/* En-tête */}
        <header className="px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-[#ECEFF4]">
          <div className="flex items-center gap-3">
            <IconTile tone="dark">
              <PackagePlus className="w-5 h-5" />
            </IconTile>
            <div className="min-w-0 flex-1">
              <h2 id="wizard-title" className="text-[18px] font-extrabold text-[#201D1D]">
                Nouveau produit
              </h2>
              <p className="text-[13px] text-[#7A808C]">
                Étape {step} sur 4 · {current.label}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Fermer"
              className="w-11 h-11 shrink-0 rounded-full text-[#7A808C] hover:bg-[#F1F5F9] flex items-center justify-center cursor-pointer disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Étapes : pastilles reliées par une piste qui se remplit */}
          <div className="relative mt-5" aria-label="Étapes">
            <div className="absolute left-5 right-5 top-5 h-1 -translate-y-1/2 rounded-full bg-[#E9EDF3]" />
            <div
              className="absolute left-5 top-5 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#235BF7] to-[#6D4AFF] transition-[width] duration-500 ease-out"
              style={{ width: `calc((100% - 2.5rem) * ${(step - 1) / 3})` }}
            />
            <ol className="relative flex justify-between">
              {STEPS.map((s) => {
                const done = s.id < step;
                const active = s.id === step;
                return (
                  <li key={s.id} className="flex flex-col items-center w-10 sm:w-auto">
                    <button
                      type="button"
                      disabled={!done || busy}
                      onClick={() => setStep(s.id)}
                      aria-current={active ? 'step' : undefined}
                      aria-label={`Étape ${s.id} : ${s.label}`}
                      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 disabled:cursor-default cursor-pointer ${
                        active
                          ? 'bg-[#235BF7] text-white scale-110 shadow-[0_8px_20px_-6px_rgba(35,91,247,0.65)] ring-4 ring-[#235BF7]/15'
                          : done
                            ? 'bg-[#235BF7] text-white hover:scale-105'
                            : 'bg-white text-[#9AA0AB] border-2 border-[#E3E7EE]'
                      }`}
                    >
                      {done ? (
                        <Check className="w-[18px] h-[18px]" strokeWidth={2.75} />
                      ) : s.id === 4 ? (
                        <AiIcon
                          className="w-[18px] h-[18px]"
                          tone={active ? 'white' : 'gradient'}
                        />
                      ) : (
                        s.icon
                      )}
                      {active && (
                        <span className="absolute -inset-1 rounded-full ring-2 ring-[#235BF7]/35 motion-safe:animate-pulse" />
                      )}
                    </button>
                    <span
                      className={`mt-2 hidden sm:block text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
                        active ? 'text-[#235BF7]' : done ? 'text-[#201D1D]' : 'text-[#9AA0AB]'
                      }`}
                    >
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </header>

        {/* Contenu */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6">
          <div
            key={step}
            className="space-y-5 motion-safe:animate-[rise_380ms_cubic-bezier(.2,.75,.2,1)]"
          >
            {step === 1 && (
              <>
                <StepTitle
                  title="Comment s’appelle votre produit ?"
                  text="Un nom clair et précis aide vos clients à comprendre tout de suite ce que vous vendez."
                />
                <div>
                  <label
                    htmlFor="p-name"
                    className="block text-[14px] font-semibold text-[#201D1D]"
                  >
                    Nom du produit
                  </label>
                  <input
                    id="p-name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value.slice(0, 120))}
                    placeholder="Ex. Montre chronographe acier noir"
                    autoComplete="off"
                    className={`mt-1.5 ${input} font-semibold`}
                  />
                </div>

                <section className="p-4 sm:p-5 rounded-[22px] bg-[#F6F8FC] border border-[#E6EBF5] space-y-3">
                  <div className="flex items-start gap-3">
                    <IconTile>
                      <Lightbulb className="w-5 h-5" />
                    </IconTile>
                    <div>
                      <p className="text-[15px] font-bold text-[#201D1D]">Besoin d’inspiration ?</p>
                      <p className="text-[13px] text-[#7A808C]">
                        Décrivez votre produit en quelques mots, l’IA vous propose 5 noms vendeurs.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={idea}
                      onChange={(e) => setIdea(e.target.value.slice(0, 120))}
                      onKeyDown={(e) => e.key === 'Enter' && void suggestNames()}
                      placeholder="Ex. montre homme acier, sérum éclat…"
                      aria-label="Idée de produit"
                      className={`${input} sm:flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => void suggestNames()}
                      disabled={namesBusy || !(idea || productName).trim()}
                      className={`${btnPrimary} sm:shrink-0`}
                    >
                      {namesBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <AiIcon className="w-[18px] h-[18px]" tone="white" />
                      )}
                      Proposer des noms
                    </button>
                  </div>
                  {namesError && (
                    <p role="alert" className="text-[14px] font-semibold text-[#DC2626]">
                      {namesError}
                    </p>
                  )}
                  {names.length > 0 && (
                    <div role="radiogroup" aria-label="Noms proposés" className="grid gap-2 pt-1">
                      {names.map((n) => {
                        const on = productName === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setProductName(n)}
                            className={`min-h-12 px-4 py-2.5 rounded-xl border-2 text-left text-[14px] font-semibold flex items-center gap-3 cursor-pointer transition-colors ${
                              on
                                ? 'border-[#235BF7] bg-[#EEF3FF] text-[#201D1D]'
                                : 'border-[#E3E7EE] bg-white text-[#3F4654] hover:border-[#BFD0FD]'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                                on ? 'border-[#235BF7] bg-[#235BF7] text-white' : 'border-[#CBD2DE]'
                              }`}
                            >
                              {on && <Check className="w-3 h-3" />}
                            </span>
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}

            {step === 2 && (
              <>
                <StepTitle
                  title="Photos et vidéo"
                  text={`Jusqu’à ${MAX_PHOTOS} photos. La première est la photo principale. Vous pourrez en ajouter d’autres plus tard.`}
                />
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {photos.map((url, i) => (
                    <div
                      key={url + i}
                      className="relative aspect-square rounded-2xl overflow-hidden border border-[#E3E7EE] bg-[#F6F7F9]"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#201D1D]/85 text-white text-[11px] font-bold">
                          Principale
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                        aria-label="Retirer la photo"
                        className="absolute top-1.5 right-1.5 w-9 h-9 rounded-full bg-white/95 text-[#DC2626] shadow-sm flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => photoInput.current?.click()}
                      disabled={photoProgress !== null}
                      className="aspect-square rounded-2xl border-2 border-dashed border-[#BFD0FD] hover:border-[#235BF7] hover:bg-[#F7F9FF] text-[#235BF7] flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:cursor-wait transition-colors"
                    >
                      {photoProgress !== null ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-[12px] font-bold">{photoProgress} %</span>
                        </>
                      ) : (
                        <>
                          <ImagePlus className="w-6 h-6" />
                          <span className="text-[12px] font-bold">Ajouter</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    void addPhotoFiles(e.target.files);
                    e.target.value = '';
                  }}
                />

                {photos.length < MAX_PHOTOS && (
                  <div>
                    <label
                      htmlFor="p-link"
                      className="flex items-center gap-1.5 text-[14px] font-semibold text-[#201D1D]"
                    >
                      <Link2 className="w-4 h-4 text-[#7A808C]" /> Ou collez le lien d’une image
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        id="p-link"
                        type="url"
                        inputMode="url"
                        value={photoLink}
                        onChange={(e) => setPhotoLink(e.target.value)}
                        placeholder="https://…"
                        className={`${input} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={addPhotoLink}
                        disabled={!photoLink.trim()}
                        className={btnGhost}
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                )}

                <section className="p-4 sm:p-5 rounded-[22px] bg-[#F6F8FC] border border-[#E6EBF5] space-y-3">
                  <div className="flex items-start gap-3">
                    <IconTile>
                      <Film className="w-5 h-5" />
                    </IconTile>
                    <div>
                      <p className="text-[15px] font-bold text-[#201D1D]">
                        Vidéo de démonstration{' '}
                        <span className="font-normal text-[#7A808C]">(facultatif)</span>
                      </p>
                      <p className="text-[13px] text-[#7A808C]">
                        Une vidéo verticale rassure et fait vendre davantage sur mobile.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="Lien TikTok, YouTube ou MP4"
                      aria-label="Lien de la vidéo"
                      className={`${input} sm:flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => videoInput.current?.click()}
                      disabled={videoProgress !== null}
                      className={`${btnGhost} sm:shrink-0`}
                    >
                      {videoProgress !== null ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> {videoProgress} %
                        </>
                      ) : (
                        <>
                          <Film className="w-4 h-4" /> Importer une vidéo
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    ref={videoInput}
                    type="file"
                    accept="video/*"
                    hidden
                    onChange={(e) => {
                      void uploadVideo(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </section>
                {mediaError && (
                  <p role="alert" className="text-[14px] font-semibold text-[#DC2626]">
                    {mediaError}
                  </p>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <StepTitle
                  title="Prix et livraison"
                  text="Un prix barré montre l’économie réalisée ; la livraison offerte rassure vos clients."
                />
                <div className="grid grid-cols-2 items-end gap-3 sm:gap-4">
                  <MoneyField
                    id="p-price"
                    label="Prix de vente"
                    value={price}
                    onChange={setPrice}
                  />
                  <MoneyField
                    id="p-old"
                    label={
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        Prix barré{' '}
                        <span className="hidden sm:inline font-normal text-[#7A808C]">
                          (facultatif)
                        </span>
                        {discount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[12px] font-bold">
                            <BadgePercent className="w-3.5 h-3.5" /> -{discount} %
                          </span>
                        )}
                      </span>
                    }
                    value={originalPrice}
                    onChange={setOriginalPrice}
                    {...(originalPrice > 0 && originalPrice <= price
                      ? { hint: 'Doit être plus élevé que le prix de vente pour s’afficher.' }
                      : {})}
                  />
                </div>

                <fieldset>
                  <legend className="text-[14px] font-semibold text-[#201D1D]">Livraison</legend>
                  <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-2.5 sm:gap-3">
                    {[
                      {
                        on: freeShipping,
                        set: () => setFreeShipping(true),
                        icon: <Gift className="w-5 h-5" />,
                        title: 'Livraison offerte',
                        text: 'Le client ne paie que le produit.',
                      },
                      {
                        on: !freeShipping,
                        set: () => setFreeShipping(false),
                        icon: <Truck className="w-5 h-5" />,
                        title: 'Livraison payante',
                        text: 'Des frais fixes s’ajoutent au total.',
                      },
                    ].map((o) => (
                      <button
                        key={o.title}
                        type="button"
                        role="radio"
                        aria-checked={o.on}
                        onClick={o.set}
                        className={`relative min-h-16 p-3 sm:p-3.5 rounded-2xl border-2 text-left flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3 cursor-pointer transition-colors ${
                          o.on
                            ? 'border-[#235BF7] bg-[#F7F9FF]'
                            : 'border-[#E3E7EE] bg-white hover:border-[#BFD0FD]'
                        }`}
                      >
                        <span
                          className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                            o.on ? 'bg-[#235BF7] text-white' : 'bg-[#F1F3F6] text-[#3F4654]'
                          }`}
                        >
                          {o.icon}
                        </span>
                        <span>
                          <span className="block text-[14px] sm:text-[15px] font-bold text-[#201D1D] leading-tight">
                            {o.title}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] sm:text-[13px] text-[#7A808C] leading-snug">
                            {o.text}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                {!freeShipping && (
                  <div className="sm:max-w-xs">
                    <MoneyField
                      id="p-fee"
                      label="Frais de livraison"
                      value={deliveryFee}
                      onChange={setDeliveryFee}
                    />
                  </div>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <StepTitle
                  title="Texte de vente"
                  text="L’IA rédige la description, les points forts, un comparatif et une FAQ. Relisez, modifiez ce que vous voulez, puis créez le produit."
                />

                {!content && (
                  <section className="relative overflow-hidden p-5 sm:p-7 rounded-[24px] border border-[#DCE3FF] bg-[radial-gradient(120%_120%_at_0%_0%,#EEF3FF_0%,#F7F5FF_45%,#FFFFFF_100%)] text-center">
                    <span className="mx-auto w-16 h-16 rounded-[20px] bg-white border border-[#E4E9FF] shadow-[0_14px_30px_-14px_rgba(35,91,247,0.55)] flex items-center justify-center">
                      {contentBusy ? (
                        <Loader2 className="w-7 h-7 animate-spin text-[#235BF7]" />
                      ) : (
                        <AiIcon className="w-8 h-8" />
                      )}
                    </span>
                    <p className="mt-4 text-[17px] font-extrabold text-[#201D1D]">
                      {contentBusy
                        ? 'Rédaction en cours…'
                        : 'Votre page de vente, rédigée en quelques secondes'}
                    </p>
                    <p className="mt-1.5 mx-auto max-w-md text-[14px] text-[#3F4654] leading-relaxed">
                      {contentBusy
                        ? 'Analyse du produit, arguments, comparatif et questions fréquentes…'
                        : `Pour « ${productName.trim()} ». Facultatif : vous pouvez aussi créer le produit et écrire le texte vous-même.`}
                    </p>
                    {contentBusy ? (
                      <div className="mt-5 mx-auto max-w-sm space-y-2" aria-hidden="true">
                        {[92, 78, 85].map((w) => (
                          <span
                            key={w}
                            className="block h-2.5 rounded-full bg-gradient-to-r from-[#E3E9FF] via-[#F1EDFF] to-[#E3E9FF] animate-pulse"
                            style={{ width: `${w}%` }}
                          />
                        ))}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void generateContent()}
                        className="mt-5 min-h-12 px-6 rounded-xl bg-gradient-to-r from-[#235BF7] to-[#6D4AFF] hover:brightness-110 text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shadow-[0_10px_24px_-10px_rgba(80,70,255,0.7)] w-full sm:w-auto transition"
                      >
                        <AiIcon className="w-[18px] h-[18px]" tone="white" />
                        Rédiger avec l’IA
                      </button>
                    )}
                  </section>
                )}

                {contentError && (
                  <p role="alert" className="text-[14px] font-semibold text-[#DC2626]">
                    {contentError}
                  </p>
                )}

                {content && (
                  <div className="space-y-3">
                    {/* Barre d’état + régénération */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F6F8FC] border border-[#E6EBF5] flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#201D1D]">
                        <AiIcon className="w-[18px] h-[18px]" />
                        {edited ? 'Texte modifié par vous' : 'Rédigé par l’IA · modifiable'}
                      </span>
                      {confirmRegen ? (
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <span className="text-[13px] text-[#3F4654]">
                            Remplacer vos modifications ?
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmRegen(false);
                              void generateContent();
                            }}
                            className="min-h-10 px-3 rounded-lg bg-[#235BF7] text-white text-[13px] font-semibold cursor-pointer"
                          >
                            Oui, régénérer
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRegen(false)}
                            className="min-h-10 px-3 rounded-lg border border-[#E3E7EE] bg-white text-[13px] font-semibold text-[#3F4654] cursor-pointer"
                          >
                            Annuler
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => (edited ? setConfirmRegen(true) : void generateContent())}
                          disabled={contentBusy}
                          className="min-h-10 px-3 rounded-lg border border-[#DCE3FF] bg-white text-[13px] font-semibold text-[#235BF7] hover:bg-[#EEF3FF] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                        >
                          <RefreshCw className={`w-4 h-4 ${contentBusy ? 'animate-spin' : ''}`} />
                          {contentBusy ? 'Régénération…' : 'Régénérer'}
                        </button>
                      )}
                    </div>

                    <div
                      className={`space-y-3 transition-opacity ${contentBusy ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <CopySection
                        icon={<FileText className="w-[18px] h-[18px]" />}
                        title="Description"
                        editing={editing.has('desc')}
                        onToggle={() => toggleEdit('desc')}
                      >
                        {editing.has('desc') ? (
                          <textarea
                            value={content.description}
                            onChange={(e) => patchContent({ description: e.target.value })}
                            rows={8}
                            aria-label="Description"
                            className={`${input} py-3 leading-relaxed resize-y`}
                          />
                        ) : (
                          <p className="text-[14px] text-[#3F4654] leading-relaxed whitespace-pre-line">
                            {content.description}
                          </p>
                        )}
                      </CopySection>

                      <CopySection
                        icon={<ListChecks className="w-[18px] h-[18px]" />}
                        title="Points forts"
                        editing={editing.has('benefits')}
                        onToggle={() => toggleEdit('benefits')}
                      >
                        {editing.has('benefits') ? (
                          <div className="space-y-2">
                            {content.benefits.map((b, i) => (
                              <div key={i} className="flex gap-2">
                                <input
                                  value={b}
                                  onChange={(e) =>
                                    patchContent({
                                      benefits: content.benefits.map((x, j) =>
                                        j === i ? e.target.value : x,
                                      ),
                                    })
                                  }
                                  aria-label={`Point fort ${i + 1}`}
                                  className={`${input} flex-1`}
                                />
                                <RemoveButton
                                  label="Retirer ce point fort"
                                  onClick={() =>
                                    patchContent({
                                      benefits: content.benefits.filter((_, j) => j !== i),
                                    })
                                  }
                                />
                              </div>
                            ))}
                            <AddButton
                              label="Ajouter un point fort"
                              onClick={() => patchContent({ benefits: [...content.benefits, ''] })}
                            />
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {content.benefits.filter(Boolean).map((b) => (
                              <li
                                key={b}
                                className="flex items-start gap-2.5 text-[14px] text-[#201D1D]"
                              >
                                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                </span>
                                {b}
                              </li>
                            ))}
                          </ul>
                        )}
                      </CopySection>

                      <CopySection
                        icon={<Scale className="w-[18px] h-[18px]" />}
                        title="Comparatif"
                        editing={editing.has('compare')}
                        onToggle={() => toggleEdit('compare')}
                      >
                        {editing.has('compare') ? (
                          <div className="space-y-3">
                            {content.comparison.rows.map((row, i) => (
                              <div key={row.id} className="p-3 rounded-xl bg-[#F6F8FC] space-y-2">
                                <div className="flex gap-2">
                                  <input
                                    value={row.criterion}
                                    onChange={(e) => patchRow(i, { criterion: e.target.value })}
                                    placeholder="Critère"
                                    aria-label={`Critère ${i + 1}`}
                                    className={`${input} flex-1 font-semibold`}
                                  />
                                  <RemoveButton
                                    label="Retirer cette ligne"
                                    onClick={() => removeRow(i)}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    value={cellText(row.ours)}
                                    onChange={(e) =>
                                      patchRow(i, { ours: { kind: 'text', text: e.target.value } })
                                    }
                                    placeholder={content.comparison.oursLabel}
                                    aria-label={`${content.comparison.oursLabel}, ligne ${i + 1}`}
                                    className={input}
                                  />
                                  <input
                                    value={cellText(row.others)}
                                    onChange={(e) =>
                                      patchRow(i, {
                                        others: { kind: 'text', text: e.target.value },
                                      })
                                    }
                                    placeholder={content.comparison.othersLabel}
                                    aria-label={`${content.comparison.othersLabel}, ligne ${i + 1}`}
                                    className={input}
                                  />
                                </div>
                              </div>
                            ))}
                            <AddButton label="Ajouter une ligne" onClick={addRow} />
                          </div>
                        ) : (
                          <div className="rounded-xl border border-[#ECEFF4] overflow-hidden text-[13px] sm:text-[14px]">
                            <div className="grid grid-cols-[1.2fr_1fr_1fr] bg-[#F6F8FC] font-bold text-[12px] uppercase tracking-wide">
                              <span className="px-3 py-2 text-[#7A808C]">Critère</span>
                              <span className="px-3 py-2 text-emerald-700">
                                {content.comparison.oursLabel}
                              </span>
                              <span className="px-3 py-2 text-rose-600">
                                {content.comparison.othersLabel}
                              </span>
                            </div>
                            {content.comparison.rows.map((r) => (
                              <div
                                key={r.id}
                                className="grid grid-cols-[1.2fr_1fr_1fr] border-t border-[#F1F3F6]"
                              >
                                <span className="px-3 py-2.5 font-semibold text-[#201D1D]">
                                  {r.criterion}
                                </span>
                                <span className="px-3 py-2.5 text-emerald-700">
                                  {cellText(r.ours)}
                                </span>
                                <span className="px-3 py-2.5 text-rose-600">
                                  {cellText(r.others)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CopySection>

                      <CopySection
                        icon={<MessagesSquare className="w-[18px] h-[18px]" />}
                        title="Questions fréquentes"
                        editing={editing.has('faq')}
                        onToggle={() => toggleEdit('faq')}
                      >
                        {editing.has('faq') ? (
                          <div className="space-y-3">
                            {content.faqItems.map((f, i) => (
                              <div key={f.id} className="p-3 rounded-xl bg-[#F6F8FC] space-y-2">
                                <div className="flex gap-2">
                                  <input
                                    value={f.question}
                                    onChange={(e) => patchFaq(i, { question: e.target.value })}
                                    placeholder="Question"
                                    aria-label={`Question ${i + 1}`}
                                    className={`${input} flex-1 font-semibold`}
                                  />
                                  <RemoveButton
                                    label="Retirer cette question"
                                    onClick={() =>
                                      patchContent({
                                        faqItems: content.faqItems.filter((_, j) => j !== i),
                                      })
                                    }
                                  />
                                </div>
                                <textarea
                                  value={f.answer}
                                  onChange={(e) => patchFaq(i, { answer: e.target.value })}
                                  placeholder="Réponse"
                                  aria-label={`Réponse ${i + 1}`}
                                  rows={3}
                                  className={`${input} py-3 resize-y`}
                                />
                              </div>
                            ))}
                            <AddButton
                              label="Ajouter une question"
                              onClick={() =>
                                patchContent({
                                  faqItems: [
                                    ...content.faqItems,
                                    { id: `faq-${Date.now()}`, question: '', answer: '' },
                                  ],
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div className="divide-y divide-[#F1F3F6]">
                            {content.faqItems.map((f) => (
                              <div key={f.id} className="py-2.5 first:pt-0 last:pb-0">
                                <p className="text-[14px] font-bold text-[#201D1D]">{f.question}</p>
                                <p className="mt-0.5 text-[14px] text-[#3F4654] leading-relaxed">
                                  {f.answer}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CopySection>
                    </div>

                    <p className="flex items-start gap-2 text-[13px] text-[#7A808C]">
                      <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                      Les avis clients ne sont pas générés : ajoutez les vrais avis de vos clients
                      dans l’éditeur de la page.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pied */}
        <footer className="px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-[#ECEFF4] bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep((s) => (s - 1) as Step) : onClose())}
            disabled={busy}
            className={`${btnGhost} px-4`}
          >
            {step > 1 && <ChevronLeft className="w-4 h-4" />}
            {step > 1 ? 'Retour' : 'Annuler'}
          </button>
          <div className="flex-1" />
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={!canContinue || busy}
              className={`${btnPrimary} min-w-[140px]`}
            >
              Continuer <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className={`${btnPrimary} min-w-[160px]`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {content ? 'Créer le produit' : 'Créer sans texte IA'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
