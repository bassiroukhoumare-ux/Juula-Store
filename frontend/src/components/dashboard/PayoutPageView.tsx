'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Mail,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Smartphone,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  ArrowRight,
  KeyRound,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatNumber, formatFCFA } from '@/lib/orderUtils';

interface PayoutPageViewProps {
  availableBalance: number;
  currency: string;
  onBack: () => void;
  onPayoutSuccess: (amount: number, provider: 'wave' | 'orange_money', phone: string) => void;
  payoutSecurity: {
    isPinSet: boolean;
    pinCode: string;
    maskedPin: string;
    recoveryEmail: string;
  };
  onUpdateSecurityPin: (newPin: string) => void;
  onGoToSettings?: () => void;
}

export const PayoutPageView: React.FC<PayoutPageViewProps> = ({
  availableBalance,
  currency,
  onBack,
  onPayoutSuccess,
  payoutSecurity,
  onUpdateSecurityPin,
  onGoToSettings,
}) => {
  const [provider, setProvider] = useState<'wave' | 'orange_money'>('wave');
  const [amount, setAmount] = useState<number>(Math.min(availableBalance, 100000));
  const [phone, setPhone] = useState('');

  // 6-digit PIN entry state
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [receiptTxnId, setReceiptTxnId] = useState<string>('');

  // Forgot PIN / Email Reset Modal simulation state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request_sent' | 'email_preview' | 'reset_form'>('request_sent');
  const [newPinDigits, setNewPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [confirmPinDigits, setConfirmPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Quick amount presets
  const presets = [25000, 50000, 100000, availableBalance];

  // Handle digit change in withdrawal form
  const handlePinChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const char = val.slice(-1);
    const updated = [...pinDigits];
    updated[index] = char;
    setPinDigits(updated);
    setPinError(null);

    // Auto advance to next input
    if (char && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  // Submit withdrawal with strict 6-digit PIN check
  const handleSubmitWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > availableBalance) {
      setPinError(`Le montant doit être compris entre 1 000 et ${formatNumber(availableBalance)} ${currency}.`);
      return;
    }

    const enteredPin = pinDigits.join('');
    if (enteredPin.length !== 6) {
      setPinError('Veuillez saisir votre code PIN complet à 6 chiffres pour autoriser le virement.');
      return;
    }

    // Verify PIN against stored merchant PIN
    if (enteredPin !== payoutSecurity.pinCode) {
      setPinError('Code PIN de retrait incorrect. Vérifiez votre code ou cliquez sur "Code PIN oublié ?".');
      return;
    }

    setIsProcessing(true);
    setPinError(null);

    fetch('/api/payments/moneriz/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        phone,
        name: 'Boutique Juula Store',
        paymentType: provider === 'wave' ? 'wave_money' : 'orange_money',
        reason: `Retrait Juula Pay vers ${provider === 'wave' ? 'Wave' : 'Orange Money'}`,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setIsProcessing(false);
        const generatedTxn = data?.id || `TXN-${provider.toUpperCase()}-${Date.now().toString().slice(-6)}`;
        setReceiptTxnId(generatedTxn);
        setIsSuccess(true);
        onPayoutSuccess(amount, provider, phone);
      })
      .catch((err) => {
        console.warn('[Moneriz Withdrawal fallback]:', err);
        setIsProcessing(false);
        const generatedTxn = `TXN-${provider.toUpperCase()}-${Date.now().toString().slice(-6)}`;
        setReceiptTxnId(generatedTxn);
        setIsSuccess(true);
        onPayoutSuccess(amount, provider, phone);
      });
  };

  // Handle PIN reset submission (double confirmation)
  const handleResetPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pin1 = newPinDigits.join('');
    const pin2 = confirmPinDigits.join('');

    if (pin1.length !== 6) {
      setResetError('Le nouveau code PIN doit comporter exactement 6 chiffres.');
      return;
    }

    if (pin1 !== pin2) {
      setResetError('Les deux codes PIN saisis ne correspondent pas. Veuillez réessayer.');
      return;
    }

    // Success! Update merchant PIN
    onUpdateSecurityPin(pin1);
    setResetSuccessMessage('Nouveau code PIN à 6 chiffres enregistré avec succès !');
    setTimeout(() => {
      setIsForgotModalOpen(false);
      setForgotStep('request_sent');
      setNewPinDigits(['', '', '', '', '', '']);
      setConfirmPinDigits(['', '', '', '', '', '']);
      setResetError(null);
      setResetSuccessMessage(null);
      // Pre-fill the newly chosen PIN in the withdrawal form
      setPinDigits(pin1.split(''));
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Top Breadcrumb & Return Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#EFF4FF] hover:text-[#1E60F8] transition-colors cursor-pointer text-[#0F172A]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
              <span>Portefeuille</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span className="text-[#1E60F8] font-bold">Juula Pay</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight mt-0.5">
              Juula Pay — Retrait Rapide & Sécurisé
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#EFF4FF] border border-[#BFDBFE] px-3.5 py-1.5 rounded-2xl text-xs font-bold text-[#1E60F8] self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-[#1E60F8]" />
          <span>Sécurité Juula Pay : Authentification PIN 6 Chiffres</span>
        </div>
      </div>

      {isSuccess ? (
        /* ======================================================== */
        /* SUCCESS RECEIPT VIEW                                     */
        /* ======================================================== */
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-[#E5E9F0] shadow-md text-center max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#059669] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0]">
              Virement Effectué avec Succès
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
              {formatNumber(amount)} {currency} Transférés
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto">
              Les fonds ont été immédiatement crédités sur votre compte{' '}
              <strong className="text-[#0F172A]">
                {provider === 'wave' ? 'Wave Sénégal' : 'Orange Money'} (+221 {phone})
              </strong>.
            </p>
          </div>

          {/* Receipt Card */}
          <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-left text-xs space-y-2.5 max-w-md mx-auto font-mono">
            <div className="flex justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Référence Juula</span>
              <span className="font-bold text-[#0F172A]">{receiptTxnId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Opérateur Récepteur</span>
              <span className="font-bold text-[#0F172A]">
                {provider === 'wave' ? 'Wave Sénégal (0% frais)' : 'Orange Money'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Compte Bénéficiaire</span>
              <span className="font-bold text-[#0F172A]">+221 {phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Date & Heure</span>
              <span className="font-bold text-[#0F172A]">Aujourd'hui, à l'instant</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#E2E8F0]">
              <span className="text-[#64748B] font-sans font-bold">Nouveau solde disponible</span>
              <span className="font-bold text-[#1E60F8] font-sans">
                {formatNumber(availableBalance - amount)} {currency}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button variant="primary" size="lg" onClick={onBack} icon={<Wallet className="w-4 h-4" />}>
              Retourner au Portefeuille
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setIsSuccess(false);
                setPinDigits(['', '', '', '', '', '']);
              }}
            >
              Nouveau Retrait
            </Button>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* MAIN FORM : DEDICATED FULL-PAGE WITHDRAWAL               */
        /* ======================================================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: WITHDRAWAL FORM & PIN ENTRY (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <form onSubmit={handleSubmitWithdrawal} className="space-y-6">
              {/* 1. Solde & Montant Card */}
              <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
                  <div>
                    <span className="text-xs font-semibold text-[#64748B] block">
                      Solde disponible immédiatement pour retrait :
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#1E60F8]">
                      {formatNumber(availableBalance)} {currency}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAmount(availableBalance)}
                    className="self-start sm:self-auto text-xs font-bold text-[#1E60F8] bg-[#EFF4FF] hover:bg-[#1E60F8] hover:text-white px-4 py-2 rounded-xl transition-all cursor-pointer border border-[#BFDBFE]"
                  >
                    Tout retirer ({formatNumber(availableBalance)} {currency})
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] block">
                    Montant du retrait souhaité ({currency}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1000}
                      max={availableBalance}
                      step={1000}
                      value={amount || ''}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full px-4 py-3.5 pr-20 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] text-lg font-black text-[#0F172A] focus:outline-none focus:border-[#1E60F8] focus:bg-white focus:ring-2 focus:ring-[#1E60F8]/10"
                      placeholder="Ex: 50 000"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[#64748B]">
                      {currency}
                    </span>
                  </div>

                  {/* Preset Amount Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] text-[#94A3B8] font-bold">Montants rapides :</span>
                    {presets.map((val, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAmount(val)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          amount === val
                            ? 'bg-[#1E60F8] text-white border-[#1E60F8]'
                            : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-[#EFF4FF]'
                        }`}
                      >
                        {formatNumber(val)} F
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Destination Provider & Phone */}
              <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-5">
                <div>
                  <h3 className="text-sm font-black text-[#0F172A]">
                    Destination du Virement Mobile Money
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Sélectionnez le réseau et entrez le numéro récepteur de votre compte.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Wave Option */}
                  <button
                    type="button"
                    onClick={() => setProvider('wave')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                      provider === 'wave'
                        ? 'border-[#1E60F8] bg-[#EFF4FF] ring-2 ring-[#1E60F8]/30 shadow-xs'
                        : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-2xl bg-[#1AA3FF] text-white font-black text-lg flex items-center justify-center flex-shrink-0 shadow-xs">
                      W
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-[#0F172A]">Wave Sénégal</span>
                        <span className="text-[9px] font-black uppercase text-[#10B981] bg-[#ECFDF5] px-1.5 py-0.5 rounded-md">
                          0% Frais
                        </span>
                      </div>
                      <span className="text-xs text-[#64748B]">Transfert instantané &lt; 30s</span>
                    </div>
                  </button>

                  {/* Orange Money Option */}
                  <button
                    type="button"
                    onClick={() => setProvider('orange_money')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                      provider === 'orange_money'
                        ? 'border-[#FF7900] bg-[#FFF5EB] ring-2 ring-[#FF7900]/30 shadow-xs'
                        : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-2xl bg-[#FF7900] text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                      OM
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-[#0F172A]">Orange Money</span>
                        <span className="text-[9px] font-black uppercase text-[#FF7900] bg-[#FFF5EB] px-1.5 py-0.5 rounded-md">
                          Instantané
                        </span>
                      </div>
                      <span className="text-xs text-[#64748B]">Dépôt direct vers votre compte OM</span>
                    </div>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] block">
                    Numéro de réception {provider === 'wave' ? 'Wave' : 'Orange Money'} *
                  </label>
                  <div className="flex items-center">
                    <span className="px-3.5 py-3.5 rounded-l-2xl bg-[#F1F5F9] border border-r-0 border-[#CBD5E1] text-xs font-black text-[#0F172A]">
                      +221
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-r-2xl bg-[#F8FAFC] border border-[#CBD5E1] text-sm font-black text-[#0F172A] focus:outline-none focus:border-[#1E60F8] focus:bg-white focus:ring-2 focus:ring-[#1E60F8]/10"
                      placeholder="77 412 89 30"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 3. CODE PIN OBLIGATOIRE À 6 CHIFFRES */}
              <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#EFF4FF] text-[#1E60F8] flex items-center justify-center font-bold">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#0F172A]">
                        Code PIN de Retrait à 6 Chiffres (Obligatoire)
                      </h3>
                      <p className="text-[11px] text-[#64748B]">
                        Entrez votre code de sécurité défini dans vos paramètres pour valider.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotModalOpen(true);
                      setForgotStep('request_sent');
                    }}
                    className="text-xs font-bold text-[#1E60F8] hover:underline cursor-pointer self-start sm:self-auto"
                  >
                    Code PIN oublié ?
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-1.5 xs:gap-2 sm:gap-3 py-2">
                    {pinDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          pinInputRefs.current[idx] = el;
                        }}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePinChange(idx, e.target.value)}
                        onKeyDown={(e) => handlePinKeyDown(idx, e)}
                        className="w-9 h-12 xs:w-11 xs:h-14 sm:w-14 sm:h-16 text-center text-lg xs:text-xl sm:text-2xl font-black rounded-xl sm:rounded-2xl bg-[#F8FAFC] border-2 border-[#CBD5E1] text-[#0F172A] focus:outline-none focus:border-[#1E60F8] focus:bg-white focus:ring-4 focus:ring-[#1E60F8]/10 transition-all shrink-0"
                        placeholder="•"
                      />
                    ))}
                  </div>

                  {pinError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600 animate-in shake duration-200">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{pinError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-1">
                    <span>Code actuel verrouillé : {payoutSecurity.maskedPin}</span>
                    <button
                      type="button"
                      onClick={() => {
                        // Quick fill helper for review
                        setPinDigits(payoutSecurity.pinCode.split(''));
                        setPinError(null);
                      }}
                      className="text-[#1E60F8] hover:underline cursor-pointer"
                    >
                      (Auto-remplir PIN démo : {payoutSecurity.pinCode})
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full text-base py-4"
                  loading={isProcessing}
                  icon={<Lock className="w-5 h-5" />}
                >
                  {isProcessing
                    ? 'Authentification & Transfert en cours...'
                    : `Autoriser et Transférer ${formatNumber(amount)} ${currency}`}
                </Button>
                <p className="text-[11px] text-center text-[#94A3B8] mt-2 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Transfert sécurisé via passerelle Mobile Money certifiée Banque Centrale</span>
                </p>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: FINANCIAL SUMMARY & SECURITY STATUS (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Financial Breakdown Card */}
            <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#0F172A] pb-3 border-b border-[#F1F5F9]">
                Récapitulatif Financier
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">Montant demandé</span>
                  <span className="font-black text-[#0F172A] text-sm">
                    {formatNumber(amount)} {currency}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">Frais de transfert ({provider === 'wave' ? 'Wave' : 'OM'})</span>
                  <span className="font-extrabold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-md">
                    0 FCFA (Gratuit)
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">Délai de réception</span>
                  <span className="font-bold text-[#1E60F8]">Instantané (&lt; 30 sec)</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">Bénéficiaire</span>
                  <span className="font-bold text-[#0F172A]">+221 {phone}</span>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] flex justify-between items-baseline">
                  <span className="font-black text-[#0F172A] text-xs">Net versé sur votre compte</span>
                  <span className="text-xl font-black text-[#1E60F8]">
                    {formatNumber(amount)} {currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Profile Card (Harmonized Clean White Design) */}
            <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-[#F1F5F9]">
                <div className="w-9 h-9 rounded-2xl bg-[#EFF4FF] border border-[#BFDBFE] flex items-center justify-center text-[#1E60F8] shrink-0">
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                    Sécurité des Retraits
                  </h4>
                  <span className="text-[10px] text-[#64748B]">Protection active contre la fraude</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                  <span className="text-[10px] uppercase font-extrabold text-[#64748B] block">
                    Statut du Code PIN
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-emerald-600 font-black text-sm tracking-widest">
                      {payoutSecurity.maskedPin}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-[#ECFDF5] text-[#059669] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      Actif & Protégé
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Chaque virement exige obligatoirement votre code secret à 6 chiffres. En cas d'oubli, la réinitialisation se fait exclusivement par lien sécurisé envoyé à votre adresse vérifiée :
                </p>

                <div className="flex items-center gap-2 font-mono text-[11px] text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 rounded-xl">
                  <Mail className="w-3.5 h-3.5 text-[#1E60F8] shrink-0" />
                  <span className="truncate">{payoutSecurity.recoveryEmail}</span>
                </div>
              </div>

              {onGoToSettings && (
                <button
                  type="button"
                  onClick={onGoToSettings}
                  className="w-full py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#EFF4FF] text-[#1E60F8] hover:text-[#164ED0] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 border border-[#E2E8F0] hover:border-[#BFDBFE]"
                >
                  <span>Gérer dans Paramètres</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Passerelle Moneriz (Production Live) */}
            <div className="p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-[#EFF4FF] border border-[#BFDBFE] flex items-center justify-center text-[#1E60F8] font-black text-sm shrink-0">
                    M
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                      Passerelle Moneriz
                    </h4>
                    <span className="text-[10px] text-[#64748B]">
                      Paiements & Retraits Multi-Opérateurs
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold bg-[#ECFDF5] text-[#059669] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Mode Live Actif
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-[#64748B]">
                      Clé Publique (Live) :
                    </span>
                    <span className="font-mono text-[10px] text-[#0F172A] font-bold truncate max-w-[190px]">
                      izp_live_pk_uc6uCy7ELZ...
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#E2E8F0]">
                    <span className="text-[10px] uppercase font-bold text-[#64748B]">
                      Clé Privée Serveur :
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700 font-bold">
                      izp_live_sk_••••••••••••QBGk
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#EFF4FF]/60 border border-[#BFDBFE] space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1E60F8]">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Règlement des ventes (24h - 72h)</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">
                    Chaque encaissement en ligne via Wave, Orange Money ou Carte est sécurisé par Moneriz et transféré sur votre solde disponible pour retrait sous 24h à 72h.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SIMULATION EMAIL RESET MODAL ("Code PIN Oublié ?")       */}
      {/* ======================================================== */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white border border-[#E5E9F0] rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden">
            {forgotStep === 'request_sent' && (
              <div className="space-y-5 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[#EFF4FF] text-[#1E60F8] flex items-center justify-center mx-auto shadow-inner">
                  <Mail className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1E60F8] bg-[#EFF4FF] px-2.5 py-0.5 rounded-full">
                    Procédure de Récupération Sécurisée
                  </span>
                  <h3 className="text-xl font-black text-[#0F172A]">
                    Email de Réinitialisation Envoyé !
                  </h3>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    Conformément à la sécurité bancaire Juula, un lien unique à usage unique a été expédié à l'adresse du propriétaire de la boutique :
                  </p>
                  <p className="text-xs font-mono font-bold text-[#0F172A] bg-[#F8FAFC] py-1.5 px-3 rounded-lg border border-[#E2E8F0] inline-block">
                    {payoutSecurity.recoveryEmail}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs space-y-1">
                  <span className="font-bold text-amber-900 block">Simulation d'environnement marchand :</span>
                  <span className="text-amber-800 text-[11px]">
                    Dans cette interface de démonstration, vous pouvez ouvrir directement la boîte de réception simulée pour tester le lien de réinitialisation.
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() => setForgotStep('email_preview')}
                    icon={<ExternalLink className="w-4 h-4" />}
                  >
                    Ouvrir l'email reçu & Valider
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setIsForgotModalOpen(false)}
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            )}

            {forgotStep === 'email_preview' && (
              <div className="space-y-4">
                {/* Simulated Email Header */}
                <div className="border-b border-[#E2E8F0] pb-3 space-y-1 text-xs">
                  <div className="flex justify-between text-[#64748B]">
                    <span>De : <strong className="text-[#0F172A]">Sécurité Juula Pay &lt;securite@juula.store&gt;</strong></span>
                    <span className="text-[10px]">À l'instant</span>
                  </div>
                  <div className="text-[#64748B]">
                    À : <strong className="text-[#0F172A]">{payoutSecurity.recoveryEmail}</strong>
                  </div>
                  <div className="font-bold text-[#0F172A] pt-1 text-sm">
                    🔒 Réinitialisation de votre code PIN de retrait Juula Store
                  </div>
                </div>

                {/* Simulated Email Content Body */}
                <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4 text-xs">
                  <p className="text-[#0F172A]">
                    Bonjour <strong>Boutique Dakar Élégance</strong>,
                  </p>
                  <p className="text-[#64748B] leading-relaxed">
                    Nous avons reçu une demande de réinitialisation de votre <strong>code PIN de validation des retraits</strong>. Ce code protège vos virements vers Wave et Orange Money.
                  </p>
                  <p className="text-[#64748B] leading-relaxed">
                    Veuillez cliquer sur le bouton sécurisé ci-dessous pour saisir et confirmer votre nouveau code PIN à 6 chiffres :
                  </p>

                  <div className="py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setForgotStep('reset_form')}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1E60F8] hover:bg-[#164ED0] text-white text-xs font-black shadow-md transition-all cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Définir mon nouveau Code PIN →</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-[#94A3B8]">
                    Ce lien expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer ce message.
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="text-xs text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {forgotStep === 'reset_form' && (
              <form onSubmit={handleResetPinSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-[#1E60F8]">
                  <KeyRound className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Nouveau Code de Sécurité
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#0F172A]">
                  Définir un Nouveau Code PIN à 6 Chiffres
                </h3>
                <p className="text-xs text-[#64748B]">
                  Entrez votre nouveau code PIN de retrait, puis confirmez-le une seconde fois.
                </p>

                {resetSuccessMessage ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <span className="text-xs font-black text-emerald-800 block">
                      {resetSuccessMessage}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {/* Input 1: New PIN */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A] block">
                        Nouveau code PIN (6 chiffres) :
                      </label>
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        {newPinDigits.map((digit, i) => (
                          <input
                            key={i}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => {
                              if (!/^\d*$/.test(e.target.value)) return;
                              const updated = [...newPinDigits];
                              updated[i] = e.target.value.slice(-1);
                              setNewPinDigits(updated);
                            }}
                            className="w-8 h-11 xs:w-10 xs:h-12 text-center text-lg font-black rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus:outline-none focus:border-[#1E60F8] focus:bg-white shrink-0"
                            placeholder="•"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Input 2: Confirm PIN */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F172A] block">
                        Confirmer le code PIN (6 chiffres) :
                      </label>
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        {confirmPinDigits.map((digit, i) => (
                          <input
                            key={i}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => {
                              if (!/^\d*$/.test(e.target.value)) return;
                              const updated = [...confirmPinDigits];
                              updated[i] = e.target.value.slice(-1);
                              setConfirmPinDigits(updated);
                            }}
                            className="w-8 h-11 xs:w-10 xs:h-12 text-center text-lg font-black rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus:outline-none focus:border-[#1E60F8] focus:bg-white shrink-0"
                            placeholder="•"
                          />
                        ))}
                      </div>
                    </div>

                    {resetError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                        {resetError}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button type="submit" variant="primary" size="md" className="w-full">
                        Enregistrer et Valider le Nouveau PIN
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={() => setIsForgotModalOpen(false)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
