'use client';

import React, { useState } from 'react';
import { X, Check, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatNumber } from '@/lib/orderUtils';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecharged: (creditsAdded: number) => void;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({
  isOpen,
  onClose,
  onRecharged,
}) => {
  const [selectedPack, setSelectedPack] = useState<number>(150);
  const [paymentProvider, setPaymentProvider] = useState<'wave' | 'orange'>('wave');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const packs = [
    {
      credits: 50,
      price: 5000,
      label: 'Pack Découverte',
      popular: false,
      costPerLead: '100 FCFA/lead',
    },
    {
      credits: 150,
      price: 12500,
      label: 'Pack Croissance',
      popular: true,
      costPerLead: '83 FCFA/lead',
      discount: '-17%',
    },
    {
      credits: 500,
      price: 35000,
      label: 'Pack Scaler Pro',
      popular: false,
      costPerLead: '70 FCFA/lead',
      discount: '-30%',
    },
  ];

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        onRecharged(selectedPack);
        setIsSuccess(false);
        onClose();
      }, 1400);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-[#E5E9F0] rounded-3xl p-7 shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-[#ECFDF5] text-[#10B981] rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-xl font-black text-[#0F172A]">
              Recharge confirmée !
            </h3>
            <p className="text-sm text-[#64748B] max-w-xs mx-auto">
              +{selectedPack} crédits leads ont été ajoutés à votre compte Juula Store via {paymentProvider === 'wave' ? 'Wave' : 'Orange Money'}.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-1 text-[#1E60F8]">
              <Zap className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Recharge Immédiate
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">
              Recharger mes crédits Leads
            </h2>
            <p className="text-sm text-[#64748B] mt-1 mb-6">
              Paiement direct et sécurisé par Wave ou Orange Money.
            </p>

            {/* Pack Selector */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {packs.map((pack) => {
                const isSelected = selectedPack === pack.credits;
                return (
                  <button
                    key={pack.credits}
                    type="button"
                    onClick={() => setSelectedPack(pack.credits)}
                    className={`
                      relative p-3.5 rounded-2xl border text-left transition-all cursor-pointer
                      ${
                        isSelected
                          ? 'border-[#1E60F8] bg-[#EFF4FF] ring-2 ring-[#1E60F8]/15 shadow-xs'
                          : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white'
                      }
                    `}
                  >
                    {pack.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#1E60F8] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Populaire
                      </span>
                    )}
                    <span className="text-xs font-semibold text-[#64748B] block">
                      {pack.label}
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-lg font-black text-[#0F172A]">
                        {pack.credits}
                      </span>
                      <span className="text-[10px] font-bold text-[#1E60F8]">
                        leads
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#0F172A] mt-1">
                      {formatNumber(pack.price)} F
                    </p>
                    <p className="text-[10px] text-[#64748B]">
                      {pack.costPerLead}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3 mb-6">
              <label className="text-xs font-bold uppercase tracking-wider text-[#0F172A]/80 block">
                Moyen de Paiement
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentProvider('wave')}
                  className={`
                    flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer
                    ${
                      paymentProvider === 'wave'
                        ? 'border-[#1E60F8] bg-[#EFF4FF] ring-2 ring-[#1E60F8]/20'
                        : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
                    }
                  `}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#1AA3FF] text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                    W
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-[#0F172A] block">Wave Sénégal</span>
                    <span className="text-[10px] text-[#64748B]">0% de commission</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentProvider('orange')}
                  className={`
                    flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer
                    ${
                      paymentProvider === 'orange'
                        ? 'border-[#FF7900] bg-[#FFF5EB] ring-2 ring-[#FF7900]/20'
                        : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
                    }
                  `}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#FF7900] text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                    OM
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-[#0F172A] block">Orange Money</span>
                    <span className="text-[10px] text-[#64748B]">Instantané</span>
                  </div>
                </button>
              </div>

              {/* Phone number */}
              <div className="pt-2">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#94A3B8]">
                    +221
                  </span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="77 000 00 00"
                    className="w-full pl-16 pr-4 py-3 rounded-xl bg-white border border-[#E2E8F0] text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#1E60F8] focus:ring-2 focus:ring-[#1E60F8]/15"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#64748B] block">Total :</span>
                <span className="text-xl font-black text-[#0F172A]">
                  {formatNumber(packs.find((p) => p.credits === selectedPack)?.price || 0)} FCFA
                </span>
              </div>
              <Button
                variant="primary"
                size="lg"
                loading={isProcessing}
                onClick={handlePay}
                iconRight={<ArrowRight className="w-4 h-4" />}
              >
                Payer avec {paymentProvider === 'wave' ? 'Wave' : 'Orange'}
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Notification de validation envoyée sur votre mobile</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
