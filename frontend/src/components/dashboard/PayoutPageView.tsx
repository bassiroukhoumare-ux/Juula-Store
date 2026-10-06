'use client';

import { Skeleton } from '@/components/ui/Skeleton';
import React, { useEffect, useState, useRef } from 'react';
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
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatNumber, formatFCFA } from '@/lib/orderUtils';
import { api, ApiError } from '@/lib/api';
import { formatSenegalPhone } from '@/lib/store/sn-phone';

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
  const [accounts, setAccounts] = useState<{
    legalName: string | null;
    wavePhone: string | null;
    orangePhone: string | null;
  } | null>(null);

  // Saved payout accounts (Paramètres): the only allowed destinations.
  useEffect(() => {
    api<{
      accounts: { legalName: string | null; wavePhone: string | null; orangePhone: string | null };
    }>('/api/store/payout-accounts')
      .then(({ accounts: a }) => {
        setAccounts(a);
        const first = a.wavePhone ? 'wave' : a.orangePhone ? 'orange_money' : null;
        if (first) {
          setProvider(first);
          setPhone(formatSenegalPhone(first === 'wave' ? a.wavePhone : a.orangePhone));
        }
      })
      .catch(() => setAccounts({ legalName: null, wavePhone: null, orangePhone: null }));
  }, []);

  // 6-digit PIN entry state
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [receiptTxnId, setReceiptTxnId] = useState<string>('');

  // Forgot PIN / Email Reset Modal simulation state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request_sent' | 'email_preview' | 'reset_form'>(
    'request_sent',
  );
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

  // Submit withdrawal: amount, PIN and balance (72h hold) are all checked by
  // the server; this form only collects them.
  const handleSubmitWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 1000 || amount > availableBalance) {
      setPinError(
        availableBalance < 1000
          ? `Solde disponible insuffisant (minimum 1 000 ${currency}). Les paiements en ligne sont retirables 72 h après leur réception.`
          : `Le montant doit être compris entre 1 000 et ${formatNumber(availableBalance)} ${currency}.`,
      );
      return;
    }
    if (
      !accounts?.legalName ||
      !(provider === 'wave' ? accounts.wavePhone : accounts.orangePhone)
    ) {
      setPinError('Configurez d’abord vos moyens de retrait (Paramètres → Moyens de retrait).');
      return;
    }
    if (!payoutSecurity.isPinSet) {
      setPinError('Créez d’abord votre code PIN de retrait (Paramètres → Sécurité).');
      return;
    }
    const enteredPin = pinDigits.join('');
    if (enteredPin.length !== 6) {
      setPinError(
        'Veuillez saisir votre code PIN complet à 6 chiffres pour autoriser le virement.',
      );
      return;
    }

    setIsProcessing(true);
    setPinError(null);

    api<{ withdrawalId: string; status: string; reference?: string; message?: string }>(
      '/api/payments/moneriz/withdraw',
      {
        method: 'POST',
        body: { amount, provider, pin: enteredPin },
      },
    )
      .then((data) => {
        setReceiptTxnId(data.reference || data.withdrawalId);
        setIsSuccess(true);
        onPayoutSuccess(amount, provider, phone);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ApiError && typeof err.body.message === 'string'
            ? err.body.message
            : 'Le retrait n’a pas pu être effectué. Vérifiez votre connexion et réessayez.';
        setPinError(message);
        if (err instanceof ApiError && err.code === 'PIN_INVALID') {
          setPinDigits(['', '', '', '', '', '']);
        }
      })
      .finally(() => setIsProcessing(false));
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#EEF3FF] hover:text-[#235BF7] transition-colors cursor-pointer text-[#201D1D]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#7A808C]">
              <span>Portefeuille</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span className="text-[#235BF7] font-bold">Juula Pay</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#201D1D] tracking-tight mt-0.5">
              Juula Pay — Retrait Rapide & Sécurisé
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#EEF3FF] border border-[#BFDBFE] px-3.5 py-1.5 rounded-2xl text-[13px] font-bold text-[#235BF7] self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-[#235BF7]" />
          <span>Sécurité Juula Pay : Authentification PIN 6 Chiffres</span>
        </div>
      </div>

      {isSuccess ? (
        /* ======================================================== */
        /* SUCCESS RECEIPT VIEW                                     */
        /* ======================================================== */
        <div className="p-8 sm:p-12 rounded-[28px] bg-white border border-[#ECEFF4] shadow-md text-center max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <span className="text-[13px] font-black uppercase tracking-wider text-[#059669] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0]">
              Virement envoyé
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#201D1D]">
              {formatFCFA(amount)} en cours de transfert
            </h2>
            <p className="text-[13px] sm:text-[15px] text-[#7A808C] max-w-md mx-auto">
              Les fonds arrivent dans quelques minutes sur votre compte{' '}
              <strong className="text-[#201D1D]">
                {provider === 'wave' ? 'Wave Sénégal' : 'Orange Money'} (+221 {phone})
              </strong>
              .
            </p>
          </div>

          {/* Receipt Card */}
          <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-left text-[13px] space-y-2.5 max-w-md mx-auto tabular-nums">
            <div className="flex justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-[#7A808C]">Référence Juula</span>
              <span className="font-bold text-[#201D1D]">{receiptTxnId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7A808C]">Opérateur Récepteur</span>
              <span className="font-bold text-[#201D1D]">
                {provider === 'wave' ? 'Wave Sénégal (0% frais)' : 'Orange Money'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7A808C]">Compte Bénéficiaire</span>
              <span className="font-bold text-[#201D1D]">+221 {phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7A808C]">Date & Heure</span>
              <span className="font-bold text-[#201D1D]">Aujourd'hui, à l'instant</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#E2E8F0]">
              <span className="text-[#7A808C] font-sans font-bold">Nouveau solde disponible</span>
              <span className="font-bold text-[#235BF7] font-sans">
                {formatFCFA(availableBalance - amount)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={onBack}
              icon={<Wallet className="w-4 h-4" />}
            >
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
              <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
                  <div>
                    <span className="text-[13px] font-semibold text-[#7A808C] block">
                      Solde disponible immédiatement pour retrait :
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#235BF7]">
                      {formatFCFA(availableBalance)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAmount(availableBalance)}
                    className="self-start sm:self-auto text-[13px] font-bold text-[#235BF7] bg-[#EEF3FF] hover:bg-[#235BF7] hover:text-white px-4 py-2 rounded-xl transition-all cursor-pointer border border-[#BFDBFE]"
                  >
                    Tout retirer ({formatFCFA(availableBalance)})
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="text-[13px] font-black uppercase tracking-wider text-[#201D1D] block">
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
                      className="w-full px-4 py-3.5 pr-20 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] text-lg font-black text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white focus:ring-2 focus:ring-[#235BF7]/10"
                      placeholder="Ex: 50 000"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-black text-[#7A808C]">
                      {currency}
                    </span>
                  </div>

                  {/* Preset Amount Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[13px] text-[#94A3B8] font-bold">Montants rapides :</span>
                    {presets.map((val, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAmount(val)}
                        className={`text-[13px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          amount === val
                            ? 'bg-[#235BF7] text-white border-[#235BF7]'
                            : 'bg-[#F8FAFC] text-[#201D1D] border-[#E2E8F0] hover:bg-[#EEF3FF]'
                        }`}
                      >
                        {formatNumber(val)} F
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Destination: saved payout accounts only */}
              <div className="p-5 sm:p-6 rounded-[28px] bg-white border border-[#ECEFF4] space-y-4">
                <div>
                  <h3 className="text-[15px] font-black text-[#201D1D]">Recevoir l’argent sur</h3>
                  <p className="text-[13px] text-[#7A808C]">
                    {accounts?.legalName
                      ? `Au nom de ${accounts.legalName}`
                      : 'Vos numéros enregistrés dans Paramètres → Moyens de retrait.'}
                  </p>
                </div>

                {accounts === null ? (
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    role="status"
                    aria-label="Chargement"
                  >
                    <Skeleton className="h-[76px] rounded-2xl" />
                    <Skeleton className="h-[76px] rounded-2xl" />
                  </div>
                ) : !accounts.legalName || (!accounts.wavePhone && !accounts.orangePhone) ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                    <p className="text-[14px] font-semibold text-amber-800">
                      {!accounts.legalName
                        ? 'Renseignez votre nom complet (comme sur votre pièce d’identité) et votre numéro Wave ou Orange Money avant de retirer.'
                        : 'Ajoutez un numéro Wave ou Orange Money avant de retirer.'}
                    </p>
                    {onGoToSettings && (
                      <button
                        type="button"
                        onClick={onGoToSettings}
                        className="px-4 py-2 rounded-xl bg-[#201D1D] text-white text-[13px] font-bold cursor-pointer"
                      >
                        Configurer mes moyens de retrait
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(
                      [
                        {
                          id: 'wave',
                          label: 'Wave',
                          logo: '/brands/wave.png',
                          number: accounts.wavePhone,
                        },
                        {
                          id: 'orange_money',
                          label: 'Orange Money',
                          logo: '/brands/orange-money.png',
                          number: accounts.orangePhone,
                        },
                      ] as const
                    )
                      .filter((m) => m.number)
                      .map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setProvider(m.id);
                            setPhone(formatSenegalPhone(m.number));
                          }}
                          className={`p-4 rounded-2xl border-2 text-left transition-colors cursor-pointer flex items-center gap-3 ${
                            provider === m.id
                              ? 'border-[#235BF7] bg-[#F7F9FF]'
                              : 'border-[#E3E7EE] bg-white hover:bg-[#F6F7F9]'
                          }`}
                        >
                          <img
                            src={m.logo}
                            alt=""
                            className="w-11 h-11 rounded-xl object-contain bg-white border border-[#ECEFF4] p-1 shrink-0"
                          />
                          <span className="min-w-0">
                            <span className="block text-[15px] font-black text-[#201D1D]">
                              {m.label}
                            </span>
                            <span className="block text-[14px] text-[#7A808C] tabular-nums">
                              +221 {formatSenegalPhone(m.number)}
                            </span>
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* 3. CODE PIN OBLIGATOIRE À 6 CHIFFRES */}
              <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center font-bold">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-black text-[#201D1D]">
                        Code PIN de Retrait à 6 Chiffres (Obligatoire)
                      </h3>
                      <p className="text-[13px] text-[#7A808C]">
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
                    className="text-[13px] font-bold text-[#235BF7] hover:underline cursor-pointer self-start sm:self-auto"
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
                        className="w-9 h-12 xs:w-11 xs:h-14 sm:w-14 sm:h-16 text-center text-lg xs:text-xl sm:text-2xl font-black rounded-xl sm:rounded-2xl bg-[#F8FAFC] border-2 border-[#CBD5E1] text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white focus:ring-4 focus:ring-[#235BF7]/10 transition-all shrink-0"
                        placeholder="•"
                      />
                    ))}
                  </div>

                  {pinError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] font-bold text-red-600 animate-in shake duration-200">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{pinError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[13px] text-[#94A3B8] pt-1">
                    <span>Code actuel verrouillé : {payoutSecurity.maskedPin}</span>
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
                <p className="text-[13px] text-center text-[#94A3B8] mt-2 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>
                    Transfert sécurisé via passerelle Mobile Money certifiée Banque Centrale
                  </span>
                </p>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: FINANCIAL SUMMARY & SECURITY STATUS (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Financial Breakdown Card */}
            <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-4">
              <h3 className="text-[15px] font-black text-[#201D1D] pb-3 border-b border-[#F1F5F9]">
                Récapitulatif Financier
              </h3>

              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between items-center">
                  <span className="text-[#7A808C]">Montant demandé</span>
                  <span className="font-black text-[#201D1D] text-[15px]">
                    {formatFCFA(amount)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#7A808C]">
                    Frais de transfert ({provider === 'wave' ? 'Wave' : 'OM'})
                  </span>
                  <span className="font-extrabold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-md">
                    0 FCFA (Gratuit)
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#7A808C]">Délai de réception</span>
                  <span className="font-bold text-[#235BF7]">Instantané (&lt; 30 sec)</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#7A808C]">Bénéficiaire</span>
                  <span className="font-bold text-[#201D1D]">+221 {phone}</span>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] flex justify-between items-baseline">
                  <span className="font-black text-[#201D1D] text-[13px]">
                    Net versé sur votre compte
                  </span>
                  <span className="text-xl font-black text-[#235BF7]">{formatFCFA(amount)}</span>
                </div>
              </div>
            </div>

            {/* Security Profile Card (Harmonized Clean White Design) */}
            <div className="p-6 rounded-[28px] bg-white border border-[#ECEFF4] shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-[#F1F5F9]">
                <div className="w-9 h-9 rounded-2xl bg-[#EEF3FF] border border-[#BFDBFE] flex items-center justify-center text-[#235BF7] shrink-0">
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-[13px] font-black uppercase tracking-wider text-[#201D1D]">
                    Sécurité des Retraits
                  </h4>
                  <span className="text-xs text-[#7A808C]">Protection active contre la fraude</span>
                </div>
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                  <span className="text-xs uppercase font-extrabold text-[#7A808C] block">
                    Statut du Code PIN
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="tabular-nums text-emerald-600 font-black text-[15px] tracking-widest">
                      {payoutSecurity.maskedPin}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold bg-[#ECFDF5] text-[#059669] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      Actif & Protégé
                    </span>
                  </div>
                </div>

                <p className="text-[13px] text-[#7A808C] leading-relaxed">
                  Chaque virement exige obligatoirement votre code secret à 6 chiffres. En cas
                  d'oubli, la réinitialisation se fait exclusivement par lien sécurisé envoyé à
                  votre adresse vérifiée :
                </p>

                <div className="flex items-center gap-2 tabular-nums text-[13px] text-[#201D1D] bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 rounded-xl">
                  <Mail className="w-3.5 h-3.5 text-[#235BF7] shrink-0" />
                  <span className="truncate">{payoutSecurity.recoveryEmail}</span>
                </div>
              </div>

              {onGoToSettings && (
                <button
                  type="button"
                  onClick={onGoToSettings}
                  className="w-full py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#EEF3FF] text-[#235BF7] hover:text-[#1B4AD6] text-[13px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 border border-[#E2E8F0] hover:border-[#BFDBFE]"
                >
                  <span>Gérer dans Paramètres</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SIMULATION EMAIL RESET MODAL ("Code PIN Oublié ?")       */}
      {/* ======================================================== */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white border border-[#ECEFF4] rounded-[28px] p-6 sm:p-7 shadow-2xl overflow-hidden">
            {forgotStep === 'request_sent' && (
              <div className="space-y-5 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center mx-auto shadow-inner">
                  <Mail className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-[#235BF7] bg-[#EEF3FF] px-2.5 py-0.5 rounded-full">
                    Procédure de Récupération Sécurisée
                  </span>
                  <h3 className="text-xl font-black text-[#201D1D]">
                    Email de Réinitialisation Envoyé !
                  </h3>
                  <p className="text-[13px] text-[#7A808C] max-w-sm mx-auto">
                    Conformément à la sécurité bancaire Juula, un lien unique à usage unique a été
                    expédié à l'adresse du propriétaire de la boutique :
                  </p>
                  <p className="text-[13px] tabular-nums font-bold text-[#201D1D] bg-[#F8FAFC] py-1.5 px-3 rounded-lg border border-[#E2E8F0] inline-block">
                    {payoutSecurity.recoveryEmail}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left text-[13px] space-y-1">
                  <span className="font-bold text-amber-900 block">
                    Simulation d'environnement marchand :
                  </span>
                  <span className="text-amber-800 text-[13px]">
                    Dans cette interface de démonstration, vous pouvez ouvrir directement la boîte
                    de réception simulée pour tester le lien de réinitialisation.
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
                  <Button variant="outline" size="md" onClick={() => setIsForgotModalOpen(false)}>
                    Fermer
                  </Button>
                </div>
              </div>
            )}

            {forgotStep === 'email_preview' && (
              <div className="space-y-4">
                {/* Simulated Email Header */}
                <div className="border-b border-[#E2E8F0] pb-3 space-y-1 text-[13px]">
                  <div className="flex justify-between text-[#7A808C]">
                    <span>
                      De :{' '}
                      <strong className="text-[#201D1D]">
                        Sécurité Juula Pay &lt;securite@juula.store&gt;
                      </strong>
                    </span>
                    <span className="text-xs">À l'instant</span>
                  </div>
                  <div className="text-[#7A808C]">
                    À : <strong className="text-[#201D1D]">{payoutSecurity.recoveryEmail}</strong>
                  </div>
                  <div className="font-bold text-[#201D1D] pt-1 text-[15px] flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-[#235BF7] shrink-0" />
                    Réinitialisation de votre code PIN de retrait Juula Store
                  </div>
                </div>

                {/* Simulated Email Content Body */}
                <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4 text-[13px]">
                  <p className="text-[#201D1D]">
                    Bonjour <strong>Boutique Dakar Élégance</strong>,
                  </p>
                  <p className="text-[#7A808C] leading-relaxed">
                    Nous avons reçu une demande de réinitialisation de votre{' '}
                    <strong>code PIN de validation des retraits</strong>. Ce code protège vos
                    virements vers Wave et Orange Money.
                  </p>
                  <p className="text-[#7A808C] leading-relaxed">
                    Veuillez cliquer sur le bouton sécurisé ci-dessous pour saisir et confirmer
                    votre nouveau code PIN à 6 chiffres :
                  </p>

                  <div className="py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setForgotStep('reset_form')}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[13px] font-black shadow-md transition-all cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Définir mon nouveau Code PIN →</span>
                    </button>
                  </div>

                  <p className="text-xs text-[#94A3B8]">
                    Ce lien expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande,
                    veuillez ignorer ce message.
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="text-[13px] text-[#7A808C] hover:text-[#201D1D] cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {forgotStep === 'reset_form' && (
              <form onSubmit={handleResetPinSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-[#235BF7]">
                  <KeyRound className="w-5 h-5" />
                  <span className="text-[13px] font-bold uppercase tracking-wider">
                    Nouveau Code de Sécurité
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#201D1D]">
                  Définir un Nouveau Code PIN à 6 Chiffres
                </h3>
                <p className="text-[13px] text-[#7A808C]">
                  Entrez votre nouveau code PIN de retrait, puis confirmez-le une seconde fois.
                </p>

                {resetSuccessMessage ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <span className="text-[13px] font-black text-emerald-800 block">
                      {resetSuccessMessage}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {/* Input 1: New PIN */}
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-[#201D1D] block">
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
                            className="w-8 h-11 xs:w-10 xs:h-12 text-center text-lg font-black rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus:outline-none focus:border-[#235BF7] focus:bg-white shrink-0"
                            placeholder="•"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Input 2: Confirm PIN */}
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-[#201D1D] block">
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
                            className="w-8 h-11 xs:w-10 xs:h-12 text-center text-lg font-black rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus:outline-none focus:border-[#235BF7] focus:bg-white shrink-0"
                            placeholder="•"
                          />
                        ))}
                      </div>
                    </div>

                    {resetError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] font-bold text-red-600">
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
