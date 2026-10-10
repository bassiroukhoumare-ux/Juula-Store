'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Check,
  RotateCw,
  ShieldCheck,
  Truck,
  Flame,
  Zap,
  X,
  Store,
  Tag,
  MapPin,
  CheckCircle2,
  Palette,
  Layers,
  Heart,
  Cpu,
  Shirt,
  Home,
  Boxes,
} from 'lucide-react';
import { FunnelPageConfig } from '@/types/juula';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { DesignTemplateId, ProductPitchOutput } from '@/lib/server/ai/product-pitch';
import { postAi } from '@/lib/ai-client';

export interface GeneratedCopyResult {
  titre_principal: string;
  sous_titre: string;
  description_probleme_solution: string;
  benefices_puces: string[];
  garantie_confiance: string;
  urgence_rarete: string;
  bouton_cta: string;
  source: 'gemini' | 'african_copy_engine';
}

interface AiCopywritingModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FunnelPageConfig;
  onApplyCopy: (updatedFields: Partial<FunnelPageConfig>) => void;
}

const TEMPLATE_META: Record<
  DesignTemplateId,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; hex: string }
> = {
  TEMPLATE_BEAUTE_SANTE: {
    label: 'Beauté & Santé',
    icon: Heart,
    color: 'bg-rose-50 border-rose-200 text-rose-700',
    hex: '#E11D48',
  },
  TEMPLATE_TECH_GADGET: {
    label: 'Tech & Gadgets',
    icon: Cpu,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    hex: '#2563EB',
  },
  TEMPLATE_MODE_VETEMENT: {
    label: 'Mode & Prêt-à-Porter',
    icon: Shirt,
    color: 'bg-slate-50 border-slate-300 text-slate-800',
    hex: '#0F172A',
  },
  TEMPLATE_MAISON_CUISINE: {
    label: 'Maison & Cuisine',
    icon: Home,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    hex: '#059669',
  },
  TEMPLATE_GENERIQUE: {
    label: 'Générique & Tous Produits',
    icon: Boxes,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    hex: '#235BF7',
  },
};

export const AiCopywritingModal: React.FC<AiCopywritingModalProps> = ({
  isOpen,
  onClose,
  config,
  onApplyCopy,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'pitch_template' | 'full_copy'>('pitch_template');
  const [productName, setProductName] = useState(config.productTitle || '');
  const [productPrice, setProductPrice] = useState<number | string>(config.price || 15000);
  const [city, setCity] = useState('Dakar');
  const category = config.category || 'Général';
  const [isLoading, setIsLoading] = useState(false);

  // Résultats des deux générateurs
  const [pitchResult, setPitchResult] = useState<ProductPitchOutput | null>(null);
  const [copyResult, setCopyResult] = useState<GeneratedCopyResult | null>(null);

  if (!isOpen) return null;

  // 1. Génération Directeur Artistique & Template Visuel
  const handleGeneratePitch = async () => {
    if (!productName.trim()) {
      toast('Veuillez indiquer le nom de votre produit.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await postAi<{ success?: boolean; pitch?: ProductPitchOutput }>(
        '/api/store/ai/product-pitch',
        {
          productName: productName.trim(),
          price: productPrice,
        },
      );
      const data = res.data;
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Échec de la génération du template');
      }

      setPitchResult(data.pitch ?? null);
      toast('Template et argumentaire générés avec succès !', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      toast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Génération Copywriting Complet
  const handleGenerateFullCopy = async () => {
    if (!productName.trim()) {
      toast('Veuillez indiquer le nom de votre produit.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await postAi<{ success?: boolean; copy?: GeneratedCopyResult }>(
        '/api/store/ai/copywriting',
        {
          productName: productName.trim(),
          storeName: config.storeName,
          category: category.trim(),
          price: Number(productPrice) || config.price,
          originalPrice: config.originalPrice,
          deliveryFee: config.deliveryFee,
          deliveryFree: config.deliveryFree,
          deliveryNotice: config.deliveryNotice,
          codEnabled: config.codEnabled,
          whatsapp: config.whatsappSupportNumber,
          city: city.trim(),
        },
      );
      const data = res.data;
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Échec de la génération');
      }

      setCopyResult(data.copy ?? null);
      toast('Page de vente complète générée avec succès !', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      toast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Application 1-Clic Mode Pitch & Template
  const handleApplyPitch = () => {
    if (!pitchResult) return;

    const templateMeta = TEMPLATE_META[pitchResult.id_design_choisi];

    onApplyCopy({
      productTitle: pitchResult.titre_page_vente,
      description: `${pitchResult.texte_intro_probleme}\n\n${pitchResult.argumentaire_solution}`,
      benefits:
        pitchResult.liste_benefices_puces.length > 0
          ? pitchResult.liste_benefices_puces
          : config.benefits,
      reassuranceText: pitchResult.texte_garantie,
      urgencyText: pitchResult.texte_urgence,
      ctaButtonText: pitchResult.bouton_appel_action,
      storeAccent: templateMeta.hex,
    });

    toast('Template visuel et textes persuasifs appliqués avec succès !', 'success');
    onClose();
  };

  // Application 1-Clic Mode Copywriting Complet
  const handleApplyFullCopy = () => {
    if (!copyResult) return;

    onApplyCopy({
      productTitle: copyResult.titre_principal,
      deliveryNotice: copyResult.sous_titre,
      description: copyResult.description_probleme_solution,
      benefits:
        copyResult.benefices_puces.length > 0 ? copyResult.benefices_puces : config.benefits,
      reassuranceText: copyResult.garantie_confiance,
      urgencyText: copyResult.urgence_rarete,
      ctaButtonText: copyResult.bouton_cta,
    });

    toast('La page de vente a été mise à jour avec le copywriting complet !', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-[28px] shadow-2xl border border-[#ECEFF4] flex flex-col max-h-[92vh] overflow-hidden">
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-linear-to-r from-blue-50/50 via-white to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#235BF7] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#201D1D] tracking-tight">
                  Gemini IA — E-commerce & COD Afrique
                </h3>
                <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Cash on Delivery & WhatsApp
                </span>
              </div>
              <p className="text-[12px] text-[#7A808C]">
                Directeur artistique, templates visuels et argumentaires de vente ultra-persuasifs
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

        {/* Sélecteur de Mode / Onglets */}
        <div className="px-6 pt-3 pb-2 border-b border-[#F1F5F9] bg-[#FAFBFD] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pitch_template')}
            className={`px-4 py-2 rounded-xl text-[13px] font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pitch_template'
                ? 'bg-[#235BF7] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Directeur Artistique & Template</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('full_copy')}
            className={`px-4 py-2 rounded-xl text-[13px] font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'full_copy'
                ? 'bg-[#235BF7] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Copywriting Page Complète</span>
          </button>
        </div>

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Configurations actuelles détectées */}
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#235BF7]" />
                Contexte réel de la boutique injecté
              </span>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                Connecté
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">
                  Boutique
                </span>
                <span className="font-semibold text-slate-800 truncate block">
                  {config.storeName || 'Juula Store'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Prix</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {config.price ? `${config.price.toLocaleString('fr-FR')} FCFA` : '15 000 FCFA'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">
                  Livraison
                </span>
                <span className="font-semibold text-emerald-700 truncate block">
                  {config.deliveryFree
                    ? '100% Gratuite'
                    : config.deliveryFee
                      ? `${config.deliveryFee.toLocaleString('fr-FR')} FCFA`
                      : 'Express'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">
                  Paiement
                </span>
                <span className="font-semibold text-slate-800 truncate block">
                  {config.codEnabled !== false ? 'À la livraison (COD)' : 'Wave / Orange Money'}
                </span>
              </div>
            </div>
          </div>

          {/* Formulaire commun */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 space-y-1">
              <label className="text-[12px] font-bold uppercase tracking-wider text-[#201D1D] flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#235BF7]" />
                Nom du Produit
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Sérum Anti-Taches Éclat"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[13px] font-semibold text-[#201D1D] focus:outline-hidden focus:border-[#235BF7]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-bold uppercase tracking-wider text-[#201D1D]">
                Prix (FCFA)
              </label>
              <input
                type="number"
                value={productPrice}
                onChange={(e) => setProductPrice(Number(e.target.value))}
                placeholder="Ex: 15000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[13px] text-[#201D1D] focus:outline-hidden focus:border-[#235BF7]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-bold uppercase tracking-wider text-[#201D1D] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Marché Cible
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Dakar, Abidjan..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[13px] text-[#201D1D] focus:outline-hidden focus:border-[#235BF7]"
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* ONGLET 1 : DIRECTEUR ARTISTIQUE & TEMPLATES VISUELS      */}
          {/* ======================================================== */}
          {activeTab === 'pitch_template' && (
            <div className="space-y-5">
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={isLoading || !productName.trim()}
                  onClick={handleGeneratePitch}
                  className="w-full sm:w-auto px-8 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Analyse artistique et rédaction en cours...
                    </>
                  ) : (
                    <>
                      <Palette className="w-4 h-4" />
                      Choisir le Template & Générer l'Argumentaire COD
                    </>
                  )}
                </Button>
              </div>

              {pitchResult && (
                <div className="space-y-4 pt-4 border-t border-[#F1F5F9] animate-in fade-in duration-300">
                  {/* Badge du Template Choisi */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{
                          backgroundColor: TEMPLATE_META[pitchResult.id_design_choisi].hex,
                        }}
                      >
                        {React.createElement(TEMPLATE_META[pitchResult.id_design_choisi].icon, {
                          className: 'w-5 h-5',
                        })}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Template Visuel Sélectionné par l'IA
                        </span>
                        <h4 className="text-base font-black">
                          {TEMPLATE_META[pitchResult.id_design_choisi].label}
                        </h4>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-white/10 text-white">
                      {pitchResult.id_design_choisi}
                    </span>
                  </div>

                  {/* Titre H1 */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 relative">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">
                      Titre Page de Vente (H1 Accrocheur)
                    </span>
                    <h4 className="text-base font-extrabold text-[#201D1D]">
                      {pitchResult.titre_page_vente}
                    </h4>
                  </div>

                  {/* Problème & Solution */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                        Frustration / Problème Client
                      </span>
                      <p className="text-[12.5px] text-amber-950 font-medium leading-relaxed">
                        {pitchResult.texte_intro_probleme}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                        Solution Persuasive & Enthousiaste
                      </span>
                      <p className="text-[12.5px] text-emerald-950 font-medium leading-relaxed">
                        {pitchResult.argumentaire_solution}
                      </p>
                    </div>
                  </div>

                  {/* 3 Bénéfices Puces */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">
                      Bénéfices Concrets ({pitchResult.liste_benefices_puces.length})
                    </span>
                    <ul className="space-y-1.5">
                      {pitchResult.liste_benefices_puces.map((b, i) => (
                        <li
                          key={i}
                          className="text-[12.5px] text-slate-700 flex items-start gap-2 font-medium"
                        >
                          <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Urgence & Garantie */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" />
                        Urgence / Stock Limité
                      </span>
                      <p className="text-[12px] text-rose-950 font-medium">
                        {pitchResult.texte_urgence}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Garantie Paiement à la Livraison
                      </span>
                      <p className="text-[12px] text-blue-950 font-medium">
                        {pitchResult.texte_garantie}
                      </p>
                    </div>
                  </div>

                  {/* Bouton Appel à l'action */}
                  <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Bouton d'achat (Appel à l'action)
                      </span>
                      <span className="text-[13px] font-black text-slate-900">
                        "{pitchResult.bouton_appel_action}"
                      </span>
                    </div>
                    <Truck className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 2 : COPYWRITING COMPLET (7 CLÉS STRICTES)        */}
          {/* ======================================================== */}
          {activeTab === 'full_copy' && (
            <div className="space-y-5">
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={isLoading || !productName.trim()}
                  onClick={handleGenerateFullCopy}
                  className="w-full sm:w-auto px-8 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Rédaction en cours...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Générer la Page de Vente Ultra-Persuasive
                    </>
                  )}
                </Button>
              </div>

              {copyResult && (
                <div className="space-y-4 pt-4 border-t border-[#F1F5F9] animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-black uppercase tracking-wider text-[#201D1D] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Structure 7-Clés Générée
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#235BF7] border border-blue-200">
                      {copyResult.source === 'gemini'
                        ? '⚡ Google Gemini 2.5 Flash'
                        : '🛡️ Moteur Expert Africain'}
                    </span>
                  </div>

                  {/* 1. Titre & Sous-titre */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">
                      1. Titre Principal (Accroche) & Sous-titre (Promesse)
                    </span>
                    <h4 className="text-base font-extrabold text-[#201D1D]">
                      {copyResult.titre_principal}
                    </h4>
                    <p className="text-[13px] text-slate-600 font-medium">
                      {copyResult.sous_titre}
                    </p>
                  </div>

                  {/* 2. Description Problème - Solution */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                      2. Description Problème - Solution
                    </span>
                    <p className="text-[13px] text-slate-700 leading-relaxed">
                      {copyResult.description_probleme_solution}
                    </p>
                  </div>

                  {/* 3. Bénéfices puces */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">
                      3. Bénéfices & Arguments Majeurs ({copyResult.benefices_puces.length})
                    </span>
                    <ul className="space-y-1.5">
                      {copyResult.benefices_puces.map((b, i) => (
                        <li
                          key={i}
                          className="text-[12.5px] text-slate-700 flex items-start gap-2 font-medium"
                        >
                          <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 4. Garantie & Urgence */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Garantie Confiance COD
                      </span>
                      <p className="text-[12px] text-amber-950 font-medium">
                        {copyResult.garantie_confiance}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" />
                        Urgence & Rareté
                      </span>
                      <p className="text-[12px] text-rose-950 font-medium">
                        {copyResult.urgence_rarete}
                      </p>
                    </div>
                  </div>

                  {/* Bouton CTA */}
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">
                        Bouton d'achat (CTA)
                      </span>
                      <span className="text-[13px] font-bold text-slate-900">
                        "{copyResult.bouton_cta}"
                      </span>
                    </div>
                    <Truck className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pied de page modal */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#F1F5F9] flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fermer
          </Button>

          {activeTab === 'pitch_template' && pitchResult && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleApplyPitch}
              className="shadow-md shadow-blue-500/20 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Appliquer le template & l'argumentaire (1-Clic)
            </Button>
          )}

          {activeTab === 'full_copy' && copyResult && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleApplyFullCopy}
              className="shadow-md shadow-blue-500/20 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Appliquer la page de vente complète (1-Clic)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
