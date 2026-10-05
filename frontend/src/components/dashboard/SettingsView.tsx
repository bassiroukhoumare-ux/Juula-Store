'use client';

import React, { useState } from 'react';
import {
  Store,
  Truck,
  MessageCircle,
  Save,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  LogOut,
} from 'lucide-react';
import { FunnelPageConfig } from '@/types/juula';
import { TrackingPixelsCard } from './TrackingPixelsCard';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import { PayoutAccountsCard } from '@/components/store/PayoutAccountsCard';
import { StoreAddressCard } from '@/components/store/StoreAddressCard';
import { CurrencyCard } from '@/components/store/CurrencyCard';
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
  /** Phone/tablet: the sidebar (and its logout) is hidden, so offer it here. */
  onLogout?: () => Promise<void> | void;
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
  onLogout,
}) => {
  const [showLogout, setShowLogout] = useState(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#235BF7] bg-[#EEF3FF] px-2.5 py-0.5 rounded-md">
              Configuration
            </span>
            <span className="text-[13px] text-[#7A808C] font-semibold">Boutique & Logistique</span>
          </div>
          <h2 className="text-2xl font-black text-[#201D1D] tracking-tight mt-1">Paramètres</h2>
          <p className="text-[13px] text-[#7A808C] mt-0.5">
            Configurez les frais de livraison par défaut, le préfixe de vos numéros de commande et
            vos comptes Wave / Orange Money.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[13px] font-black shadow-[0_2px_10px_rgba(30,96,248,0.25)] transition-all cursor-pointer"
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

      {storeProfile && onStoreProfileSaved && (
        <CurrencyCard profile={storeProfile} onSaved={onStoreProfileSaved} />
      )}

      <PayoutAccountsCard pinRequired={payoutSecurity.isPinSet} />

      <TrackingPixelsCard />

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. STORE IDENTITY & ORDER PREFIX */}
        <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
            <div className="w-8 h-8 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center font-bold">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-[#201D1D]">Identité de la Boutique</h3>
              <p className="text-[13px] text-[#7A808C]">
                Ces informations personnalisent automatiquement vos tunnels et le préfixe de
                commande.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-[#201D1D] mb-1">
                Code Préfixe Commande (ex: BDE) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={storeCode}
                  onChange={(e) => setStoreCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] tabular-nums font-bold text-[#235BF7] uppercase focus:outline-none focus:border-[#235BF7] focus:bg-white"
                  placeholder="BDE"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8]">
                  Format : CMD-{storeCode || 'BDE'}-000001
                </span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[13px] font-bold text-[#201D1D] mb-1">
                Numéro WhatsApp support & confirmations *
              </label>
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-[#25D366] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] font-medium text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white"
                  placeholder="+221 77 412 89 30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. LOGISTICS & DELIVERY FEES */}
        <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
            <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-[#201D1D]">
                Logistique & Tarification de Livraison
              </h3>
              <p className="text-[13px] text-[#7A808C]">
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
                  <span className="text-[13px] font-black text-[#201D1D]">
                    Livraison Gratuite (Offerte)
                  </span>
                  {deliveryFree && <CheckCircle2 className="w-4 h-4 text-[#10B981]" />}
                </div>
                <p className="text-[13px] text-[#7A808C]">
                  Augmente fortement le taux de conversion. Aucun frais supplémentaire facturé.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryFree(false)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  !deliveryFree
                    ? 'border-[#235BF7] bg-[#EEF3FF] ring-2 ring-[#235BF7]/20 shadow-xs'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-black text-[#201D1D]">
                    Frais de Livraison Fixes
                  </span>
                  {!deliveryFree && <CheckCircle2 className="w-4 h-4 text-[#235BF7]" />}
                </div>
                <p className="text-[13px] text-[#7A808C]">
                  Ajoute automatiquement le tarif de coursier au montant total à régler.
                </p>
              </button>
            </div>

            {!deliveryFree && (
              <div className="p-4 rounded-2xl bg-[#EEF3FF]/40 border border-[#BFDBFE] space-y-2">
                <label className="block text-[13px] font-bold text-[#235BF7]">
                  Montant des frais de livraison standard (FCFA) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    className="w-48 px-4 py-2.5 rounded-xl bg-white border border-[#BFDBFE] text-[15px] font-black text-[#235BF7] focus:outline-none"
                  />
                  <span className="text-[13px] text-[#7A808C]">
                    Exemple : 1 500 FCFA pour la zone urbaine de Dakar
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-bold text-[#201D1D] mb-1">
                Mention de livraison affichée sur la vitrine *
              </label>
              <input
                type="text"
                value={deliveryNotice}
                onChange={(e) => setDeliveryNotice(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white"
                placeholder="Expédition locale sous 2h à 4h à Dakar"
              />
            </div>
          </div>
        </div>

        {/* 4. SÉCURITÉ DES VIREMENTS & CODE PIN À 6 CHIFFRES */}
        <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center font-bold">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-black text-[#201D1D]">
                  Sécurité des Virements : Code PIN à 6 Chiffres
                </h3>
                <p className="text-[13px] text-[#7A808C]">
                  Code secret requis pour autoriser tout virement Mobile Money vers Wave ou Orange
                  Money.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[13px] tabular-nums font-bold text-[#059669] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0]">
                {payoutSecurity.isPinSet
                  ? `Code Actif : ${payoutSecurity.maskedPin}`
                  : 'Non défini'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-7 space-y-4">
              <p className="text-[13px] text-[#7A808C] leading-relaxed">
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
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EEF3FF] text-[#235BF7] hover:bg-[#235BF7] hover:text-white text-[13px] font-black transition-all cursor-pointer border border-[#BFDBFE]"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Modifier le Code PIN à 6 Chiffres</span>
                  </button>
                  <span className="text-[13px] text-[#94A3B8]">
                    Dernière mise à jour : Actif et verrouillé
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="text-[13px] font-bold text-[#201D1D] block">
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
                          className="w-9 h-11 text-center text-base font-black rounded-xl bg-white border border-[#CBD5E1] focus:outline-none focus:border-[#235BF7]"
                          placeholder="•"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[13px] font-bold text-[#201D1D] block">
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
                          className="w-9 h-11 text-center text-base font-black rounded-xl bg-white border border-[#CBD5E1] focus:outline-none focus:border-[#235BF7]"
                          placeholder="•"
                        />
                      ))}
                    </div>
                  </div>

                  {pinError && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[13px] font-bold text-red-600">
                      {pinError}
                    </div>
                  )}

                  {pinSuccess && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[13px] font-bold text-emerald-700">
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
                      className="px-4 py-2 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[13px] font-black cursor-pointer shadow-xs"
                    >
                      Enregistrer le nouveau code PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPin(false);
                        setPinError(null);
                      }}
                      className="px-3 py-2 rounded-xl text-[13px] font-semibold text-[#7A808C] hover:text-[#201D1D] cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-5 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-[13px]">
              <span className="font-bold text-[#201D1D] block flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#235BF7]" />
                <span>Adresse email de récupération</span>
              </span>
              <p className="text-[13px] text-[#7A808C]">
                En cas d'oubli de votre code PIN, un email de réinitialisation sécurisé sera envoyé
                à cette adresse :
              </p>
              <div className="p-2.5 rounded-xl bg-white border border-[#CBD5E1] tabular-nums font-bold text-[#201D1D]">
                {payoutSecurity.recoveryEmail}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[13px] font-black shadow-md cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer toutes les modifications</span>
          </button>
        </div>
      </form>

      {onLogout && (
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setShowLogout(true)}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-[#ECEFF4] text-[15px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
          <LogoutConfirmDialog
            open={showLogout}
            onCancel={() => setShowLogout(false)}
            onConfirm={onLogout}
          />
        </div>
      )}
    </div>
  );
};
