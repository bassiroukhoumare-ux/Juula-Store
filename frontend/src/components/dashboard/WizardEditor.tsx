'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Video,
  Image as ImageIcon,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Save,
  Clock,
  Truck,
  ShieldCheck,
  Plus,
  Trash2,
  ExternalLink,
  Wand2,
  Film,
  Camera,
  Headphones,
  Phone,
  Layers,
  CheckCircle2,
  ListOrdered,
  Store,
  Smartphone,
  PowerOff,
  Globe,
  AlertCircle,
  X,
  Palette,
  Box,
} from 'lucide-react';
import {
  FunnelPageConfig,
  FunnelPageItem,
  FunnelPageStatus,
  MediaItem,
  ProofItem,
  QuantityDiscountTier,
  ProductColorOption,
} from '@/types/juula';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { formatFCFA } from '@/lib/orderUtils';
import { uploadImage, uploadMedia } from '@/lib/upload';
import { useToast } from '@/contexts/ToastContext';

interface WizardEditorProps {
  initialConfig: FunnelPageConfig;
  onSaveConfig: (updated: FunnelPageConfig) => void;
  onOpenStorefrontPreview: () => void;
  onOpenMobileSimulator?: () => void;
  pages?: FunnelPageItem[];
  activePageId?: string;
  onSelectPage?: (pageId: string) => void;
  onCreatePage?: (internalName: string) => void;
  onUpdatePageStatus?: (pageId: string, status: FunnelPageStatus) => void;
  onDeletePage?: (pageId: string) => void;
}

export const WizardEditor: React.FC<WizardEditorProps> = ({
  initialConfig,
  onSaveConfig,
  onOpenStorefrontPreview,
  onOpenMobileSimulator,
  pages = [],
  activePageId,
  onSelectPage,
  onCreatePage,
  onUpdatePageStatus,
  onDeletePage,
}) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<FunnelPageConfig>(initialConfig);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSaved, setIsSaved] = useState(false);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  const [newPageNameInput, setNewPageNameInput] = useState('');

  // Sync config whenever initialConfig changes (e.g., selecting another page)
  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig.id, initialConfig]);

  const activePage = pages.find((p) => p.id === (activePageId || config.id));
  const currentStatus: FunnelPageStatus = activePage?.status || config.status || 'published';

  // File upload input ref (Demande Audio)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Media state
  const [newImageUrl, setNewImageUrl] = useState('');

  // Color options state
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#235BF7');

  const quickPalette = [
    { name: 'Noir', hex: '#111827' },
    { name: 'Blanc', hex: '#FFFFFF' },
    { name: 'Bleu Royal', hex: '#235BF7' },
    { name: 'Bleu Marine', hex: '#201D1D' },
    { name: 'Rouge', hex: '#EF4444' },
    { name: 'Vert Émeraude', hex: '#10B981' },
    { name: 'Or / Doré', hex: '#D97706' },
    { name: 'Argent / Gris', hex: '#94A3B8' },
    { name: 'Rose Poudré', hex: '#F472B6' },
    { name: 'Marron / Cuir', hex: '#78350F' },
  ];

  const handleAddColor = (name?: string, hex?: string) => {
    const targetName = (name !== undefined ? name : newColorName).trim();
    const targetHex = (hex !== undefined ? hex : newColorHex) || '#235BF7';
    if (!targetName) return;
    const colors = config.availableColors || [];
    if (colors.some((c) => c.name.toLowerCase() === targetName.toLowerCase())) return;
    const newColor: ProductColorOption = {
      id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: targetName,
      hex: targetHex,
    };
    const updated = {
      ...config,
      availableColors: [...colors, newColor],
    };
    setConfig(updated);
    onSaveConfig(updated);
    setNewColorName('');
  };

  const handleRemoveColor = (id: string) => {
    const colors = config.availableColors || [];
    const updated = {
      ...config,
      availableColors: colors.filter((c) => c.id !== id),
    };
    setConfig(updated);
    onSaveConfig(updated);
  };

  // Uploads go straight from the browser to Cloudinary (no size limit from
  // our server); `photoUploads` counts photos in flight, `photoProgress`
  // is the average progress shown on the "+ Ajouter photo" tile.
  const [photoUploads, setPhotoUploads] = useState(0);
  const [photoProgress, setPhotoProgress] = useState(0);
  const isUploadingPhoto = photoUploads > 0;
  const progressById = useRef(new Map<string, number>());

  const refreshPhotoProgress = () => {
    const values = [...progressById.current.values()];
    setPhotoProgress(
      values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0,
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0) return;

    const room = Math.max(0, 5 - config.mediaItems.length);
    if (files.length > room) {
      toast(
        room === 0
          ? 'Maximum 5 photos par produit.'
          : `Seulement ${room} photo(s) de plus possible(s).`,
        'error',
      );
    }

    files.slice(0, room).forEach((file, i) => {
      if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
        toast(`« ${file.name} » n’est pas une image.`, 'error');
        return;
      }
      const localMediaId = `med-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;

      // 1. Aperçu instantané (URL locale, jamais enregistrée en base)
      const previewUrl = URL.createObjectURL(file);
      setConfig((prev) => ({
        ...prev,
        mediaItems: [
          ...prev.mediaItems,
          {
            id: localMediaId,
            type: 'image',
            url: previewUrl,
            isPrimary: prev.mediaItems.length === 0,
          },
        ],
      }));

      // 2. Envoi direct vers Cloudinary, puis sauvegarde de la page
      progressById.current.set(localMediaId, 0);
      setPhotoUploads((n) => n + 1);
      uploadImage(file, {
        onProgress: (pct) => {
          progressById.current.set(localMediaId, pct);
          refreshPhotoProgress();
        },
      })
        .then((url) => {
          let saved: FunnelPageConfig | null = null;
          setConfig((prev) => {
            saved = {
              ...prev,
              mediaItems: prev.mediaItems.map((m) => (m.id === localMediaId ? { ...m, url } : m)),
            };
            return saved;
          });
          queueMicrotask(() => {
            if (saved) onSaveConfig(saved);
          });
        })
        .catch((err: unknown) => {
          setConfig((prev) => ({
            ...prev,
            mediaItems: prev.mediaItems.filter((m) => m.id !== localMediaId),
          }));
          toast(err instanceof Error ? err.message : 'L’envoi de la photo a échoué.', 'error');
        })
        .finally(() => {
          URL.revokeObjectURL(previewUrl);
          progressById.current.delete(localMediaId);
          refreshPhotoProgress();
          setPhotoUploads((n) => Math.max(0, n - 1));
        });
    });
  };

  // Product video (vertical, TikTok/Reels style) → Cloudinary
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (!file) return;
    setVideoProgress(0);
    uploadMedia(file, 'video', { onProgress: setVideoProgress })
      .then((url) => {
        const updated = { ...config, videoUrl: url, hasVideo: true };
        setConfig(updated);
        onSaveConfig(updated);
        toast('Vidéo ajoutée à votre page.', 'success');
      })
      .catch((err: unknown) =>
        toast(err instanceof Error ? err.message : 'L’envoi de la vidéo a échoué.', 'error'),
      )
      .finally(() => setVideoProgress(null));
  };

  // Customer proof file (photo / video / voice note) → Cloudinary
  const [proofProgress, setProofProgress] = useState<number | null>(null);

  // AI Title Generator state
  const [isAiBoxOpen, setIsAiBoxOpen] = useState(false);
  const [aiProductPrompt, setAiProductPrompt] = useState('');
  const [aiTone, setAiTone] = useState<'luxe' | 'promo' | 'direct'>('luxe');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  // Proof Items state (Photos, Videos, Audios)
  const [newProofType, setNewProofType] = useState<'image' | 'video' | 'audio'>('audio');
  const [newProofTitle, setNewProofTitle] = useState('Client satisfait');
  const [newProofAuthor, setNewProofAuthor] = useState('');
  const [newProofCity, setNewProofCity] = useState('');
  const [newProofUrl, setNewProofUrl] = useState('');
  const [newProofDuration, setNewProofDuration] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageNameInput.trim()) return;
    if (onCreatePage) {
      onCreatePage(newPageNameInput.trim());
    }
    setNewPageNameInput('');
    setIsNewPageModalOpen(false);
  };

  const handleDeactivate = () => {
    const updated: FunnelPageConfig = { ...config, status: 'inactive' };
    setConfig(updated);
    onSaveConfig(updated);
    if (activePageId && onUpdatePageStatus) {
      onUpdatePageStatus(activePageId, 'inactive');
    }
  };

  // AI Title Generator with prompt input (Demande Audio)
  const handleGenerateAiTitles = () => {
    setIsGeneratingTitle(true);
    setTimeout(() => {
      const keyword = aiProductPrompt.trim() || config.productTitle || 'Montre Automatique';
      let generated: string[] = [];

      if (aiTone === 'luxe') {
        generated = [
          `${keyword} — Édition Prestige Dakar (Boîtier Inox 316L)`,
          `${keyword} de Haute Horlogerie — Finition Saphir & Cuir`,
          `Chronomètre de Luxe ${keyword} — Garantie 2 Ans Dakar`,
          `Coffret Privilège ${keyword} + Bracelet Offert`,
        ];
      } else if (aiTone === 'promo') {
        generated = [
          `Offre Spéciale : ${keyword} — Stock Limité à Dakar (-38%)`,
          `Pack Exclusif ${keyword} — Livraison Gratuite & Paiement Wave`,
          `${keyword} Authentique — Essayez Gratuitement avant de Payer`,
          `Vente Flash Dakar : ${keyword} au Prix de Lancement`,
        ];
      } else {
        generated = [
          `${keyword} — Conception Robuste & Étanche 50M`,
          `${keyword} Mécanique — Réserve de Marche 42H`,
          `${keyword} Premium — Précision & Style au Quotidien`,
          `${keyword} Officielle Dakar — Expédition Express 2h`,
        ];
      }

      setAiSuggestions(generated);
      setIsGeneratingTitle(false);
    }, 600);
  };

  // Add new image (up to 5 max)
  const handleAddImage = () => {
    if (!newImageUrl.trim() || config.mediaItems.length >= 5) return;
    const newMedia: MediaItem = {
      id: `med-${Date.now()}`,
      type: 'image',
      url: newImageUrl.trim(),
    };
    const updated = { ...config, mediaItems: [...config.mediaItems, newMedia] };
    setConfig(updated);
    onSaveConfig(updated);
    setNewImageUrl('');
  };

  // Remove image
  const handleRemoveImage = (id: string) => {
    const updated = { ...config, mediaItems: config.mediaItems.filter((m) => m.id !== id) };
    setConfig(updated);
    onSaveConfig(updated);
  };

  // Dynamic Benefit management
  const handleAddBenefit = () => {
    setConfig({
      ...config,
      benefits: [...config.benefits, 'Nouvel argument de vente fort...'],
    });
  };

  const handleUpdateBenefit = (index: number, text: string) => {
    const updated = [...config.benefits];
    updated[index] = text;
    setConfig({ ...config, benefits: updated });
  };

  const handleRemoveBenefit = (index: number) => {
    setConfig({
      ...config,
      benefits: config.benefits.filter((_, i) => i !== index),
    });
  };

  // Proof items management (Photos, Videos, Audios)
  const handleAddProofItem = () => {
    if (!newProofUrl.trim()) return;

    const finalTitle = newProofTitle.trim() || 'Client satisfait';

    const newProof: ProofItem = {
      id: `prf-${Date.now()}`,
      type: newProofType,
      url: newProofUrl.trim(),
      title: finalTitle,
      authorName: newProofAuthor.trim() || 'Client vérifié',
      city: newProofCity.trim() || undefined,
      duration:
        newProofDuration.trim() ||
        (newProofType === 'audio' ? '0:35' : newProofType === 'video' ? '0:18' : undefined),
      thumbnailUrl: newProofType === 'video' ? config.mediaItems[0]?.url : undefined,
    };

    const currentProofs =
      config.proofItems && config.proofItems.length > 0 ? config.proofItems : [];
    const updated = { ...config, proofItems: [newProof, ...currentProofs] };
    setConfig(updated);
    onSaveConfig(updated);

    // Reset inputs, preserving default 'Client satisfait'
    setNewProofTitle('Client satisfait');
    setNewProofAuthor('');
    setNewProofCity('');
    setNewProofUrl('');
    setNewProofDuration('');
    setUploadedFileName(null);
  };

  const handleRemoveProofItem = (id: string) => {
    const currentProofs = config.proofItems || [];
    const updated = { ...config, proofItems: currentProofs.filter((p) => p.id !== id) };
    setConfig(updated);
    onSaveConfig(updated);
  };

  const handleSave = () => {
    onSaveConfig(config);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Navigation steps definition
  const stepsList = [
    {
      num: 1 as const,
      label: 'Médias & Visuels',
      subtitle: 'Photos HD & Vidéo Démo',
      icon: Camera,
    },
    {
      num: 2 as const,
      label: 'Titres, IA & Tarifs',
      subtitle: 'Générateur IA & Prix',
      icon: Wand2,
    },
    {
      num: 3 as const,
      label: 'Bénéfices & Arguments',
      subtitle: 'Points forts du produit',
      icon: ListOrdered,
    },
    {
      num: 4 as const,
      label: 'Preuves & Témoignages',
      subtitle: 'Photos, Vidéos & Vocaux',
      icon: Headphones,
    },
    {
      num: 5 as const,
      label: 'Checkout & Réassurance',
      subtitle: 'Livraison & Support',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* BANNIÈRE UNIQUE & ÉPURÉE : ÉDITION DU TUNNEL EN COURS    */}
      {/* (FOND BLANC, CONTOURS BLEUS ET INFOS CONSOLIDÉES SANS DOUBLONS) */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-[28px] bg-white border-2 border-[#235BF7]/25 shadow-[0_4px_24px_rgba(30,96,248,0.06)] hover:border-[#235BF7]/45 transition-all p-5 sm:p-6 bg-gradient-to-r from-[#EFF6FF]/40 via-white to-white">
        {/* Accent bleu au sommet */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#235BF7] via-[#60A5FA] to-[#235BF7]" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Section Gauche : Titre et sous-titre épurés (Demande Audio) */}
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF3FF] border border-[#BFDBFE] flex items-center justify-center text-[#235BF7] shrink-0 shadow-xs mt-1 sm:mt-0">
              <Store className="w-6 h-6" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-black text-[#201D1D] tracking-tight truncate">
                {config.productTitle ||
                  activePage?.config?.productTitle ||
                  activePage?.internalName ||
                  'Montre Automatique Royale Saphir Noire'}
              </h2>
              <p className="text-xs text-[#7A808C] mt-0.5 max-w-2xl truncate">
                Édition en direct • Page de vente immersive avec vidéo verticale, commande 1-clic
                COD / Wave et avis clients.
              </p>
            </div>
          </div>

          {/* Section Droite : Actions Unifiées (Zéro Doublon) */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t border-[#F1F5F9] lg:border-t-0">
            {/* 1. Bouton Aperçu Plein Écran */}
            <button
              type="button"
              onClick={onOpenStorefrontPreview}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#201D1D] text-xs font-bold transition-all border border-[#CBD5E1] shadow-2xs hover:border-[#235BF7]/50 active:scale-95 cursor-pointer"
              title="Ouvrir la page client dans un nouvel onglet"
            >
              <ExternalLink className="w-4 h-4 text-[#235BF7]" />
              <span>Aperçu Plein Écran</span>
            </button>

            {/* 2. Bouton Simulateur Mobile */}
            <button
              type="button"
              onClick={onOpenMobileSimulator || onOpenStorefrontPreview}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#EEF3FF] hover:bg-[#DBEAFE] text-[#235BF7] text-xs font-bold transition-all border border-[#BFDBFE] shadow-2xs active:scale-95 cursor-pointer"
              title="Tester l'expérience smartphone"
            >
              <Smartphone className="w-4 h-4 text-[#235BF7]" />
              <span>Simulateur Mobile</span>
            </button>

            {/* 3. Bouton Publication & Enregistrement */}
            {currentStatus === 'published' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeactivate}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 hover:border-rose-200"
                  title="Désactiver l'accès public au tunnel"
                >
                  <PowerOff className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Désactiver</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-200 stroke-[3]" />
                  <span>{isSaved ? 'Modifications enregistrées !' : 'Tunnel Publié (Actif)'}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                    <span>Tunnel Publié avec Succès !</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Publier le tunnel</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* NOUVELLE MISE EN PAGE : 3 COLONNES DONT MES PAGES À GAUCHE */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* ======================================================== */}
        {/* COLONNE GAUCHE 1 (3 cols) : MES PAGES DE VENTE (CONTRASTE SOMBRE DEMANDÉ) */}
        {/* ======================================================== */}
        <aside className="xl:col-span-3 space-y-4 xl:sticky xl:top-24">
          <div className="bg-[#201D1D] rounded-[28px] p-4 border border-[#1E293B] shadow-md space-y-3 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Mes Pages de Vente
                </h3>
                <span className="text-[10px] text-slate-400">
                  {pages.length} {pages.length > 1 ? 'pages configurées' : 'page configurée'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPageModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Nouveau</span>
              </button>
            </div>

            {/* List of Pages */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-0.5">
              {pages.map((p) => {
                const isSelected = p.id === (activePageId || config.id);
                const isPublished = p.status === 'published';
                const isDraft = p.status === 'draft';

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPage?.(p.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'border-2 border-[#235BF7] bg-[#1E293B] shadow-sm'
                        : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-white truncate">
                            {p.internalName}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-300 truncate mt-0.5">
                          {p.config.productTitle}
                        </p>
                      </div>

                      {pages.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Supprimer définitivement la page "${p.internalName}" ?`)) {
                              onDeletePage?.(p.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer la page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/10 text-[10px]">
                      {isPublished ? (
                        <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                          Publiée
                        </span>
                      ) : isDraft ? (
                        <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          Brouillon
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <PowerOff className="w-3 h-3" />
                          Désactivée
                        </span>
                      )}

                      {/* Status toggle action */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextStatus: FunnelPageStatus = isPublished
                            ? 'inactive'
                            : 'published';
                          onUpdatePageStatus?.(p.id, nextStatus);
                        }}
                        className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer border text-[10px] ${
                          isPublished
                            ? 'bg-white/10 hover:bg-rose-500/20 text-slate-200 hover:text-rose-200 border-white/10 hover:border-rose-400/30'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {isPublished ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] text-slate-400 leading-relaxed">
              <span className="font-bold text-white block mb-0.5">🔒 Organisation Interne</span>
              Les noms internes sont réservés à votre équipe et ne sont jamais visibles sur la
              boutique en ligne.
            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* COLONNE GAUCHE 2 (3 cols) : ÉTAPES DE CONFIGURATION      */}
        {/* ======================================================== */}
        <aside className="xl:col-span-3 space-y-4 xl:sticky xl:top-24">
          <div className="bg-white rounded-[28px] p-3 border border-[#ECEFF4] shadow-xs space-y-1.5">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              Étapes de Configuration
            </div>

            {stepsList.map((step) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setCurrentStep(step.num)}
                  className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#235BF7] text-white shadow-sm ring-2 ring-[#235BF7]/20'
                      : 'hover:bg-[#F8FAFC] text-[#201D1D]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isPast
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-[#F1F5F9] text-[#7A808C]'
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4 stroke-[3]" /> : step.num}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-xs font-extrabold block leading-tight truncate ${
                        isActive ? 'text-white' : 'text-[#201D1D]'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span
                      className={`text-[10px] block truncate mt-0.5 ${
                        isActive ? 'text-white/80' : 'text-[#7A808C]'
                      }`}
                    >
                      {step.subtitle}
                    </span>
                  </div>

                  <StepIcon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-[#94A3B8]'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Quick Info Box */}
          <div className="p-4 rounded-[28px] bg-[#EEF3FF] border border-[#BFDBFE]/60 space-y-2 text-xs">
            <span className="font-extrabold text-[#235BF7] block">Boutique Actuelle</span>
            <div className="text-[#1E3A8A] leading-relaxed text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#7A808C]">Nom :</span>
                <span className="font-bold">{config.storeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7A808C]">Préfixe :</span>
                <span className="font-mono font-bold">{config.storeCode || 'BDE'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7A808C]">Format commande :</span>
                <span className="font-mono font-bold text-[#235BF7]">
                  CMD-{config.storeCode || 'BDE'}-000001
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* COLONNE DROITE (6 cols) : FORMULAIRE DE L'ÉTAPE ACTIVE    */}
        {/* ======================================================== */}
        <main className="xl:col-span-6 space-y-6">
          {/* ======================================================== */}
          {/* ÉTAPE 1 : MÉDIAS & VISUELS                               */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="p-6 sm:p-8 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-black text-[#201D1D] tracking-tight">
                  Étape 1 : Galerie Médias & Vidéo Démo
                </h3>
                <p className="text-xs text-[#7A808C] mt-0.5">
                  Importez jusqu'à 5 photos haute résolution et votre vidéo verticale pour captiver
                  les visiteurs.
                </p>
              </div>

              {/* Photos Gallery */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#201D1D]">
                    Photos du Produit ({config.mediaItems.length}/5)
                  </label>
                  <span className="text-[11px] text-[#7A808C]">Format portrait recommandé</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {config.mediaItems.map((media, idx) => (
                    <div
                      key={media.id}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-black border border-[#CBD5E1] shadow-xs"
                    >
                      <img
                        src={media.url}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        {config.mediaItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(media.id)}
                            className="p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}

                  {/* Add Image Slot (Ouvre sélecteur natif ordinateur / téléphone) */}
                  {config.mediaItems.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-2xl border-2 border-dashed border-[#CBD5E1] p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:border-[#235BF7] hover:bg-[#EEF3FF]/40 transition-all bg-[#F8FAFC] cursor-pointer group"
                      title="Choisir une image depuis votre ordinateur ou mobile (Hébergé sur Cloudinary)"
                    >
                      <ImageIcon className="w-6 h-6 text-[#94A3B8] group-hover:text-[#235BF7] transition-colors" />
                      <span className="text-[11px] font-bold text-[#201D1D] group-hover:text-[#235BF7] transition-colors">
                        {isUploadingPhoto ? `Envoi… ${photoProgress}%` : '+ Ajouter photo'}
                      </span>
                      <span className="text-[9px] text-[#7A808C] font-medium">
                        {isUploadingPhoto ? 'Ne fermez pas la page' : 'JPG, PNG, HEIC · 10 Mo'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Input de fichier natif caché */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {config.mediaItems.length < 5 && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Coller l'URL d'une image haute-résolution..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAddImage}
                      disabled={!newImageUrl.trim()}
                    >
                      Ajouter
                    </Button>
                  </div>
                )}
              </div>

              {/* Video Option */}
              <div className="pt-4 border-t border-[#F1F5F9] space-y-3">
                <Switch
                  checked={config.hasVideo}
                  onChange={(val) => setConfig({ ...config, hasVideo: val })}
                  label="Intégrer une vidéo verticale de démonstration (TikTok / Reels)"
                  description="Affiche la vidéo en lecture automatique avec bouton de coupure son."
                />

                {config.hasVideo && (
                  <div className="space-y-3">
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={videoProgress !== null}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#235BF7] hover:bg-[#EEF3FF]/40 text-xs font-bold text-[#201D1D] transition-all cursor-pointer disabled:cursor-wait"
                    >
                      <Video className="w-4 h-4 text-[#235BF7]" />
                      {videoProgress !== null
                        ? `Envoi de la vidéo… ${videoProgress}%`
                        : config.videoUrl
                          ? 'Remplacer la vidéo'
                          : 'Téléverser une vidéo depuis mon appareil'}
                    </button>
                    {videoProgress !== null && (
                      <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                        <div
                          className="h-full bg-[#235BF7] transition-all"
                          style={{ width: `${videoProgress}%` }}
                        />
                      </div>
                    )}
                    <p className="text-[10px] text-[#7A808C]">
                      MP4, MOV ou WebM · 100 Mo maximum · format vertical conseillé
                    </p>
                    {config.videoUrl && videoProgress === null && (
                      <video
                        src={config.videoUrl}
                        controls
                        playsInline
                        className="w-40 max-h-72 rounded-2xl bg-black border border-[#E2E8F0]"
                      />
                    )}
                    <Input
                      label="Ou coller l’URL d’une vidéo (MP4)"
                      value={config.videoUrl || ''}
                      onChange={(e) => setConfig({ ...config, videoUrl: e.target.value })}
                      placeholder="https://.../video.mp4"
                      icon={<Video className="w-4 h-4 text-[#235BF7]" />}
                    />
                  </div>
                )}
              </div>

              {/* Next Step */}
              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentStep(2)}
                  iconRight={<ArrowRight className="w-4 h-4" />}
                >
                  Continuer vers Titres, IA & Tarifs
                </Button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ÉTAPE 2 : TITRES, IA AVEC CHAMP MOT-CLÉ & TARIFS         */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="p-6 sm:p-8 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-black text-[#201D1D] tracking-tight">
                  Étape 2 : Titre du Produit, IA & Tarifs
                </h3>
                <p className="text-xs text-[#7A808C] mt-0.5">
                  Utilisez l'assistant IA en saisissant vos mots-clés, définissez votre prix et
                  configurez vos frais de livraison.
                </p>
              </div>

              {/* Title Input & AI Button */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#201D1D]">
                    Titre du Produit *
                  </label>

                  {/* Bouton pour ouvrir l'espace de génération IA (Demande Audio) */}
                  <button
                    type="button"
                    onClick={() => setIsAiBoxOpen(!isAiBoxOpen)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#235BF7] bg-[#EEF3FF] hover:bg-[#DBEAFE] px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>
                      {isAiBoxOpen ? 'Masquer l’assistant IA' : 'Générer des titres avec l’IA'}
                    </span>
                  </button>
                </div>

                <Input
                  value={config.productTitle}
                  onChange={(e) => setConfig({ ...config, productTitle: e.target.value })}
                  placeholder="Ex: Montre Automatique Royale Saphir Noire"
                />

                {/* Espace interactif de génération IA (Demande Audio explicite) */}
                {isAiBoxOpen && (
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border-2 border-[#235BF7]/30 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#201D1D] flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#235BF7]" />
                        <span>Générateur de Titres IA pour E-commerce Africain</span>
                      </span>
                      <span className="text-[10px] text-[#7A808C]">
                        Spécialement optimisé pour l'Afrique de l'Ouest
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#7A808C] block">
                        Décrivez brièvement votre produit ou vos mots-clés :
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={aiProductPrompt}
                          onChange={(e) => setAiProductPrompt(e.target.value)}
                          placeholder="Ex: Montre homme luxe acier noir étanche, Chaussures cuir Dakar..."
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#CBD5E1] text-xs text-[#201D1D] focus:outline-none focus:border-[#235BF7]"
                        />
                        <button
                          type="button"
                          onClick={handleGenerateAiTitles}
                          disabled={isGeneratingTitle}
                          className="px-4 py-2 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>{isGeneratingTitle ? 'Génération...' : 'Générer'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Tone Options */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] text-[#7A808C] font-semibold">
                        Ton du titre :
                      </span>
                      <div className="flex gap-1.5">
                        {[
                          { id: 'luxe', label: 'Prestige & Luxe' },
                          { id: 'promo', label: 'Promotion & Urgence' },
                          { id: 'direct', label: 'Sobre & Direct' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setAiTone(t.id as typeof aiTone)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                              aiTone === t.id
                                ? 'bg-[#235BF7] text-white'
                                : 'bg-white border border-[#E2E8F0] text-[#7A808C] hover:bg-neutral-100'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Suggestions list */}
                    {aiSuggestions.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[#E2E8F0]">
                        <span className="text-[10px] font-bold text-[#7A808C] uppercase tracking-wider block">
                          Suggestions générées (cliquez pour appliquer) :
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {aiSuggestions.map((title, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setConfig({ ...config, productTitle: title });
                                setIsAiBoxOpen(false);
                              }}
                              className="text-left p-2.5 rounded-xl text-xs font-semibold text-[#201D1D] hover:bg-[#235BF7] hover:text-white transition-all cursor-pointer border border-[#E2E8F0] bg-white flex items-center justify-between group shadow-xs"
                            >
                              <span className="line-clamp-2">{title}</span>
                              <Check className="w-4 h-4 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Prices Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#F1F5F9]">
                <Input
                  label="Prix de vente (FCFA) *"
                  type="number"
                  value={config.price}
                  onChange={(e) => setConfig({ ...config, price: Number(e.target.value) })}
                />
                <Input
                  label="Prix barré de référence (FCFA)"
                  type="number"
                  value={config.originalPrice}
                  onChange={(e) => setConfig({ ...config, originalPrice: Number(e.target.value) })}
                  helperText="Pour afficher le pourcentage d'économie calculé automatiquement."
                />
              </div>

              {/* Delivery Pricing Setting (Offerte vs Frais Fixes) */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#235BF7]" />
                    <span className="text-xs font-bold text-[#201D1D] uppercase tracking-wider">
                      Frais de Livraison pour ce Produit
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#235BF7] bg-[#EEF3FF] px-2.5 py-0.5 rounded-lg">
                    {config.deliveryPricingType === 'fixed'
                      ? formatFCFA(config.fixedDeliveryFee || 0)
                      : 'Offerte'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        deliveryPricingType: 'free',
                        fixedDeliveryFee: 0,
                        deliveryFree: true,
                      })
                    }
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                      config.deliveryPricingType !== 'fixed'
                        ? 'bg-[#235BF7] text-white border-[#235BF7] shadow-xs'
                        : 'bg-white text-[#7A808C] border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    Livraison Offerte (Gratuit)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        deliveryPricingType: 'fixed',
                        fixedDeliveryFee: config.fixedDeliveryFee || 1500,
                        deliveryFree: false,
                      })
                    }
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                      config.deliveryPricingType === 'fixed'
                        ? 'bg-[#235BF7] text-white border-[#235BF7] shadow-xs'
                        : 'bg-white text-[#7A808C] border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    Frais Fixes Ajoutés
                  </button>
                </div>

                {config.deliveryPricingType === 'fixed' && (
                  <div className="pt-2 animate-in fade-in">
                    <Input
                      label="Montant des frais de livraison (FCFA)"
                      type="number"
                      value={config.fixedDeliveryFee || 1500}
                      onChange={(e) =>
                        setConfig({ ...config, fixedDeliveryFee: Number(e.target.value) })
                      }
                      helperText="Ce montant s'ajoutera automatiquement au total du panier lors du paiement en ligne ou COD."
                    />
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* PALIERS DE RÉDUCTIONS PAR QUANTITÉ (DEMANDE AUDIO)        */}
              {/* ======================================================== */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#201D1D] uppercase tracking-wider block">
                      Paliers de Réductions par Quantité (Packs Dégressifs)
                    </span>
                    <p className="text-[11px] text-[#7A808C] mt-0.5">
                      Permettez aux acheteurs de bénéficier d'une remise quand ils prennent 2, 3 ou
                      4 pièces.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.quantityDiscountsEnabled !== false}
                      onChange={(e) =>
                        setConfig({ ...config, quantityDiscountsEnabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#235BF7]"></div>
                  </label>
                </div>

                {config.quantityDiscountsEnabled !== false && (
                  <div className="space-y-3 pt-1">
                    {(
                      config.quantityDiscounts || [
                        {
                          id: 't1',
                          minQty: 1,
                          discountType: 'percent',
                          discountValue: 0,
                          label: '1 Pièce (Prix unitaire)',
                        },
                        {
                          id: 't2',
                          minQty: 2,
                          discountType: 'percent',
                          discountValue: 10,
                          label: 'Pack Duo — 2 Pièces (-10%)',
                        },
                        {
                          id: 't3',
                          minQty: 3,
                          discountType: 'percent',
                          discountValue: 20,
                          label: 'Pack Famille — 3 Pièces (-20%)',
                        },
                      ]
                    ).map((tier, idx) => {
                      const unitDiscounted =
                        tier.discountValue > 0
                          ? Math.round(config.price * (1 - tier.discountValue / 100))
                          : config.price;
                      const tierTotal = unitDiscounted * tier.minQty;

                      return (
                        <div
                          key={tier.id || idx}
                          className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-[#EEF3FF] text-[#235BF7] font-black text-xs flex items-center justify-center shrink-0">
                              {tier.minQty}×
                            </span>
                            <div>
                              <input
                                type="text"
                                value={tier.label || ''}
                                onChange={(e) => {
                                  const updated = [...(config.quantityDiscounts || [])];
                                  updated[idx] = { ...tier, label: e.target.value };
                                  setConfig({ ...config, quantityDiscounts: updated });
                                }}
                                className="text-xs font-bold text-[#201D1D] bg-transparent border-b border-transparent hover:border-[#CBD5E1] focus:border-[#235BF7] focus:outline-none"
                                placeholder="Libellé de l'offre (ex: Pack Duo)"
                              />
                              <span className="text-[11px] text-[#7A808C] block mt-0.5">
                                {tier.discountValue === 0
                                  ? `Tarif standard : ${formatFCFA(config.price)} par article`
                                  : `Remise -${tier.discountValue}% (${formatFCFA(unitDiscounted)}/pc) — Total : ${formatFCFA(tierTotal)}`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-[#F8FAFC] px-2.5 py-1.5 rounded-xl border border-[#E2E8F0]">
                              <span className="text-[11px] font-semibold text-[#7A808C]">
                                Remise :
                              </span>
                              <input
                                type="number"
                                min="0"
                                max="90"
                                value={tier.discountValue}
                                onChange={(e) => {
                                  const updated = [...(config.quantityDiscounts || [])];
                                  updated[idx] = {
                                    ...tier,
                                    discountValue: Number(e.target.value),
                                  };
                                  setConfig({ ...config, quantityDiscounts: updated });
                                }}
                                className="w-12 text-xs font-black text-center bg-white border border-[#CBD5E1] rounded px-1 py-0.5"
                              />
                              <span className="text-xs font-bold text-[#201D1D]">%</span>
                            </div>

                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (config.quantityDiscounts || []).filter(
                                    (_, i) => i !== idx,
                                  );
                                  setConfig({ ...config, quantityDiscounts: updated });
                                }}
                                className="p-1.5 text-[#94A3B8] hover:text-rose-600 transition-colors cursor-pointer"
                                title="Supprimer ce palier"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => {
                        const currentTiers = config.quantityDiscounts || [
                          {
                            id: 't1',
                            minQty: 1,
                            discountType: 'percent',
                            discountValue: 0,
                            label: '1 Pièce',
                          },
                          {
                            id: 't2',
                            minQty: 2,
                            discountType: 'percent',
                            discountValue: 10,
                            label: 'Pack Duo (-10%)',
                          },
                        ];
                        const nextQty = (currentTiers[currentTiers.length - 1]?.minQty || 2) + 1;
                        const nextDiscount = Math.min(
                          40,
                          (currentTiers[currentTiers.length - 1]?.discountValue || 10) + 10,
                        );
                        const newTier: QuantityDiscountTier = {
                          id: `tier-${Date.now()}`,
                          minQty: nextQty,
                          discountType: 'percent',
                          discountValue: nextDiscount,
                          label: `Pack ${nextQty} Pièces (-${nextDiscount}%)`,
                        };
                        setConfig({
                          ...config,
                          quantityDiscounts: [...currentTiers, newTier],
                        });
                      }}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#CBD5E1] text-[#235BF7] hover:bg-[#EEF3FF] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter un palier supplémentaire (ex: 4 pièces, 5 pièces)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Stock & Urgence (Optionnel) */}
              <div className="pt-6 border-t border-[#F1F5F9] space-y-4">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-[#235BF7]" />
                  <h4 className="text-sm font-black text-[#201D1D] tracking-tight">
                    Stock & Urgence (Optionnel)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Pièces disponibles en stock"
                    type="number"
                    min="0"
                    value={config.stockQuantity !== undefined ? String(config.stockQuantity) : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Number(e.target.value);
                      const updated = { ...config, stockQuantity: val };
                      setConfig(updated);
                      onSaveConfig(updated);
                    }}
                    placeholder="Ex: 8 (Laissez vide si illimité)"
                    helperText="Si renseigné, crée un effet d'urgence pour accélérer la décision d'achat."
                  />

                  <div className="flex flex-col justify-center">
                    <Switch
                      checked={config.showStockBadge ?? true}
                      onChange={(val) => {
                        const updated = { ...config, showStockBadge: val };
                        setConfig(updated);
                        onSaveConfig(updated);
                      }}
                      label="Afficher le badge de stock limité"
                      description="Affiche '⚡ Plus que X pièces en stock' sur la page produit"
                    />
                  </div>
                </div>
              </div>

              {/* Couleurs & Variantes disponibles (Optionnel) */}
              <div className="pt-6 border-t border-[#F1F5F9] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#235BF7]" />
                    <div>
                      <h4 className="text-sm font-black text-[#201D1D] tracking-tight">
                        Couleurs & Variantes du Produit (Optionnel)
                      </h4>
                      <p className="text-xs text-[#7A808C]">
                        Permet au client de sélectionner sa couleur préférée directement sur la page
                        de commande.
                      </p>
                    </div>
                  </div>
                  {(config.availableColors?.length ?? 0) > 0 && (
                    <span className="text-[11px] font-bold text-[#235BF7] bg-[#EEF3FF] px-2.5 py-1 rounded-full">
                      {config.availableColors?.length} couleur
                      {(config.availableColors?.length ?? 0) > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Quick palette buttons */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#7A808C] block mb-2">
                    Sélection rapide de couleurs :
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {quickPalette.map((item) => {
                      const isAlreadyAdded = (config.availableColors || []).some(
                        (c) => c.name.toLowerCase() === item.name.toLowerCase(),
                      );
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => {
                            if (isAlreadyAdded) return;
                            const updatedColors = [
                              ...(config.availableColors || []),
                              {
                                id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                name: item.name,
                                hex: item.hex,
                              },
                            ];
                            const updated = { ...config, availableColors: updatedColors };
                            setConfig(updated);
                            onSaveConfig(updated);
                          }}
                          disabled={isAlreadyAdded}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isAlreadyAdded
                              ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                              : 'bg-white hover:bg-slate-50 text-[#201D1D] border-[#E2E8F0] hover:border-[#CBD5E1] shadow-2xs'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: item.hex }}
                          />
                          <span>{item.name}</span>
                          {isAlreadyAdded ? (
                            <Check className="w-3 h-3 text-slate-400 ml-0.5" />
                          ) : (
                            <Plus className="w-3 h-3 text-[#7A808C] ml-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom color adder */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-[#CBD5E1] cursor-pointer bg-white p-0.5"
                      title="Choisir une nuance personnalisée"
                    />
                    <span className="text-xs font-mono text-[#7A808C] font-bold uppercase">
                      {newColorHex}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    placeholder="Nom de la couleur personnalisée (ex: Bleu Nuit, Ocre...)"
                    className="flex-1 w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#201D1D] focus:outline-none focus:border-[#235BF7]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddColor();
                      }
                    }}
                  />

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddColor()}
                    disabled={!newColorName.trim()}
                    className="w-full sm:w-auto shrink-0"
                  >
                    Ajouter couleur
                  </Button>
                </div>

                {/* Active colors list */}
                {(config.availableColors || []).length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A808C] block">
                      Couleurs actives sur votre page :
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(config.availableColors || []).map((col) => (
                        <div
                          key={col.id}
                          className="inline-flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl bg-white border border-[#E2E8F0] shadow-xs text-xs font-bold text-[#201D1D]"
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: col.hex }}
                          />
                          <span>{col.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveColor(col.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Retirer cette couleur"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Prev / Next buttons */}
              <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setCurrentStep(1)}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  Précédent
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentStep(3)}
                  iconRight={<ArrowRight className="w-4 h-4" />}
                >
                  Continuer vers Bénéfices
                </Button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ÉTAPE 3 : BÉNÉFICES & ARGUMENTS DE VENTE                 */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="p-6 sm:p-8 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-black text-[#201D1D] tracking-tight">
                  Étape 3 : Bénéfices & Arguments de Vente
                </h3>
                <p className="text-xs text-[#7A808C] mt-0.5">
                  Présentez les 3 à 5 atouts majeurs qui rassurent et déclenchent l'achat chez le
                  client.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#201D1D]">
                    Liste des Arguments ({config.benefits.length})
                  </label>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddBenefit}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Ajouter un argument
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {config.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#EEF3FF] text-[#235BF7] font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={benefit}
                        onChange={(e) => handleUpdateBenefit(idx, e.target.value)}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white"
                      />
                      {config.benefits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBenefit(idx)}
                          className="p-2 text-[#94A3B8] hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Prev / Next buttons */}
              <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setCurrentStep(2)}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  Précédent
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentStep(4)}
                  iconRight={<ArrowRight className="w-4 h-4" />}
                >
                  Continuer vers Preuves & Témoignages
                </Button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ÉTAPE 4 : PREUVES & TÉMOIGNAGES (PHOTOS, VIDÉOS, AUDIOS) */}
          {/* (SECTION TRÈS IMPORTANTE DEMANDÉE PAR L'AUDIO)           */}
          {/* ======================================================== */}
          {currentStep === 4 && (
            <div className="p-6 sm:p-8 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-black text-[#201D1D] tracking-tight">
                  Étape 4 : Témoignages & Preuves Réelles (Photos, Vidéos, Audios)
                </h3>
                <p className="text-xs text-[#7A808C] mt-0.5">
                  Configurez vos vraies preuves de livraison : photos reçues, vidéos unboxing ou
                  notes vocales WhatsApp.
                </p>
              </div>

              {/* Formulaire d'ajout d'une nouvelle preuve */}
              <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4">
                <span className="text-xs font-bold text-[#201D1D] uppercase tracking-wider block">
                  + Ajouter un Nouveau Témoignage Réel
                </span>

                {/* Sélecteur de type de preuve : Photo / Vidéo / Audio */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewProofType('audio')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      newProofType === 'audio'
                        ? 'bg-[#235BF7] text-white border-[#235BF7] shadow-xs'
                        : 'bg-white text-[#7A808C] border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>Note Vocale</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewProofType('video')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      newProofType === 'video'
                        ? 'bg-[#235BF7] text-white border-[#235BF7] shadow-xs'
                        : 'bg-white text-[#7A808C] border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Vidéo Déballage</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewProofType('image')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      newProofType === 'image'
                        ? 'bg-[#235BF7] text-white border-[#235BF7] shadow-xs'
                        : 'bg-white text-[#7A808C] border-[#E2E8F0] hover:bg-slate-50'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Photo Colis</span>
                  </button>
                </div>

                {/* Titre et Source du média (Fichier local ou URL) */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#201D1D] block">
                        Titre / Légende du témoignage (Par défaut : "Client satisfait")
                      </label>
                      <span className="text-[10px] text-[#7A808C]">Optionnel</span>
                    </div>
                    <Input
                      value={newProofTitle}
                      onChange={(e) => setNewProofTitle(e.target.value)}
                      placeholder="Client satisfait"
                    />
                  </div>

                  {/* Choix de la source : Import local depuis machine ou Saisie de lien */}
                  <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                    <span className="text-xs font-bold text-[#201D1D] block">
                      Fichier média (
                      {newProofType === 'audio'
                        ? 'Note vocale audio'
                        : newProofType === 'video'
                          ? 'Vidéo MP4/WebM'
                          : 'Photo'}
                      ) *
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option A : Upload depuis l'ordinateur */}
                      <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-[#CBD5E1] hover:border-[#235BF7] bg-[#F8FAFC] hover:bg-[#EEF3FF] transition-all cursor-pointer group text-center">
                        <Upload className="w-5 h-5 text-[#94A3B8] group-hover:text-[#235BF7] mb-1.5 transition-colors" />
                        <span className="text-xs font-bold text-[#201D1D] group-hover:text-[#235BF7]">
                          Importer depuis mon ordinateur
                        </span>
                        <span className="text-[10px] text-[#7A808C] mt-0.5">
                          {newProofType === 'audio'
                            ? 'MP3, WAV, M4A, OGG'
                            : newProofType === 'video'
                              ? 'MP4, MOV, WebM'
                              : 'JPG, PNG, WebP'}
                        </span>
                        <input
                          type="file"
                          accept={
                            newProofType === 'audio'
                              ? 'audio/*'
                              : newProofType === 'video'
                                ? 'video/*'
                                : 'image/*'
                          }
                          onChange={(e) => {
                            const input = e.currentTarget;
                            const file = input.files?.[0];
                            input.value = '';
                            if (!file) return;
                            setNewProofUrl('');
                            setUploadedFileName(null);
                            setProofProgress(0);
                            uploadMedia(file, newProofType, { onProgress: setProofProgress })
                              .then((url) => {
                                setNewProofUrl(url);
                                setUploadedFileName(file.name);
                              })
                              .catch((err: unknown) =>
                                toast(
                                  err instanceof Error
                                    ? err.message
                                    : 'L’envoi du fichier a échoué.',
                                  'error',
                                ),
                              )
                              .finally(() => setProofProgress(null));
                          }}
                          className="hidden"
                        />
                      </label>

                      {/* Option B : Saisie manuelle d'une URL */}
                      <div className="flex flex-col justify-center space-y-1.5">
                        <span className="text-[11px] font-semibold text-[#7A808C]">
                          Ou coller une URL directe :
                        </span>
                        <input
                          type="text"
                          value={newProofUrl}
                          onChange={(e) => {
                            setNewProofUrl(e.target.value);
                            setUploadedFileName(null);
                          }}
                          placeholder={
                            newProofType === 'audio'
                              ? 'https://.../vocal.mp3'
                              : newProofType === 'video'
                                ? 'https://.../unboxing.mp4'
                                : 'https://.../photo.jpg'
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Progression de l'envoi vers Cloudinary */}
                    {proofProgress !== null && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-[#235BF7]">
                          Envoi en cours… {proofProgress}%
                        </p>
                        <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                          <div
                            className="h-full bg-[#235BF7] transition-all"
                            style={{ width: `${proofProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Fichier chargé feedback */}
                    {uploadedFileName && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#065F46] font-semibold">
                        <span className="flex items-center gap-1.5 truncate">
                          <Check className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                          <span className="truncate">Fichier prêt : {uploadedFileName}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewProofUrl('');
                            setUploadedFileName(null);
                          }}
                          className="text-[11px] text-rose-600 hover:underline shrink-0 ml-2"
                        >
                          Changer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Champs optionnels : Nom, Ville, Durée */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Input
                      label="Nom du client (Optionnel)"
                      value={newProofAuthor}
                      onChange={(e) => setNewProofAuthor(e.target.value)}
                      placeholder="Ex: Mamadou Diallo"
                    />
                  </div>

                  <div>
                    <Input
                      label="Quartier / Ville (Optionnel)"
                      value={newProofCity}
                      onChange={(e) => setNewProofCity(e.target.value)}
                      placeholder="Ex: Almadies, Dakar"
                    />
                  </div>

                  {newProofType !== 'image' && (
                    <div>
                      <Input
                        label="Durée estimée (Optionnel)"
                        value={newProofDuration}
                        onChange={(e) => setNewProofDuration(e.target.value)}
                        placeholder="Ex: 0:38"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddProofItem}
                    disabled={!newProofUrl.trim() || proofProgress !== null}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Ajouter au Carrousel de Preuves
                  </Button>
                </div>
              </div>

              {/* Liste des preuves actuellement dans le slider */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#201D1D] block">
                  Preuves Actuellement Affichées sur la Vitrine ({config.proofItems?.length || 0})
                </span>

                {!config.proofItems || config.proofItems.length === 0 ? (
                  <p className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-center text-xs text-[#94A3B8]">
                    Aucune preuve configurée. Utilisez le formulaire ci-dessus pour en ajouter.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {config.proofItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${
                              item.type === 'audio'
                                ? 'bg-[#25D366]'
                                : item.type === 'video'
                                  ? 'bg-[#235BF7]'
                                  : 'bg-[#201D1D]'
                            }`}
                          >
                            {item.type === 'audio' ? (
                              <Headphones className="w-4 h-4" />
                            ) : item.type === 'video' ? (
                              <Film className="w-4 h-4" />
                            ) : (
                              <Camera className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#201D1D] block truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-[#7A808C] block truncate">
                              {item.authorName} &bull; {item.city}{' '}
                              {item.duration ? `(${item.duration})` : ''}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveProofItem(item.id)}
                          className="p-2 text-[#94A3B8] hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Prev / Next buttons */}
              <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setCurrentStep(3)}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  Précédent
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentStep(5)}
                  iconRight={<ArrowRight className="w-4 h-4" />}
                >
                  Continuer vers Checkout & Support
                </Button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ÉTAPE 5 : CHECKOUT, COD, LIVRAISON & REASSURANCE         */}
          {/* ======================================================== */}
          {currentStep === 5 && (
            <div className="p-6 sm:p-8 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-black text-[#201D1D] tracking-tight">
                  Étape 5 : Checkout, Logistique & Support Client
                </h3>
                <p className="text-xs text-[#7A808C] mt-0.5">
                  Finalisez vos promesses de livraison, garantie zéro risque et numéro de contact
                  direct.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Délai d'expédition garanti affiché"
                  value={config.deliveryNotice}
                  onChange={(e) => setConfig({ ...config, deliveryNotice: e.target.value })}
                  placeholder="Ex: Expédition locale sous 2h à 4h à Dakar"
                  icon={<Truck className="w-4 h-4 text-[#235BF7]" />}
                />

                <Input
                  label="Texte de réassurance (Zéro risque d'achat)"
                  value={config.reassuranceText}
                  onChange={(e) => setConfig({ ...config, reassuranceText: e.target.value })}
                  placeholder="Ex: Essayez votre article devant le coursier avant de régler en espèces ou Wave."
                  icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
                />

                <Input
                  label="Numéro WhatsApp de support boutique"
                  value={config.whatsappSupportNumber}
                  onChange={(e) => setConfig({ ...config, whatsappSupportNumber: e.target.value })}
                  placeholder="+221 77 412 89 30"
                  icon={<Phone className="w-4 h-4 text-[#25D366]" />}
                  helperText="Les clients qui cliquent sur 'Discuter' ou 'Suivre ma livraison' seront dirigés vers ce numéro."
                />
              </div>

              {/* Prev / Save buttons */}
              <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setCurrentStep(4)}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  Précédent
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleSave}
                  icon={
                    isSaved ? (
                      <Check className="w-4 h-4 text-emerald-300" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )
                  }
                >
                  {isSaved ? 'Tunnel Enregistré avec Succès !' : 'Enregistrer & Publier'}
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Création Nouvelle Page / Tunnel */}
      {isNewPageModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-[#ECEFF4] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <h3 className="text-base font-black text-[#201D1D]">Créer une nouvelle page</h3>
              </div>
              <button
                onClick={() => setIsNewPageModalOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#201D1D] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#201D1D] block">
                  Nom interne de la page / tunnel <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPageNameInput}
                  onChange={(e) => setNewPageNameInput(e.target.value)}
                  placeholder="Ex: Duo Sérum Éclat — Vente Flash TikTok"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white"
                  autoFocus
                />
                <p className="text-[11px] text-[#7A808C] flex items-start gap-1 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 text-[#235BF7] shrink-0 mt-0.5" />
                  <span>
                    Ce nom sert uniquement à votre organisation interne et ne sera jamais affiché
                    aux clients sur le site.
                  </span>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPageModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A808C] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newPageNameInput.trim()}
                  className="px-4 py-2 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Créer en mode Brouillon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
