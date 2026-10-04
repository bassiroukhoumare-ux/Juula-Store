'use client';

import React, { useState } from 'react';
import {
  Store,
  Truck,
  CreditCard,
  MessageCircle,
  Save,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
} from 'lucide-react';
import { FunnelPageConfig } from '@/types/juula';
import { TrackingPixelsCard } from './TrackingPixelsCard';
import { StoreAddressCard } from '@/components/store/StoreAddressCard';
import type { StoreProfile } from '@/components/store/OnboardingScreen';

interface SettingsViewProps {
  funnelConfig: FunnelPageConfig;
  onSaveConfig: (updated: FunnelPageConfig) => void;
  payoutSecurity?: {
    isPinSet: boolean;
    pinCode: string;
    maskedPin: string;
    recoveryEmail: string;
  };
  onUpdateSecurityPin?: (newPin: string) => void;
  storeProfile?: StoreProfile;
  onStoreProfileSaved?: (profile: StoreProfile) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  funnelConfig,
  onSaveConfig,
  payoutSecurity = {
    isPinSet: false,
    pinCode: '',
    maskedPin: 'Non configuré',
    recoveryEmail: '',
  },
  onUpdateSecurityPin,
  storeProfile,
  onStoreProfileSaved,
}) => {
  // Local PIN editor state
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [newPin, setNewPin] = useState(['', '', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  const [storeCode, setStoreCode] = useState(funnelConfig.storeCode || 'CMD');
  const [whatsappNumber, setWhatsappNumber] = useState(funnelConfig.whatsappSupportNumber || '');
  const [deliveryFree, setDeliveryFree] = useState(funnelConfig.deliveryFree ?? false);
  const [deliveryFee, setDeliveryFee] = useState(funnelConfig.deliveryFee ?? 0);
  const [deliveryNotice, setDeliveryNotice] = useState(funnelConfig.deliveryNotice || '');
  const [waveMerchantNumber, setWaveMerchantNumber] = useState('');
  const [orangeMerchantNumber, setOrangeMerchantNumber] = useState('');
  const [codEnabled] = useState(funnelConfig.codEnabled ?? true);
  const [mobileMoneyEnabled] = useState(funnelConfig.mobileMoneyEnabled ?? true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...funnelConfig,
      storeCode,
      whatsappSupportNumber: whatsappNumber,
      deliveryFree,
      deliveryFee,
      deliveryNotice,
      codEnabled,
      mobileMoneyEnabled,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1E60F8] bg-[#EFF4FF] px-2.5 py-0.5 rounded-md">
              Configuration
            </span>
            <span className="text-xs text-[#64748B] font-semibold">Boutique & Logistique</span>
          </div>
          <h2 className="text-2xl font-black text-[#0F172A] tracking-tight mt-1">
            Paramètres du SaaS Juula
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configurez les frais de livraison par défaut, le préfixe de vos numéros de commande et
            vos comptes Wave / Orange Money.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1E60F8] hover:bg-[#164ED0] text-white text-xs font-black shadow-[0_2px_10px_rgba(30,96,248,0.25)] transition-all cursor-pointer"
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Modifications Enregistrées !</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Enregistrer les paramètres</span>
            </>
          )}
        </button>
      </div>

      {storeProfile && onStoreProfileSaved && (
        <StoreAddressCard profile={storeProfile} onSaved={onStoreProfileSaved} />
      )}

      <TrackingPixelsCard />

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. STORE IDENTITY & ORDER PREFIX */}
        <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
            <div className="w-8 h-8 rounded-xl bg-[#EFF4FF] text-[#1E60F8] flex items-center justify-center font-bold">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#0F172A]">Identité de la Boutique</h3>
              <p className="text-[11px] text-[#64748B]">
                Ces informations personnalisent automatiquement vos tunnels et le préfixe de
                commande.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Code Préfixe Commande (ex: BDE) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={storeCode}
                  onChange={(e) => setStoreCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono font-bold text-[#1E60F8] uppercase focus:outline-none focus:border-[#1E60F8] focus:bg-white"
                  placeholder="BDE"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#94A3B8]">
                  Format : CMD-{storeCode || 'BDE'}-000001
                </span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Numéro WhatsApp support & confirmations *
              </label>
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-[#25D366] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#1E60F8] focus:bg-white"
                  placeholder="+221 77 412 89 30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. LOGISTICS & DELIVERY FEES */}
        <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
            <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#0F172A]">
                Logistique & Tarification de Livraison
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Définissez si la livraison est offerte ou payante pour vos clients à Dakar.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Delivery mode toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryFree(true)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  deliveryFree
                    ? 'border-[#10B981] bg-[#ECFDF5] ring-2 ring-[#10B981]/20 shadow-xs'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-[#0F172A]">
                    Livraison Gratuite (Offerte)
                  </span>
                  {deliveryFree && <CheckCircle2 className="w-4 h-4 text-[#10B981]" />}
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Augmente fortement le taux de conversion. Aucun frais supplémentaire facturé.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryFree(false)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  !deliveryFree
                    ? 'border-[#1E60F8] bg-[#EFF4FF] ring-2 ring-[#1E60F8]/20 shadow-xs'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-[#0F172A]">
                    Frais de Livraison Fixes
                  </span>
                  {!deliveryFree && <CheckCircle2 className="w-4 h-4 text-[#1E60F8]" />}
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Ajoute automatiquement le tarif de coursier au montant total à régler.
                </p>
              </button>
            </div>

            {!deliveryFree && (
              <div className="p-4 rounded-2xl bg-[#EFF4FF]/40 border border-[#BFDBFE] space-y-2">
                <label className="block text-xs font-bold text-[#1E60F8]">
                  Montant des frais de livraison standard (FCFA) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    className="w-48 px-4 py-2.5 rounded-xl bg-white border border-[#BFDBFE] text-sm font-black text-[#1E60F8] focus:outline-none"
                  />
                  <span className="text-xs text-[#64748B]">
                    Exemple : 1 500 FCFA pour la zone urbaine de Dakar
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Mention de livraison affichée sur la vitrine *
              </label>
              <input
                type="text"
                value={deliveryNotice}
                onChange={(e) => setDeliveryNotice(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-[#1E60F8] focus:bg-white"
                placeholder="Expédition locale sous 2h à 4h à Dakar"
              />
            </div>
          </div>
        </div>

        {/* 3. PAYMENT GATEWAYS (WAVE & ORANGE MONEY) */}
        <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
            <div className="w-8 h-8 rounded-xl bg-[#EFF4FF] text-[#1E60F8] flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#0F172A]">
                Moyens de Paiement & Encaissement
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Configurez vos comptes récepteurs pour les retraits automatiques et paiements
                directs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Wave Sénégal Card */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#1AA3FF] text-white flex items-center justify-center text-[10px] font-black">
                    W
                  </div>
                  <span className="text-xs font-black text-[#0F172A]">Wave Sénégal</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Actif
                </span>
              </div>
              <input
                type="text"
                value={waveMerchantNumber}
                onChange={(e) => setWaveMerchantNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#0F172A]"
                placeholder="Numéro Wave Marchand"
              />
              <span className="text-[10px] text-[#94A3B8] block">
                Fonds déposés instantanément sur votre solde Juula.
              </span>
            </div>

            {/* Orange Money Card */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#FF7900] text-white flex items-center justify-center text-[10px] font-black">
                    OM
                  </div>
                  <span className="text-xs font-black text-[#0F172A]">Orange Money Sénégal</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Actif
                </span>
              </div>
              <input
                type="text"
                value={orangeMerchantNumber}
                onChange={(e) => setOrangeMerchantNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#0F172A]"
                placeholder="Numéro Orange Money Marchand"
              />
              <span className="text-[10px] text-[#94A3B8] block">
                Validations instantanées par QR ou Push USSD.
              </span>
            </div>
          </div>
        </div>

        {/* 4. SÉCURITÉ DES VIREMENTS & CODE PIN À 6 CHIFFRES */}
        <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EFF4FF] text-[#1E60F8] flex items-center justify-center font-bold">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0F172A]">
                  Sécurité des Virements : Code PIN à 6 Chiffres
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Code secret requis pour autoriser tout virement Mobile Money vers Wave ou Orange
                  Money.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-mono font-bold text-[#059669] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0]">
                {payoutSecurity.isPinSet
                  ? `Code Actif : ${payoutSecurity.maskedPin}`
                  : 'Non défini'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-7 space-y-4">
              <p className="text-xs text-[#64748B] leading-relaxed">
                Ce code de validation unique protège l'ensemble de vos fonds encaissés. Dès sa
                création, vos chiffres sont masqués ({payoutSecurity.maskedPin}) pour éviter toute
                indiscrétion.
              </p>

              {!isEditingPin ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPin(true);
                      setPinError(null);
                      setPinSuccess(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EFF4FF] text-[#1E60F8] hover:bg-[#1E60F8] hover:text-white text-xs font-black transition-all cursor-pointer border border-[#BFDBFE]"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Modifier le Code PIN à 6 Chiffres</span>
                  </button>
                  <span className="text-[11px] text-[#94A3B8]">
                    Dernière mise à jour : Actif et verrouillé
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Nouveau code PIN (6 chiffres) :
                    </label>
                    <div className="flex items-center gap-2">
                      {newPin.map((digit, i) => (
                        <input
                          key={i}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            if (!/^\d*$/.test(e.target.value)) return;
                            const updated = [...newPin];
                            updated[i] = e.target.value.slice(-1);
                            setNewPin(updated);
                          }}
                          className="w-9 h-11 text-center text-base font-black rounded-xl bg-white border border-[#CBD5E1] focus:outline-none focus:border-[#1E60F8]"
                          placeholder="•"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#0F172A] block">
                      Confirmer le nouveau code PIN (6 chiffres) :
                    </label>
                    <div className="flex items-center gap-2">
                      {confirmPin.map((digit, i) => (
                        <input
                          key={i}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            if (!/^\d*$/.test(e.target.value)) return;
                            const updated = [...confirmPin];
                            updated[i] = e.target.value.slice(-1);
                            setConfirmPin(updated);
                          }}
                          className="w-9 h-11 text-center text-base font-black rounded-xl bg-white border border-[#CBD5E1] focus:outline-none focus:border-[#1E60F8]"
                          placeholder="•"
                        />
                      ))}
                    </div>
                  </div>

                  {pinError && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                      {pinError}
                    </div>
                  )}

                  {pinSuccess && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                      {pinSuccess}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const p1 = newPin.join('');
                        const p2 = confirmPin.join('');
                        if (p1.length !== 6) {
                          setPinError('Le code PIN doit comporter exactement 6 chiffres.');
                          return;
                        }
                        if (p1 !== p2) {
                          setPinError('Les deux codes PIN ne correspondent pas.');
                          return;
                        }
                        if (onUpdateSecurityPin) {
                          onUpdateSecurityPin(p1);
                        }
                        setPinSuccess('Code PIN mis à jour avec succès !');
                        setTimeout(() => {
                          setIsEditingPin(false);
                          setNewPin(['', '', '', '', '', '']);
                          setConfirmPin(['', '', '', '', '', '']);
                          setPinSuccess(null);
                        }, 1200);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#1E60F8] hover:bg-[#164ED0] text-white text-xs font-black cursor-pointer shadow-xs"
                    >
                      Enregistrer le nouveau code PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPin(false);
                        setPinError(null);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-5 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs">
              <span className="font-bold text-[#0F172A] block flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#1E60F8]" />
                <span>Adresse email de récupération</span>
              </span>
              <p className="text-[11px] text-[#64748B]">
                En cas d'oubli de votre code PIN, un email de réinitialisation sécurisé sera envoyé
                à cette adresse :
              </p>
              <div className="p-2.5 rounded-xl bg-white border border-[#CBD5E1] font-mono font-bold text-[#0F172A]">
                {payoutSecurity.recoveryEmail}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1E60F8] hover:bg-[#164ED0] text-white text-xs font-black shadow-md cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer toutes les modifications</span>
          </button>
        </div>
      </form>
    </div>
  );
};
