'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  X,
  Video,
  Check,
  CheckCircle2,
  Truck,
  RotateCw,
  Wand2,
  HelpCircle,
  Scale,
  Star,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import type { FunnelPageConfig } from '@/types/juula';
import type { FullProductGenerationOutput } from '@/lib/server/ai/product-page-wizard';

interface ProductCreationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProduct: (
    configPatch: Partial<FunnelPageConfig>,
    internalName: string,
  ) => Promise<boolean | void>;
  storeName?: string | undefined;
}

export const ProductCreationWizardModal: React.FC<ProductCreationWizardModalProps> = ({
  isOpen,
  onClose,
  onCreateProduct,
  storeName,
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Étape 1 : Nom du produit
  const [productName, setProductName] = useState('');
  const [baseIdea, setBaseIdea] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [isGeneratingNames, setIsGeneratingNames] = useState(false);

  // Étape 2 : Médias
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Étape 3 : Prix & Livraison
  const [price, setPrice] = useState<number>(15000);
  const [originalPrice, setOriginalPrice] = useState<number>(25000);
  const [isFreeShipping, setIsFreeShipping] = useState<boolean>(true);
  const [deliveryFee, setDeliveryFee] = useState<number>(2000);

  // Étape 4 : Contenu IA complet
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<FullProductGenerationOutput | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // 1. Suggestions de noms par IA
  const handleGenerateNameSuggestions = async () => {
    if (!baseIdea.trim() && !productName.trim()) {
      toast('Saisissez une idée de base (ex: montre luxe, sérum éclat...)', 'error');
      return;
    }

    setIsGeneratingNames(true);
    try {
      const res = await fetch('/api/store/ai/product-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseIdea: (baseIdea || productName).trim() }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.suggestions)) {
        setNameSuggestions(data.suggestions);
        toast('5 suggestions de noms ultra-vendeurs générées !', 'success');
      } else {
        throw new Error(data.message || 'Erreur');
      }
    } catch {
      toast('Impossible de générer des suggestions pour le moment.', 'error');
    } finally {
      setIsGeneratingNames(false);
    }
  };

  // Ajout d'image
  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    if (imageUrls.length >= 5) {
      toast('Maximum 5 images autorisées.', 'error');
      return;
    }
    setImageUrls([...imageUrls, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  // 2. Génération automatique IA intégrale
  const handleGenerateFullAI = async () => {
    if (!productName.trim()) {
      toast('Le nom du produit est requis.', 'error');
      return;
    }

    setIsGeneratingContent(true);
    try {
      const res = await fetch('/api/store/ai/product-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: productName.trim(),
          price,
          deliveryFree: isFreeShipping,
          deliveryFee: isFreeShipping ? 0 : deliveryFee,
          storeName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.generated) {
        setGeneratedContent(data.generated);
        toast('Page de vente rédigée avec succès par l’IA !', 'success');
      } else {
        throw new Error(data.message || 'Erreur');
      }
    } catch {
      toast('Erreur lors de la génération. Réessayez.', 'error');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // Finalisation et création du produit
  const handleFinalSubmit = async () => {
    if (!productName.trim()) {
      toast('Le nom du produit est obligatoire.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const mediaItems = imageUrls.map((url, i) => ({
        id: `img-${Date.now()}-${i}`,
        type: 'image' as const,
        url,
        isPrimary: i === 0,
      }));

      const patch: Record<string, unknown> = {
        productTitle: productName.trim(),
        price,
        originalPrice,
        deliveryFree: isFreeShipping,
        deliveryFee: isFreeShipping ? 0 : deliveryFee,
        deliveryPricingType: isFreeShipping ? 'free' : 'fixed',
        fixedDeliveryFee: isFreeShipping ? 0 : deliveryFee,
        hasVideo: Boolean(videoUrl.trim()),
      };
      if (videoUrl.trim()) {
        patch.videoUrl = videoUrl.trim();
      }
      if (mediaItems.length > 0) {
        patch.mediaItems = mediaItems;
      }

      if (generatedContent) {
        patch.benefits = generatedContent.benefits;
        patch.description = generatedContent.description;
        patch.faqItems = generatedContent.faqItems;
        patch.comparison = generatedContent.comparison;
        patch.reviews = generatedContent.reviews;
        patch.urgencyText = generatedContent.urgencyText;
        patch.reassuranceText = generatedContent.reassuranceText;
        patch.ctaButtonText = generatedContent.ctaButtonText;
      }

      await onCreateProduct(patch, productName.trim());
      toast('Page produit créée avec succès !', 'success');
      onClose();
    } catch {
      toast('Erreur lors de la création du produit.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-[28px] shadow-2xl border border-[#ECEFF4] flex flex-col max-h-[92vh] overflow-hidden">
        {/* En-tête */}
        <div className="px-6 py-4.5 border-b border-[#F1F5F9] flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#235BF7] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Wand2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#201D1D] tracking-tight">
                  Créateur Intelligent de Page Produit
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Étape {currentStep}/4
                </span>
              </div>
              <p className="text-[12px] text-[#7A808C]">
                Assistant guidé avec génération IA intégrale de conversion
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#201D1D] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicateur d'étapes */}
        <div className="px-6 py-2.5 bg-[#FAFBFD] border-b border-[#F1F5F9] grid grid-cols-4 gap-2 text-center text-xs font-bold">
          <div
            className={`py-1.5 rounded-xl transition-all ${
              currentStep === 1
                ? 'bg-[#235BF7] text-white'
                : currentStep > 1
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-400'
            }`}
          >
            1. Nom du produit
          </div>
          <div
            className={`py-1.5 rounded-xl transition-all ${
              currentStep === 2
                ? 'bg-[#235BF7] text-white'
                : currentStep > 2
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-400'
            }`}
          >
            2. Photos & Vidéo
          </div>
          <div
            className={`py-1.5 rounded-xl transition-all ${
              currentStep === 3
                ? 'bg-[#235BF7] text-white'
                : currentStep > 3
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-400'
            }`}
          >
            3. Prix & Livraison
          </div>
          <div
            className={`py-1.5 rounded-xl transition-all ${
              currentStep === 4 ? 'bg-[#235BF7] text-white' : 'text-slate-400'
            }`}
          >
            4. Conversion IA
          </div>
        </div>

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ======================================================== */}
          {/* ÉTAPE 1 : NOM DU PRODUIT & SUGGESTIONS IA                */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h4 className="text-base font-black text-[#201D1D]">
                  Quel est le nom de votre produit ?
                </h4>
                <p className="text-[13px] text-[#7A808C] mt-0.5">
                  Choisissez un nom accrocheur ou laissez l'IA vous proposer des titres percutants.
                </p>
              </div>

              {/* Générateur de noms IA */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-blue-50/70 border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#235BF7]" />
                  <span className="text-[13px] font-black text-slate-900">
                    Générateur d'idées de noms vendeurs avec l'IA
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={baseIdea}
                    onChange={(e) => setBaseIdea(e.target.value)}
                    placeholder="Ex: montre quartz, robe en soie, sérum visage..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-[13px] text-slate-900 focus:outline-none focus:border-[#235BF7]"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isGeneratingNames || (!baseIdea.trim() && !productName.trim())}
                    onClick={handleGenerateNameSuggestions}
                    className="shrink-0 flex items-center gap-1.5 shadow-sm"
                  >
                    {isGeneratingNames ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5" />
                    )}
                    <span>Suggérer des noms</span>
                  </Button>
                </div>

                {nameSuggestions.length > 0 && (
                  <div className="pt-2 border-t border-blue-200/60 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Cliquez pour choisir un nom suggéré :
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {nameSuggestions.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setProductName(sug)}
                          className={`text-left px-3 py-1.5 rounded-xl text-[12.5px] font-bold border transition-all cursor-pointer ${
                            productName === sug
                              ? 'bg-[#235BF7] text-white border-[#235BF7] shadow-xs'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-[#235BF7]'
                          }`}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Champ final Nom du produit */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-black text-[#201D1D] uppercase tracking-wider block">
                  Nom sélectionné pour votre page de vente <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Ex : Montre Chronographe Royale Saphir Noire"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#CBD5E1] text-[15px] font-bold text-[#201D1D] focus:outline-none focus:border-[#235BF7]"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ÉTAPE 2 : PHOTOS ET VIDÉO DU PRODUIT                    */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h4 className="text-base font-black text-[#201D1D]">
                  Photos & Vidéo Démo du produit
                </h4>
                <p className="text-[13px] text-[#7A808C] mt-0.5">
                  Ajoutez les visuels pour donner envie aux visiteurs de commander immédiatement.
                </p>
              </div>

              {/* Galerie Images */}
              <div className="space-y-3">
                <label className="text-[13px] font-black text-[#201D1D] uppercase tracking-wider block">
                  Photos du produit ({imageUrls.length}/5)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="URL de l'image (ex: https://...)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-[13px] text-slate-900 focus:outline-none focus:border-[#235BF7]"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddImage}
                    disabled={!newImageUrl.trim() || imageUrls.length >= 5}
                    className="shrink-0 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </Button>
                </div>

                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2">
                    {imageUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-xl overflow-hidden aspect-square border border-slate-200 group"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-md text-white hover:bg-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vidéo verticale / démonstration */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <label className="text-[13px] font-black text-[#201D1D] uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#235BF7]" />
                  Lien Vidéo de démonstration (TikTok / YouTube / MP4)
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Ex : https://www.tiktok.com/@boutique/video/... ou https://youtube.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-[13px] text-slate-900 focus:outline-none focus:border-[#235BF7]"
                />
                <p className="text-[12px] text-slate-500">
                  La vidéo verticale augmente les conversions jusqu'à 3x sur mobile.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ÉTAPE 3 : PRIX & LIVRAISON (GRATUITE OU PAYANTE)         */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h4 className="text-base font-black text-[#201D1D]">Tarification & Livraison</h4>
                <p className="text-[13px] text-[#7A808C] mt-0.5">
                  Définissez votre offre tarifaire et la politique de livraison pour rassurer
                  l'acheteur.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-black text-[#201D1D] uppercase tracking-wider block">
                    Prix de vente (FCFA) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-[15px] font-bold text-[#201D1D] focus:outline-none focus:border-[#235BF7]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-black text-slate-500 uppercase tracking-wider block">
                    Prix barré avant promo (FCFA)
                  </label>
                  <input
                    type="number"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-[15px] font-semibold text-slate-500 focus:outline-none focus:border-[#235BF7]"
                  />
                </div>
              </div>

              {/* Question Livraison Gratuite ou Payante */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <label className="text-[13px] font-black text-[#201D1D] uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#235BF7]" />
                  La livraison est-elle offerte ou payante ?
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFreeShipping(true)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isFreeShipping
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-extrabold text-[14px] block">Livraison GRATUITE</span>
                    <span className="text-[12px] text-emerald-800 block mt-0.5">
                      0 FCFA (Offerte au client)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFreeShipping(false)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      !isFreeShipping
                        ? 'bg-blue-50 border-[#235BF7] text-blue-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-extrabold text-[14px] block">Livraison PAYANTE</span>
                    <span className="text-[12px] text-blue-800 block mt-0.5">
                      Frais de livraison ajoutés
                    </span>
                  </button>
                </div>

                {!isFreeShipping && (
                  <div className="pt-2 animate-in fade-in space-y-1.5">
                    <label className="text-[12px] font-bold text-slate-700 block">
                      Montant des frais de livraison (FCFA)
                    </label>
                    <input
                      type="number"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(Number(e.target.value))}
                      placeholder="Ex : 2000"
                      className="w-full max-w-xs px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-[14px] font-bold text-slate-900 focus:outline-none focus:border-[#235BF7]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ÉTAPE 4 : GÉNÉRATION IA INTÉGRALE DE CONVERSION           */}
          {/* ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h4 className="text-base font-black text-[#201D1D]">
                  Génération IA du Contenu de Vente
                </h4>
                <p className="text-[13px] text-[#7A808C] mt-0.5">
                  L'IA va générer les arguments, la description, la FAQ, le comparatif "Nous vs Les
                  autres" et les avis clients selon votre produit.
                </p>
              </div>

              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={isGeneratingContent || !productName.trim()}
                  onClick={handleGenerateFullAI}
                  className="px-8 shadow-lg shadow-blue-500/25 flex items-center gap-2"
                >
                  {isGeneratingContent ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Étude de marché et rédaction IA en cours...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 text-amber-300" />
                      {generatedContent
                        ? 'Régénérer le contenu IA'
                        : 'Générer Tout le Contenu de Vente avec l’IA'}
                    </>
                  )}
                </Button>
              </div>

              {generatedContent && (
                <div className="space-y-4 pt-3 border-t border-slate-100 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-black uppercase text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Contenu complet prêt à l'emploi
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#235BF7]">
                      {generatedContent.source === 'gemini'
                        ? '⚡ Gemini 2.5 Flash'
                        : '🛡️ Moteur Expert Africain'}
                    </span>
                  </div>

                  {/* 1. Description */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#235BF7] block">
                      Description persuasive problème / solution
                    </span>
                    <p className="text-[12.5px] text-slate-700 whitespace-pre-line leading-relaxed">
                      {generatedContent.description}
                    </p>
                  </div>

                  {/* 2. Bénéfices */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                      4 Arguments de Vente Clés
                    </span>
                    <ul className="space-y-1 text-[12.5px] text-slate-800">
                      {generatedContent.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 3. Tableau comparatif "Nous vs Les autres" */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5" />
                      Tableau Comparatif (Étude de marché : Nous vs Les autres)
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12px] border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                            <th className="py-1.5">Critère</th>
                            <th className="py-1.5 text-emerald-700">
                              {generatedContent.comparison.oursLabel}
                            </th>
                            <th className="py-1.5 text-rose-700">
                              {generatedContent.comparison.othersLabel}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {generatedContent.comparison.rows.map((row) => (
                            <tr key={row.id}>
                              <td className="py-2 font-bold text-slate-800">{row.criterion}</td>
                              <td className="py-2 text-emerald-700 font-semibold">
                                {row.ours.kind === 'text' ? row.ours.text : 'Oui'}
                              </td>
                              <td className="py-2 text-rose-600 font-medium">
                                {row.others.kind === 'text' ? row.others.text : 'Non'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 4. FAQ */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Foire Aux Questions (FAQ) adaptées
                    </span>
                    <div className="space-y-2 text-[12px]">
                      {generatedContent.faqItems.map((faq) => (
                        <div
                          key={faq.id}
                          className="bg-white p-2.5 rounded-xl border border-slate-200"
                        >
                          <p className="font-bold text-slate-900">{faq.question}</p>
                          <p className="text-slate-600 mt-0.5">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5. Avis clients */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      Témoignages & Avis Clients Locaux ({generatedContent.reviews.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
                      {generatedContent.reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{rev.authorName}</span>
                            <span className="text-amber-500 font-bold">5★</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">{rev.city}</span>
                          <p className="text-slate-600 text-[11px] leading-tight">
                            « {rev.comment} »
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pied de page modal */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#F1F5F9] flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (currentStep > 1) setCurrentStep((s) => (s - 1) as 1 | 2 | 3 | 4);
              else onClose();
            }}
          >
            {currentStep === 1 ? 'Annuler' : 'Précédent'}
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={currentStep === 1 && !productName.trim()}
              onClick={() => setCurrentStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
              className="flex items-center gap-1.5"
            >
              <span>Continuer</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={isSubmitting || !productName.trim()}
              onClick={handleFinalSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2"
            >
              {isSubmitting ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Créer la page produit finalisée</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
