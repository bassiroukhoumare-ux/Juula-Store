'use client';

import React, { useState } from 'react';
import { X, Check, Wallet, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFCFA } from '@/lib/orderUtils';

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  currency: string;
  onPayoutSuccess: (amount: number, provider: 'wave' | 'orange_money', phone: string) => void;
}

export const PayoutModal: React.FC<PayoutModalProps> = ({
  isOpen,
  onClose,
  availableBalance,
  currency,
  onPayoutSuccess,
}) => {
  const [provider, setProvider] = useState<'wave' | 'orange_money'>('wave');
  const [amount, setAmount] = useState<number>(Math.min(availableBalance, 100000));
  const [phone, setPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > availableBalance) return;

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        onPayoutSuccess(amount, provider, phone);
        setIsSuccess(false);
        onClose();
      }, 1500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-[#ECEFF4] rounded-[28px] p-7 shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#7A808C] hover:text-[#201D1D] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-[#ECFDF5] text-[#10B981] rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-xl font-black text-[#201D1D]">Virement en cours d'envoi !</h3>
            <p className="text-[15px] text-[#7A808C] max-w-xs mx-auto">
              {formatFCFA(amount)} sont en cours de transfert vers votre compte{' '}
              {provider === 'wave'
                ? 'Wave (+221 ' + phone + ')'
                : 'Orange Money (+221 ' + phone + ')'}
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleWithdraw}>
            <div className="flex items-center gap-2 mb-1 text-[#235BF7]">
              <Wallet className="w-5 h-5" />
              <span className="text-[13px] font-bold uppercase tracking-wider">
                Portefeuille Juula
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#201D1D] tracking-tight">
              Demande de Retrait
            </h2>
            <p className="text-[15px] text-[#7A808C] mt-1 mb-6">
              Transférez vos fonds encaissés en ligne directement sur votre compte Mobile Money.
            </p>

            {/* Current Available Balance Card */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] mb-5 flex items-center justify-between">
              <div>
                <span className="text-[13px] font-semibold text-[#7A808C] block">
                  Solde disponible immédiatement :
                </span>
                <span className="text-2xl font-black text-[#235BF7]">
                  {formatFCFA(availableBalance)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAmount(availableBalance)}
                className="text-[13px] font-bold text-[#235BF7] bg-[#EEF3FF] hover:bg-[#235BF7] hover:text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Tout retirer
              </button>
            </div>

            {/* Provider Selection */}
            <div className="space-y-3 mb-5">
              <label className="text-[13px] font-bold uppercase tracking-wider text-[#201D1D]/80 block">
                Destination du virement
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProvider('wave')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    provider === 'wave'
                      ? 'border-[#235BF7] bg-[#EEF3FF] ring-2 ring-[#235BF7]/20'
                      : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#1AA3FF] text-white font-black text-[15px] flex items-center justify-center flex-shrink-0">
                    W
                  </div>
                  <div>
                    <span className="text-[15px] font-bold text-[#201D1D] block">Wave Sénégal</span>
                    <span className="text-[13px] text-[#7A808C]">Instantané 0%</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setProvider('orange_money')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    provider === 'orange_money'
                      ? 'border-[#FF7900] bg-[#FFF5EB] ring-2 ring-[#FF7900]/20'
                      : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#FF7900] text-white font-black text-[13px] flex items-center justify-center flex-shrink-0">
                    OM
                  </div>
                  <div>
                    <span className="text-[15px] font-bold text-[#201D1D] block">Orange Money</span>
                    <span className="text-[13px] text-[#7A808C]">Instantané</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-3 mb-5">
              <label className="text-[13px] font-bold uppercase tracking-wider text-[#201D1D]/80 block">
                Montant du retrait ({currency})
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={5000}
                  max={availableBalance}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#E2E8F0] text-lg font-black text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:ring-2 focus:ring-[#235BF7]/15"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#94A3B8]">
                  {currency}
                </span>
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-3 mb-6">
              <label className="text-[13px] font-bold uppercase tracking-wider text-[#201D1D]/80 block">
                Numéro de réception
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#94A3B8]">
                  +221
                </span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="77 412 89 30"
                  className="w-full pl-16 pr-4 py-3 rounded-xl bg-white border border-[#E2E8F0] text-[15px] font-medium text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:ring-2 focus:ring-[#235BF7]/15"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isProcessing}
              disabled={amount <= 0 || amount > availableBalance}
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              Transférer {formatFCFA(amount)}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-[#7A808C]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Virement automatique sécurisé via API Mobile Money</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
