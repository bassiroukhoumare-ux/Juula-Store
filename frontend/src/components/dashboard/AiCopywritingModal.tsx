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
  Copy,
} from 'lucide-react';
import { FunnelPageConfig } from '@/types/juula';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';

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

export const AiCopywritingModal: React.FC<AiCopywritingModalProps> = ({
  isOpen,
  onClose,
  config,
  onApplyCopy,
}) => {
  const { toast } = useToast();
  const [productName, setProductName] = useState(config.productTitle || '');
  const [city, setCity] = useState('Dakar');
  const [category, setCategory] = useState(config.category || 'Général');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedCopyResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!productName.trim()) {
      toast('Veuillez indiquer le nom de votre produit.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/store/ai/copywriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: productName.trim(),
          storeName: config.storeName,
          category: category.trim(),
          price: config.price,
          originalPrice: config.originalPrice,
          deliveryFee: config.deliveryFee,
          deliveryFree: config.deliveryFree,
          deliveryNotice: config.deliveryNotice,
          codEnabled: config.codEnabled,
          whatsapp: config.whatsappSupportNumber,
          city: city.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Échec de la génération');
      }

      setGeneratedResult(data.copy);
      toast('Textes persuasifs générés avec succès !', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      toast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToPage = () => {
    if (!generatedResult) return;

    onApplyCopy({
      productTitle: generatedResult.titre_principal,
      deliveryNotice: generatedResult.sous_titre,
      description: generatedResult.description_probleme_solution,
      benefits:
        generatedResult.benefices_puces.length > 0
          ? generatedResult.benefices_puces
          : config.benefits,
      reassuranceText: generatedResult.garantie_confiance,
      urgencyText: generatedResult.urgence_rarete,
      ctaButtonText: generatedResult.bouton_cta,
    });

    toast('La page de vente a été mise à jour avec le copywriting IA !', 'success');
    onClose();
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-[28px] shadow-2xl border border-[#ECEFF4] flex flex-col max-h-[92vh] overflow-hidden">
        {/* En-tête */}
        <div className="px-6 py-5 border-b border-[#F1F5F9] flex items-center justify-between bg-linear-to-r from-blue-50/50 via-white to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#235BF7] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#201D1D] tracking-tight">
                  Gemini IA Copywriting E-commerce
                </h3>
                <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  COD & WhatsApp
                </span>
              </div>
              <p className="text-[12px] text-[#7A808C]">
                Page de vente ultra-persuasive optimisée pour le marché africain
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

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Contextes réels de la boutique */}
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#235BF7]" />
                Configurations réelles prises en compte
              </span>
              <span className="text-[11px] font-bold text-[#235BF7]">Auto-connecté</span>
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
                  {config.price ? `${config.price.toLocaleString('fr-FR')} FCFA` : 'Non défini'}
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
                  {config.codEnabled !== false ? 'À la livraison (COD)' : 'Mobile Money'}
                </span>
              </div>
            </div>
          </div>

          {/* Formulaire de personnalisation */}
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
                placeholder="Ex: Montre Luxe Quartz"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[13px] font-semibold text-[#201D1D] focus:outline-hidden focus:border-[#235BF7]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-bold uppercase tracking-wider text-[#201D1D] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Marché / Ville cible
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Dakar, Abidjan..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[13px] text-[#201D1D] focus:outline-hidden focus:border-[#235BF7]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-bold uppercase tracking-wider text-[#201D1D]">
                Catégorie
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Beauté, Électronique..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[13px] text-[#201D1D] focus:outline-hidden focus:border-[#235BF7]"
              />
            </div>
          </div>

          {/* Bouton de génération */}
          <div className="flex justify-center pt-1">
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={isLoading || !productName.trim()}
              onClick={handleGenerate}
              className="w-full sm:w-auto px-8 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  Rdaction de votre page en cours...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Générer la page de vente ultra-persuasive
                </>
              )}
            </Button>
          </div>

          {/* Résultats de génération structurée */}
          {generatedResult && (
            <div className="space-y-4 pt-4 border-t border-[#F1F5F9] animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-black uppercase tracking-wider text-[#201D1D] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Structure JSON 7-Clés Générée
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#235BF7] border border-blue-200">
                  {generatedResult.source === 'gemini'
                    ? '⚡ Google Gemini 2.5 Flash'
                    : '🛡️ Moteur Copywriting Africain Expert'}
                </span>
              </div>

              {/* 1. Titre & Sous-titre */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                    1. Titre Principal (Accroche) & Sous-titre (Promesse)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${generatedResult.titre_principal}\n${generatedResult.sous_titre}`,
                        'title',
                      )
                    }
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                  >
                    {copiedKey === 'title' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <h4 className="text-base font-extrabold text-[#201D1D]">
                  {generatedResult.titre_principal}
                </h4>
                <p className="text-[13px] text-slate-600 font-medium">
                  {generatedResult.sous_titre}
                </p>
              </div>

              {/* 2. Description Problème - Solution */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                    2. Description Problème - Solution
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(generatedResult.description_probleme_solution, 'desc')
                    }
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                  >
                    {copiedKey === 'desc' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[13px] text-slate-700 leading-relaxed">
                  {generatedResult.description_probleme_solution}
                </p>
              </div>

              {/* 3. Bénéfices puces */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                  3. Bénéfices & Arguments Majeurs ({generatedResult.benefices_puces.length})
                </span>
                <ul className="space-y-1.5">
                  {generatedResult.benefices_puces.map((b, i) => (
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

              {/* 4. Garantie & Urgence & CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Garantie & Confiance COD
                  </span>
                  <p className="text-[12px] text-amber-950 font-medium">
                    {generatedResult.garantie_confiance}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    Urgence & Rareté
                  </span>
                  <p className="text-[12px] text-rose-950 font-medium">
                    {generatedResult.urgence_rarete}
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
                    "{generatedResult.bouton_cta}"
                  </span>
                </div>
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          )}
        </div>

        {/* Pied de page modal */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#F1F5F9] flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fermer
          </Button>

          {generatedResult && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleApplyToPage}
              className="shadow-md shadow-blue-500/20 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Appliquer tout à la page de vente (1-Clic)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
