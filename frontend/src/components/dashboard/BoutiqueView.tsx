'use client';

import { STORE_CATEGORIES } from '@/lib/store/categories';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutList,
  HelpCircle,
  MessageSquareQuote,
  ArrowDown,
  ArrowUp,
  Check,
  Globe,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Package,
  Plus,
  Rocket,
  Star,
  Trash2,
  Wallet,
  Lock,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { formatFCFA } from '@/lib/orderUtils';
import { storeOrigin } from '@/lib/store/subdomain';
import {
  ACCENT_PRESETS,
  BANNER_PLACEMENTS,
  type DirectPaymentMethod,
  type StoreBanner,
  type StoreSection,
  type StorefrontSettings,
} from '@/lib/store/storefront-types';
import type { FunnelPageConfig, FunnelPageItem } from '@/types/juula';
import { ImageField } from '@/components/store/ImageField';
import { SloganSuggester } from '@/components/store/SloganSuggester';
import { CategoryField } from '@/components/store/CategoryField';
import { ProductPicker } from '@/components/dashboard/ProductPicker';
import { TestimonialImages } from '@/components/store/TestimonialImages';
import { SectionLayout, type SectionItem } from '@/components/dashboard/SectionLayout';
import { FaqEditor } from '@/components/dashboard/ProductContentEditor';
import { Dropdown } from '@/components/ui/Dropdown';

type BoutiqueSection =
  | 'apercu'
  | 'identite'
  | 'bannieres'
  | 'articles'
  | 'sections'
  | 'faq'
  | 'paiements';

const SECTIONS: SectionItem<BoutiqueSection>[] = [
  { id: 'identite', label: 'Couverture & identité', icon: <ImageIcon /> },
  { id: 'bannieres', label: 'Bannières', icon: <Star /> },
  { id: 'articles', label: 'Articles', icon: <Package /> },
  { id: 'sections', label: 'Sections', icon: <LayoutList /> },
  { id: 'faq', label: 'FAQ', icon: <HelpCircle /> },
  { id: 'paiements', label: 'Paiements', icon: <Wallet /> },
  { id: 'apercu', label: 'Aperçu & publication', icon: <Globe /> },
];

/** What each step of the first-time setup asks the merchant to do. */
const STEP_HINTS: Record<BoutiqueSection, string> = {
  identite: 'Ajoutez votre logo, une image de couverture, un slogan et votre couleur.',
  bannieres: 'Mettez en avant une promotion ou une nouveauté (facultatif).',
  articles: 'Choisissez les produits visibles dans votre boutique et leur catégorie.',
  sections: 'Ajoutez des sections de produits ou des témoignages clients (facultatif).',
  faq: 'Répondez aux questions que vos clients posent souvent (facultatif).',
  paiements: 'Choisissez comment vos clients vous paient.',
  apercu: 'Vérifiez le rendu puis mettez votre boutique en ligne.',
};

interface BoutiqueViewProps {
  pages: FunnelPageItem[];
  /** Saves product-level shop fields (category, featured, showInStore). */
  onUpdateProduct: (id: string, patch: Partial<FunnelPageConfig>) => void;
  /** Free plan: opens the plan chooser before running `publish`. */
  onRequestPublish: (subject: string, publish: () => void) => void;
  storeName?: string | undefined;
  /** Creates a product (draft); returns it or null on failure. */
  onCreateProduct: (name: string) => Promise<FunnelPageItem | null>;
  /** Opens a product in the editor (onglet Produits). */
  onEditProduct: (id: string) => void;
}

const newId = () => Math.random().toString(36).slice(2, 10);

export const BoutiqueView: React.FC<BoutiqueViewProps> = ({
  pages,
  onUpdateProduct,
  onRequestPublish,
  storeName,
  onCreateProduct,
  onEditProduct,
}) => {
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);
  const [saved, setSaved] = useState<StorefrontSettings | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [newSection, setNewSection] = useState<{
    type: StoreSection['type'];
    title: string;
    subtitle: string;
  } | null>(null);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [confirmOnline, setConfirmOnline] = useState(false);
  const [onlineAccepted, setOnlineAccepted] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [section, setSection] = useState<BoutiqueSection>('apercu');

  useEffect(() => {
    api<{ settings: StorefrontSettings; isPro: boolean; subdomain: string | null }>(
      '/api/store/storefront',
    )
      .then((r) => {
        setSettings(r.settings);
        setSaved(r.settings);
        setSubdomain(r.subdomain);
        if (!r.settings.setupDone) setSection('identite');
      })
      .catch(() => setMessage({ tone: 'error', text: 'Impossible de charger votre boutique.' }));
  }, []);

  const published = pages.filter((p) => p.status === 'published');
  const categories = useMemo(
    () =>
      [...new Set(pages.map((p) => p.config.category?.trim()).filter(Boolean) as string[])].sort(),
    [pages],
  );

  const patch = async (body: Partial<StorefrontSettings>, okText: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const r = await api<{ settings: StorefrontSettings }>('/api/store/storefront', {
        method: 'PATCH',
        body,
      });
      setSettings(r.settings);
      setSaved(r.settings);
      setMessage({ tone: 'ok', text: okText });
    } catch (err) {
      setMessage({
        tone: 'error',
        text:
          err instanceof ApiError && typeof err.body.message === 'string'
            ? err.body.message
            : 'L’enregistrement a échoué. Réessayez.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Autosave: every change is saved on its own (only the fields that
  // changed), so nothing is lost when leaving the page.
  useEffect(() => {
    if (!settings || !saved) return;
    const now = fullPayloadOf(settings);
    const before = fullPayloadOf(saved);
    const changed = Object.fromEntries(
      Object.entries(now).filter(
        ([k, v]) => JSON.stringify(v) !== JSON.stringify((before as Record<string, unknown>)[k]),
      ),
    ) as Partial<StorefrontSettings>;
    if (Object.keys(changed).length === 0) return;
    const snapshot = JSON.stringify(settings);
    const timer = setTimeout(async () => {
      setSaveState('saving');
      try {
        const r = await api<{ settings: StorefrontSettings }>('/api/store/storefront', {
          method: 'PATCH',
          body: changed,
        });
        setSaved(r.settings);
        // Keep what the merchant typed meanwhile; adopt the server's
        // normalised values only if nothing changed since.
        setSettings((cur) => (cur && JSON.stringify(cur) === snapshot ? r.settings : cur));
        setMessage(null);
        setSaveState('saved');
        setTimeout(() => setSaveState((st) => (st === 'saved' ? 'idle' : st)), 2000);
      } catch (err) {
        setSaveState('idle');
        setMessage({
          tone: 'error',
          text:
            err instanceof ApiError && typeof err.body.message === 'string'
              ? err.body.message
              : err instanceof ApiError && err.status >= 500
                ? 'Le serveur n’a pas pu enregistrer vos modifications. Réessayez dans un instant.'
                : 'L’enregistrement automatique a échoué. Vérifiez votre connexion.',
        });
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [settings, saved]);

  if (!settings) {
    return message ? (
      <p className="py-24 text-center text-[14px] text-[#DC2626]">{message.text}</p>
    ) : (
      <div
        className="lg:grid lg:grid-cols-[230px_1fr] lg:gap-6"
        role="status"
        aria-label="Chargement"
      >
        <div className="hidden lg:block space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
        <div className="space-y-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  const set = (p: Partial<StorefrontSettings>) => setSettings({ ...settings, ...p });
  const moveBanner = (index: number, delta: -1 | 1) => {
    const next = [...settings.banners];
    const [moved] = next.splice(index, 1);
    next.splice(index + delta, 0, moved!);
    set({ banners: next });
  };

  const fullPayload = fullPayloadOf;

  /** New product for a banner / section: create it, attach it, save, open its editor. */
  const createProductFor = async (kind: 'banner' | 'section', blockId: string, name: string) => {
    if (kind === 'banner') {
      const b = settings.banners.find((x) => x.id === blockId);
      if (!b?.imageUrl || !b.title.trim()) {
        setMessage({ tone: 'error', text: 'Ajoutez d’abord l’image et le titre de la bannière.' });
        return;
      }
    } else if (!settings.sections.find((x) => x.id === blockId)?.title.trim()) {
      setMessage({ tone: 'error', text: 'Donnez d’abord un titre à la section.' });
      return;
    }
    const product = await onCreateProduct(name);
    if (!product) return;
    const slug = product.config.slug;
    const next: StorefrontSettings =
      kind === 'banner'
        ? {
            ...settings,
            banners: settings.banners.map((b) =>
              b.id === blockId ? { ...b, productSlugs: [...b.productSlugs, slug] } : b,
            ),
          }
        : {
            ...settings,
            sections: settings.sections.map((x) =>
              x.id === blockId ? { ...x, productSlugs: [...x.productSlugs, slug] } : x,
            ),
          };
    await patch(
      fullPayload(next),
      'Produit créé et ajouté. Complétez ses photos, son prix et sa description.',
    );
    onEditProduct(product.id);
  };

  const setSectionField = (id: string, p: Partial<StoreSection>) =>
    set({ sections: settings.sections.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const moveSection = (index: number, delta: -1 | 1) => {
    const next = [...settings.sections];
    const [moved] = next.splice(index, 1);
    next.splice(index + delta, 0, moved!);
    set({ sections: next });
  };
  const addSection = (type: StoreSection['type'], title: string, subtitle: string) => {
    const id = newId();
    set({
      sections: [
        ...settings.sections,
        {
          id,
          type,
          title: title.trim(),
          subtitle: subtitle.trim(),
          placement: 'after_products',
          productSlugs: [],
          images: [],
        },
      ],
    });
    setOpenSectionId(id);
    setTimeout(
      () =>
        document
          .getElementById(`section-${id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      150,
    );
  };

  const guided = !settings.setupDone;
  const stepIndex = Math.max(
    0,
    SECTIONS.findIndex((x) => x.id === section),
  );
  const goStep = (i: number) => {
    const next = SECTIONS[i];
    if (!next) return;
    setSection(next.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const url = subdomain ? storeOrigin(subdomain) : null;
  const previewHref = subdomain ? `/boutique/${subdomain}` : null;

  const setBanner = (id: string, p: Partial<StoreBanner>) =>
    set({ banners: settings.banners.map((b) => (b.id === id ? { ...b, ...p } : b)) });
  const setMethod = (id: string, p: Partial<DirectPaymentMethod>) =>
    set({
      directPaymentMethods: settings.directPaymentMethods.map((m) =>
        m.id === id ? { ...m, ...p } : m,
      ),
    });

  return (
    <div className="pb-24 space-y-4">
      <SectionLayout sections={SECTIONS} active={section} onChange={setSection}>
        {guided && (
          <div className="p-4 sm:p-5 rounded-[22px] bg-[#EEF3FF] border border-[#DFE8FF]">
            <p className="text-[13px] font-bold uppercase tracking-wide text-[#235BF7]">
              Création de votre boutique · Étape {stepIndex + 1} sur {SECTIONS.length}
            </p>
            <p className="mt-1 text-[15px] font-bold text-[#201D1D]">
              {SECTIONS[stepIndex]?.label}
            </p>
            <p className="text-[14px] text-[#3F4654]">{STEP_HINTS[section]}</p>
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {SECTIONS.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? 'bg-[#235BF7]' : 'bg-white'}`}
                />
              ))}
            </div>
          </div>
        )}
        {message && (
          <p
            role="status"
            className={`px-4 py-3 rounded-2xl text-[14px] font-semibold ${
              message.tone === 'ok'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-[#FEF2F2] text-[#DC2626]'
            }`}
          >
            {message.text}
          </p>
        )}

        {/* Status + link */}
        {section === 'apercu' && (
          <div className="p-5 sm:p-6 rounded-[28px] bg-white border border-[#ECEFF4] space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold text-[#201D1D]">Ma boutique</h2>
                <p className="mt-0.5 text-[14px] text-[#7A808C]">
                  {published.length} produit{published.length > 1 ? 's' : ''} visible
                  {published.length > 1 ? 's' : ''} dans la boutique
                </p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-bold ${
                  settings.published
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${settings.published ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
                {settings.published ? 'En ligne' : 'Brouillon'}
              </span>
            </div>

            {url && (
              <div className="flex items-center gap-2 h-12 pl-3.5 pr-1.5 rounded-2xl bg-[#F6F7F9] border border-[#E3E7EE]">
                <Globe className="w-4 h-4 shrink-0 text-[#235BF7]" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#201D1D]">
                  {url.replace(/^https?:\/\//, '')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(url).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    });
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-[#E3E7EE] text-[13px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? 'Copié' : 'Copier'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              {previewHref && (
                <a
                  href={previewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-[#E3E7EE] bg-white text-[14px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#235BF7]" /> Aperçu
                </a>
              )}
              {url && settings.published && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-[#E3E7EE] bg-white text-[14px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-[#235BF7]" /> Ouvrir
                </a>
              )}
              {settings.published ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void patch({ published: false }, 'Boutique dépubliée.')}
                  className="col-span-2 sm:ml-auto inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-[#E3E7EE] bg-white text-[14px] font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                >
                  <EyeOff className="w-4 h-4" /> Mettre hors ligne
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    onRequestPublish(
                      'votre boutique',
                      () => void patch({ published: true }, 'Votre boutique est en ligne !'),
                    )
                  }
                  className="col-span-2 sm:ml-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold cursor-pointer"
                >
                  <Rocket className="w-4 h-4" /> Publier en ligne
                </button>
              )}
            </div>
          </div>
        )}

        {/* Appearance */}
        {section === 'identite' && (
          <Section title="Couverture & identité" icon={<ImageIcon className="w-4 h-4" />}>
            <div className="max-w-2xl">
              <ImageField
                label="Image de couverture"
                value={settings.coverUrl}
                onChange={(coverUrl) => set({ coverUrl })}
                aspect="aspect-[8/3]"
                hint="Format conseillé : 1920 × 720 px (paysage 8:3), JPG ou PNG, 10 Mo maximum. Gardez le sujet au centre : les côtés sont recadrés sur téléphone."
                onError={(text) => setMessage({ tone: 'error', text })}
              />
            </div>
            <label className="block space-y-1.5">
              <span className="text-[14px] font-semibold text-[#201D1D]">
                Slogan / courte description
              </span>
              <input
                value={settings.tagline}
                maxLength={140}
                onChange={(e) => set({ tagline: e.target.value })}
                placeholder="Ex : Mode féminine tendance, livrée chez vous à Dakar"
                className={INPUT}
              />
              <span className="block text-[13px] text-[#7A808C]">
                {settings.tagline.length} / 140
              </span>
            </label>
            <SloganSuggester storeName={storeName} onPick={(tagline) => set({ tagline })} />
            <div className="space-y-1.5">
              <span className="text-[14px] font-semibold text-[#201D1D]">
                Catégorie de la boutique
              </span>
              <div className="flex flex-wrap gap-2">
                {STORE_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => set({ category: settings.category === c.id ? null : c.id })}
                    aria-pressed={settings.category === c.id}
                    className={`min-h-10 px-3.5 rounded-full border text-[13px] font-semibold transition-colors cursor-pointer ${
                      settings.category === c.id
                        ? 'bg-[#235BF7] border-[#235BF7] text-white'
                        : 'bg-white border-[#E3E7EE] text-[#3F4654] hover:bg-[#F6F7F9]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <span className="block text-[13px] text-[#7A808C]">
                Votre boutique apparaît dans cette catégorie de l’annuaire public
                juula.store/boutiques.
              </span>
            </div>
            <div className="space-y-1.5">
              <span className="text-[14px] font-semibold text-[#201D1D]">Couleur des boutons</span>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => set({ accent: c.hex })}
                    title={c.label}
                    aria-label={c.label}
                    aria-pressed={settings.accent === c.hex}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                      settings.accent === c.hex ? 'border-[#201D1D]' : 'border-transparent'
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: c.hex }}
                    >
                      {settings.accent === c.hex && <Check className="w-4 h-4" />}
                    </span>
                  </button>
                ))}
                <label
                  title="Couleur personnalisée"
                  className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                    ACCENT_PRESETS.some((c) => c.hex === settings.accent)
                      ? 'border-transparent'
                      : 'border-[#201D1D]'
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-full"
                    style={{
                      background:
                        'conic-gradient(#DB2777, #A16207, #16794A, #0284C7, #7C3AED, #DB2777)',
                    }}
                  />
                  <input
                    type="color"
                    value={settings.accent}
                    onChange={(e) => set({ accent: e.target.value.toUpperCase() })}
                    aria-label="Couleur personnalisée"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </div>
              <p className="text-[13px] text-[#7A808C]">
                {ACCENT_PRESETS.find((c) => c.hex === settings.accent)?.label ??
                  `Couleur personnalisée ${settings.accent}`}
              </p>
              <div className="pt-1">
                <span
                  className="inline-flex items-center h-11 px-5 rounded-full text-white text-[14px] font-semibold"
                  style={{ backgroundColor: settings.accent }}
                >
                  Aperçu du bouton
                </span>
              </div>
            </div>
          </Section>
        )}

        {/* Banners */}
        {section === 'bannieres' && (
          <Section
            title="Bannières promotionnelles"
            icon={<Star className="w-4 h-4" />}
            hint="Ex : « Offre du moment », « Nouveautés », « Déstockage ». Choisissez où la bannière apparaît et les produits que son bouton affiche."
          >
            {settings.banners.map((b, i) => (
              <div key={b.id} className="p-4 rounded-2xl border border-[#ECEFF4] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#201D1D]">Bannière {i + 1}</span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveBanner(i, -1)}
                      aria-label="Monter la bannière"
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[#3F4654] hover:bg-[#F6F7F9] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={i === settings.banners.length - 1}
                      onClick={() => moveBanner(i, 1)}
                      aria-label="Descendre la bannière"
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[#3F4654] hover:bg-[#F6F7F9] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        set({ banners: settings.banners.filter((x) => x.id !== b.id) })
                      }
                      aria-label="Supprimer la bannière"
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </span>
                </div>
                <div className="max-w-2xl">
                  <ImageField
                    label="Image"
                    value={b.imageUrl || null}
                    onChange={(imageUrl) => setBanner(b.id, { imageUrl: imageUrl ?? '' })}
                    aspect="aspect-[3/1]"
                    hint="Format conseillé : 1920 × 640 px (paysage 3:1), JPG ou PNG. Laissez de la place à gauche pour le texte."
                    onError={(text) => setMessage({ tone: 'error', text })}
                  />
                </div>
                <label className="block space-y-1.5 max-w-sm">
                  <span className="text-[14px] font-semibold text-[#201D1D]">
                    Emplacement sur la boutique
                  </span>
                  <Dropdown
                    label="Emplacement sur la boutique"
                    value={b.placement}
                    onChange={(placement) => setBanner(b.id, { placement })}
                    options={BANNER_PLACEMENTS.map((pl) => ({ value: pl.id, label: pl.label }))}
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={b.badge}
                    maxLength={40}
                    onChange={(e) => setBanner(b.id, { badge: e.target.value })}
                    placeholder="Badge (ex : Offre du moment)"
                    className={INPUT}
                  />
                  <input
                    value={b.title}
                    maxLength={80}
                    onChange={(e) => setBanner(b.id, { title: e.target.value })}
                    placeholder="Titre (ex : La mode qui vous ressemble)"
                    className={INPUT}
                  />
                  <input
                    value={b.buttonLabel}
                    maxLength={40}
                    onChange={(e) => setBanner(b.id, { buttonLabel: e.target.value })}
                    placeholder="Texte du bouton (ex : Explorer)"
                    className={INPUT}
                  />
                  {b.productSlugs.length === 0 && (
                    <Dropdown
                      label="Ce que le bouton affiche"
                      value={b.category}
                      onChange={(category) => setBanner(b.id, { category })}
                      options={[
                        { value: '', label: 'Le bouton affiche : tous les articles' },
                        ...categories.map((c) => ({ value: c, label: `Le bouton affiche : ${c}` })),
                      ]}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[14px] font-semibold text-[#201D1D]">
                    Produits de cette bannière ({b.productSlugs.length})
                  </p>
                  <p className="text-[13px] text-[#7A808C]">
                    Le bouton de la bannière affiche ces produits (ex : les articles en promotion).
                    Ils sont achetables depuis la bannière, même s’ils sont masqués du catalogue.
                  </p>
                  <ProductPicker
                    pages={pages}
                    selected={b.productSlugs}
                    onChange={(productSlugs) => setBanner(b.id, { productSlugs })}
                    onCreate={(name) => createProductFor('banner', b.id, name)}
                    createLabel="Créer un produit pour cette bannière"
                  />
                </div>
              </div>
            ))}
            {settings.banners.length < 5 && (
              <button
                type="button"
                onClick={() =>
                  set({
                    banners: [
                      ...settings.banners,
                      {
                        id: newId(),
                        imageUrl: '',
                        title: '',
                        badge: 'Offre du moment',
                        buttonLabel: 'Découvrir',
                        category: '',
                        placement: 'before_products',
                        productSlugs: [],
                      },
                    ],
                  })
                }
                className="w-full h-11 rounded-xl border border-dashed border-[#D5DAE2] text-[14px] font-semibold text-[#235BF7] hover:bg-[#F6F7F9] inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Ajouter une bannière
              </button>
            )}
          </Section>
        )}

        {/* Products in the shop */}
        {section === 'articles' && (
          <Section
            title="Articles de la boutique"
            icon={<Package className="w-4 h-4" />}
            hint="Choisissez les produits affichés dans la boutique (un nouveau produit n’y est pas ajouté automatiquement). Ajoutez une catégorie pour les filtres et mettez vos meilleurs articles en vedette."
          >
            {pages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    pages
                      .filter((p) => p.config.showInStore !== true && p.status !== 'inactive')
                      .forEach((p) => onUpdateProduct(p.id, { showInStore: true }))
                  }
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold cursor-pointer"
                >
                  <Eye className="w-4 h-4" /> Afficher tous les produits
                </button>
                <button
                  type="button"
                  onClick={() =>
                    pages
                      .filter((p) => p.config.showInStore === true)
                      .forEach((p) => onUpdateProduct(p.id, { showInStore: false }))
                  }
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[#E3E7EE] text-[14px] font-semibold text-[#3F4654] hover:bg-[#F6F7F9] cursor-pointer"
                >
                  <EyeOff className="w-4 h-4" /> Tout masquer
                </button>
              </div>
            )}
            {pages.length === 0 ? (
              <p className="py-6 text-center text-[14px] text-[#9AA0AB]">
                Aucun produit. Créez-en un dans l’onglet « Produits ».
              </p>
            ) : (
              <ul className="divide-y divide-[#F1F3F6]">
                {pages.map((p) => {
                  const image = p.config.mediaItems.find((m) => m.type === 'image')?.url;
                  const inStore = p.config.showInStore === true;
                  return (
                    <li key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-12 h-12 rounded-xl overflow-hidden bg-[#F1F3F6] shrink-0">
                          {image && (
                            <img src={image} alt="" className="w-full h-full object-cover" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-bold text-[14px] text-[#201D1D] truncate">
                            {p.config.productTitle || p.internalName}
                          </span>
                          <span className="block text-[13px] text-[#7A808C]">
                            {formatFCFA(p.config.price)} ·{' '}
                            {p.status === 'inactive'
                              ? 'Désactivé (jamais visible)'
                              : inStore
                                ? 'Visible en boutique'
                                : 'Masqué en boutique'}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CategoryField
                          value={p.config.category ?? ''}
                          existing={categories}
                          label={`Catégorie de ${p.config.productTitle}`}
                          onChange={(category) => onUpdateProduct(p.id, { category })}
                        />
                        <Toggle
                          label="En vedette"
                          on={p.config.featured === true}
                          onClick={() => onUpdateProduct(p.id, { featured: !p.config.featured })}
                        />
                        <Toggle
                          label={inStore ? 'Visible' : 'Masqué'}
                          on={inStore}
                          onClick={() => onUpdateProduct(p.id, { showInStore: !inStore })}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        )}

        {/* Custom sections */}
        {section === 'sections' && (
          <Section
            title="Sections de la boutique"
            icon={<LayoutList className="w-4 h-4" />}
            hint="Créez autant de sections que vous voulez : une collection de produits (ex : « Nouvelle collection ») ou des témoignages (captures de vrais messages clients)."
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setNewSection({ type: 'products', title: '', subtitle: '' })}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Section produits
              </button>
              <button
                type="button"
                onClick={() =>
                  setNewSection({
                    type: 'testimonials',
                    title: 'Ce que disent nos clients',
                    subtitle: 'De vrais messages reçus de nos clients.',
                  })
                }
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[#E3E7EE] text-[14px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] cursor-pointer"
              >
                <MessageSquareQuote className="w-4 h-4 text-[#235BF7]" /> Section témoignages
              </button>
            </div>
            {settings.sections.length === 0 && (
              <p className="py-6 text-center text-[14px] text-[#9AA0AB]">
                Aucune section pour le moment.
              </p>
            )}
            {settings.sections.map((x, i) => (
              <div
                key={x.id}
                id={`section-${x.id}`}
                className={`p-4 rounded-2xl border space-y-3 scroll-mt-28 ${
                  openSectionId === x.id
                    ? 'border-[#235BF7] ring-2 ring-[#235BF7]/15'
                    : 'border-[#ECEFF4]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[14px] font-bold text-[#201D1D]">
                    {x.type === 'testimonials' ? (
                      <MessageSquareQuote className="w-4 h-4 text-[#235BF7]" />
                    ) : (
                      <Package className="w-4 h-4 text-[#235BF7]" />
                    )}
                    {x.type === 'testimonials' ? 'Témoignages' : 'Produits'} · section {i + 1}
                  </span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveSection(i, -1)}
                      aria-label="Monter la section"
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[#3F4654] hover:bg-[#F6F7F9] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={i === settings.sections.length - 1}
                      onClick={() => moveSection(i, 1)}
                      aria-label="Descendre la section"
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[#3F4654] hover:bg-[#F6F7F9] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        set({ sections: settings.sections.filter((y) => y.id !== x.id) })
                      }
                      aria-label="Supprimer la section"
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                  <input
                    value={x.title}
                    maxLength={80}
                    onChange={(e) => setSectionField(x.id, { title: e.target.value })}
                    placeholder="Titre de la section *"
                    aria-label="Titre de la section"
                    className={INPUT}
                  />
                  {x.type === 'testimonials' ? (
                    <p className="flex items-center px-3.5 min-h-11 rounded-xl bg-[#F6F7F9] text-[13px] text-[#7A808C]">
                      Affichée en bas de la boutique, juste avant la FAQ.
                    </p>
                  ) : (
                    <Dropdown
                      label="Emplacement de la section"
                      value={x.placement}
                      onChange={(placement) => setSectionField(x.id, { placement })}
                      options={BANNER_PLACEMENTS.map((pl) => ({ value: pl.id, label: pl.label }))}
                    />
                  )}
                  <input
                    value={x.subtitle}
                    maxLength={160}
                    onChange={(e) => setSectionField(x.id, { subtitle: e.target.value })}
                    placeholder="Sous-titre"
                    aria-label="Sous-titre de la section"
                    className={`${INPUT} sm:col-span-2`}
                  />
                </div>
                {((x.type === 'products' && x.productSlugs.length === 0) ||
                  (x.type === 'testimonials' && x.images.length === 0)) && (
                  <p className="px-3.5 py-2.5 rounded-xl bg-amber-50 text-[13px] font-semibold text-amber-800">
                    {x.type === 'products'
                      ? 'Ajoutez au moins un produit : une section vide n’apparaît pas sur la boutique.'
                      : 'Ajoutez au moins une capture : une section vide n’apparaît pas sur la boutique.'}
                  </p>
                )}
                {x.type === 'products' ? (
                  <ProductPicker
                    pages={pages}
                    selected={x.productSlugs}
                    onChange={(productSlugs) => setSectionField(x.id, { productSlugs })}
                    onCreate={(name) => createProductFor('section', x.id, name)}
                    createLabel="Créer un produit pour cette section"
                  />
                ) : (
                  <TestimonialImages
                    images={x.images}
                    onChange={(images) => setSectionField(x.id, { images })}
                    onError={(text) => setMessage({ tone: 'error', text })}
                  />
                )}
              </div>
            ))}
          </Section>
        )}

        {/* FAQ */}
        {section === 'faq' && (
          <Section
            title="Questions fréquentes"
            icon={<HelpCircle className="w-4 h-4" />}
            hint="Affichées en accordéon tout en bas de votre boutique, juste avant le pied de page. Ajoutez-en autant que vous voulez."
          >
            <FaqEditor items={settings.faq} onChange={(faq) => set({ faq })} />
          </Section>
        )}

        {/* Payments */}
        {section === 'paiements' && (
          <Section
            title="Paiements des clients"
            icon={<Wallet className="w-4 h-4" />}
            hint="S’applique à votre boutique et à toutes vos pages de vente."
          >
            <div className="w-full flex items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-bold text-[#201D1D]">
                    Paiement en ligne par Mobile Money (Juula Finance)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black inline-flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-600" /> Bientôt disponible
                  </span>
                </div>
                <p className="text-[13px] text-[#7A808C] leading-relaxed">
                  L'encaissement direct sur votre boutique par Wave, Orange Money et carte bancaire
                  est temporairement verrouillé. Vos clients règlent via paiement à la livraison ou
                  WhatsApp.
                </p>
              </div>
              <span className="shrink-0 w-11 h-6 rounded-full p-0.5 bg-[#E2E8F0] opacity-50 cursor-not-allowed">
                <span className="block w-5 h-5 rounded-full bg-white shadow-xs" />
              </span>
            </div>
            <div className="space-y-3">
              <SwitchRow
                label="Paiement à la livraison"
                hint="Le client paie en espèces à la réception. Vous recevez un email à chaque commande."
                on={settings.codEnabled}
                onClick={() => set({ codEnabled: !settings.codEnabled })}
              />
              <div className="p-4 rounded-2xl bg-[#F6F7F9] text-[14px] text-[#3F4654]">
                <strong className="text-[#201D1D]">Commander sur WhatsApp</strong> : toujours
                proposé à vos clients. Les commandes arrivent dans « Commandes » et la conversation
                continue sur le WhatsApp de votre boutique (Paramètres → Ma boutique).
              </div>
              <div className="space-y-3">
                <p className="text-[14px] font-semibold text-[#201D1D]">
                  Moyens de paiement directs
                </p>
                <p className="text-[13px] text-[#7A808C]">
                  L’argent arrive directement sur votre compte, sans délai. La commande est marquée
                  « paiement à vérifier » : confirmez-la quand vous avez reçu l’argent.
                </p>
                {settings.directPaymentMethods.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl border border-[#ECEFF4] grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] items-start"
                  >
                    <input
                      value={m.name}
                      maxLength={40}
                      onChange={(e) => setMethod(m.id, { name: e.target.value })}
                      placeholder="Nom (ex : Wave Business)"
                      className={INPUT}
                    />
                    <input
                      value={m.url}
                      maxLength={500}
                      onChange={(e) => setMethod(m.id, { url: e.target.value })}
                      placeholder="Lien de paiement (https://…)"
                      className={INPUT}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set({
                          directPaymentMethods: settings.directPaymentMethods.filter(
                            (x) => x.id !== m.id,
                          ),
                        })
                      }
                      aria-label="Supprimer ce moyen de paiement"
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="sm:col-span-3 max-w-[220px]">
                      <ImageField
                        label="QR code marchand (facultatif)"
                        value={m.qrUrl}
                        onChange={(qrUrl) => setMethod(m.id, { qrUrl })}
                        aspect="aspect-square"
                        onError={(text) => setMessage({ tone: 'error', text })}
                      />
                    </div>
                  </div>
                ))}
                {settings.directPaymentMethods.length < 5 && (
                  <button
                    type="button"
                    onClick={() =>
                      set({
                        directPaymentMethods: [
                          ...settings.directPaymentMethods,
                          { id: newId(), name: '', url: '', qrUrl: null },
                        ],
                      })
                    }
                    className="w-full h-11 rounded-xl border border-dashed border-[#D5DAE2] text-[14px] font-semibold text-[#235BF7] hover:bg-[#F6F7F9] inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Ajouter un moyen de paiement direct
                  </button>
                )}
              </div>
            </div>
          </Section>
        )}

        {newSection && (
          <div
            className="fixed inset-0 z-[70] bg-[#201D1D]/40 flex items-end sm:items-center justify-center sm:p-4"
            onClick={() => setNewSection(null)}
          >
            <form
              role="dialog"
              aria-modal="true"
              aria-label="Nouvelle section"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSection.title.trim()) return;
                addSection(newSection.type, newSection.title, newSection.subtitle);
                setNewSection(null);
              }}
              className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] p-6 space-y-4"
            >
              <h3 className="text-lg font-extrabold text-[#201D1D]">
                {newSection.type === 'testimonials'
                  ? 'Nouvelle section témoignages'
                  : 'Nouvelle section produits'}
              </h3>
              <label className="block space-y-1.5">
                <span className="text-[14px] font-semibold text-[#201D1D]">
                  {newSection.type === 'testimonials'
                    ? 'Titre de la section'
                    : 'Nom de la collection / section'}{' '}
                  *
                </span>
                <input
                  autoFocus
                  required
                  maxLength={80}
                  value={newSection.title}
                  onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                  placeholder="Ex : Nouvelle collection"
                  className={INPUT}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[14px] font-semibold text-[#201D1D]">
                  Sous-titre (facultatif)
                </span>
                <input
                  maxLength={160}
                  value={newSection.subtitle}
                  onChange={(e) => setNewSection({ ...newSection, subtitle: e.target.value })}
                  placeholder="Ex : Les pièces de la saison, en quantité limitée."
                  className={INPUT}
                />
              </label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setNewSection(null)}
                  className="h-11 rounded-xl border border-[#E3E7EE] text-[14px] font-semibold text-[#201D1D] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newSection.title.trim()}
                  className="h-11 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] disabled:opacity-50 text-white text-[14px] font-semibold cursor-pointer"
                >
                  Créer la section
                </button>
              </div>
              <p className="text-[13px] text-[#7A808C]">
                {newSection.type === 'testimonials'
                  ? 'Vous ajouterez ensuite les captures de vos témoignages.'
                  : 'Vous ajouterez ensuite les produits de cette section.'}
              </p>
            </form>
          </div>
        )}

        {confirmOnline && (
          <div
            className="fixed inset-0 z-[70] bg-[#201D1D]/40 flex items-end sm:items-center justify-center sm:p-4"
            onClick={() => setConfirmOnline(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Activer le paiement en ligne"
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] p-6 space-y-4"
            >
              <h3 className="text-lg font-extrabold text-[#201D1D]">
                Activer le paiement en ligne ?
              </h3>
              <ul className="space-y-2.5 text-[14px] text-[#3F4654]">
                <li className="flex gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#235BF7]" />
                  Vos clients pourront payer par Mobile Money (Wave, Orange Money) ou carte, sur
                  votre boutique et vos pages produits.
                </li>
                <li className="flex gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#235BF7]" />
                  <span>
                    <strong>7,5 %</strong> sont prélevés par Juula sur chaque paiement en ligne.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#235BF7]" />
                  L’argent arrive sur votre portefeuille Juula et devient retirable 72 h après la
                  commande, vers votre Wave ou Orange Money.
                </li>
                <li className="flex gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#235BF7]" />
                  Vous pouvez le désactiver à tout moment. Le paiement à la livraison n’est pas
                  concerné.
                </li>
              </ul>
              <label className="flex items-start gap-3 p-3 rounded-2xl border border-[#E3E7EE] cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlineAccepted}
                  onChange={(e) => setOnlineAccepted(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-[#235BF7] shrink-0"
                />
                <span className="text-[14px] text-[#201D1D]">
                  J’accepte la commission de 7,5 % sur chaque paiement en ligne.
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmOnline(false)}
                  className="h-11 rounded-xl border border-[#E3E7EE] text-[14px] font-semibold text-[#201D1D] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!onlineAccepted}
                  onClick={() => {
                    set({ onlinePaymentsEnabled: true });
                    setConfirmOnline(false);
                    setOnlineAccepted(false);
                  }}
                  className="h-11 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] disabled:opacity-50 text-white text-[14px] font-semibold cursor-pointer"
                >
                  Activer
                </button>
              </div>
            </div>
          </div>
        )}

        {guided && (
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => goStep(stepIndex - 1)}
              className="h-12 px-5 rounded-full border border-[#E3E7EE] bg-white text-[15px] font-semibold text-[#201D1D] disabled:opacity-40 cursor-pointer disabled:cursor-default"
            >
              Précédent
            </button>
            {stepIndex < SECTIONS.length - 1 ? (
              <button
                type="button"
                onClick={() => goStep(stepIndex + 1)}
                className="h-12 px-6 rounded-full bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[15px] font-semibold cursor-pointer"
              >
                Continuer
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => void patch({ setupDone: true }, 'Votre boutique est prête.')}
                className="h-12 px-6 rounded-full bg-[#201D1D] hover:bg-black disabled:opacity-60 text-white text-[15px] font-semibold cursor-pointer"
              >
                Terminer la configuration
              </button>
            )}
          </div>
        )}

        {/* Autosave status */}
        {(saveState !== 'idle' || message?.tone === 'error') && (
          <div className="fixed bottom-20 lg:bottom-6 inset-x-4 lg:left-auto lg:right-8 z-40 flex flex-col items-center lg:items-end gap-2 pointer-events-none">
            {message?.tone === 'error' ? (
              <p
                role="alert"
                className="pointer-events-auto max-w-md px-4 py-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[14px] font-semibold text-[#B91C1C] shadow-sm"
              >
                {message.text}
              </p>
            ) : (
              <p
                role="status"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#201D1D] text-white text-[14px] font-semibold shadow-lg"
              >
                {saveState === 'saving' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-300" /> Enregistrement…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" /> Modifications enregistrées
                  </>
                )}
              </p>
            )}
          </div>
        )}
      </SectionLayout>
    </div>
  );
};

function fullPayloadOf(next: StorefrontSettings): Partial<StorefrontSettings> {
  return {
    tagline: next.tagline,
    category: next.category,
    coverUrl: next.coverUrl,
    accent: next.accent,
    banners: next.banners.filter((b) => b.imageUrl && b.title),
    sections: next.sections.filter((x) => x.title.trim()),
    faq: next.faq,
    codEnabled: next.codEnabled,
    onlinePaymentsEnabled: next.onlinePaymentsEnabled,
    directPaymentMethods: next.directPaymentMethods.filter((m) => m.name && (m.url || m.qrUrl)),
  };
}

const INPUT =
  'w-full px-3.5 py-2.5 rounded-xl border border-[#E3E7EE] bg-[#F6F7F9] text-[14px] text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white';

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}> = ({ title, icon, hint, children }) => (
  <section className="p-5 sm:p-6 rounded-[28px] bg-white border border-[#ECEFF4] space-y-4">
    <div className="flex items-start gap-3">
      <span className="w-9 h-9 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div>
        <h3 className="text-[16px] font-extrabold text-[#201D1D]">{title}</h3>
        {hint && <p className="text-[13px] text-[#7A808C]">{hint}</p>}
      </div>
    </div>
    {children}
  </section>
);

const Toggle: React.FC<{ label: string; on: boolean; onClick: () => void }> = ({
  label,
  on,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`shrink-0 h-10 px-3 rounded-xl text-[13px] font-semibold border transition-colors cursor-pointer ${
      on
        ? 'bg-[#EEF3FF] text-[#235BF7] border-[#BFD0FD]'
        : 'bg-white text-[#7A808C] border-[#E3E7EE]'
    }`}
  >
    {label}
  </button>
);

const SwitchRow: React.FC<{ label: string; hint: string; on: boolean; onClick: () => void }> = ({
  label,
  hint,
  on,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl border border-[#ECEFF4] text-left cursor-pointer disabled:cursor-not-allowed"
  >
    <span>
      <span className="block text-[14px] font-semibold text-[#201D1D]">{label}</span>
      <span className="block text-[13px] text-[#7A808C]">{hint}</span>
    </span>
    <span
      className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors ${on ? 'bg-[#235BF7]' : 'bg-[#D5DAE2]'}`}
    >
      <span
        className={`block w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`}
      />
    </span>
  </button>
);
