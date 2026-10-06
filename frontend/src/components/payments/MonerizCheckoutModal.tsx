'use client';

import React, { useEffect, useState } from 'react';
import { X, ExternalLink, ShieldCheck, Loader2 } from 'lucide-react';

interface MonerizSessionData {
  id: string;
  checkoutUrl: string;
  embedUrl: string | null;
  status: string;
  amount: number;
  currency: string;
  reference: string;
}

interface MonerizCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: MonerizSessionData | null;
  onPaymentSuccess: (paymentInfo: unknown) => void;
}

export const MonerizCheckoutModal: React.FC<MonerizCheckoutModalProps> = ({
  isOpen,
  onClose,
  session,
  onPaymentSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeHeight, setIframeHeight] = useState(580);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !session) return;
    setIsLoading(true);

    const embedUrlStr = session.embedUrl || session.checkoutUrl;
    if (!embedUrlStr) return;

    let embedOrigin: string;
    try {
      embedOrigin = new URL(embedUrlStr).origin;
    } catch {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      // 1. Contrôle d'origine exacte
      if (event.origin !== embedOrigin) return;

      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.source !== 'moneriz' || message.version !== 1) return;

      // 2. Traitement selon type d'événement officiel
      if (message.type === 'moneriz.ready') {
        setIsLoading(false);
      }

      if (message.type === 'moneriz.resize' && Number.isInteger(message.height)) {
        if (message.height >= 320 && message.height <= 4000) {
          setIframeHeight(message.height);
        }
      }

      if (message.type === 'moneriz.resume' && typeof message.resumeUrl === 'string') {
        setResumeUrl(message.resumeUrl);
      }

      if (message.type === 'moneriz.payment') {
        if (message.status === 'paid' && message.confirmation === 'confirmed') {
          console.info('[Moneriz Modal] Paiement validé par Moneriz:', message);
          onPaymentSuccess(message);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Timeout de sécurité pour retirer le loader
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 4000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, session, onPaymentSuccess]);

  if (!isOpen || !session) return null;

  const embedSrc = session.embedUrl || session.checkoutUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-[28px] shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête sécurisé */}
        <div className="px-5 py-3.5 bg-[#201D1D] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black tracking-wide uppercase">
              Paiement sécurisé JuulaPay (Wave · OM · Carte)
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps Iframe Responsive */}
        <div className="relative flex-1 overflow-y-auto min-h-[400px] p-2 bg-[#F8FAFC]">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 z-10">
              <Loader2 className="w-8 h-8 text-[#235BF7] animate-spin" />
              <span className="text-xs font-bold text-[#201D1D]">
                Connexion sécurisée aux passerelles de paiement...
              </span>
            </div>
          )}

          <iframe
            src={embedSrc}
            title="Paiement sécurisé JuulaPay"
            className="w-full rounded-2xl border-0 bg-transparent transition-all"
            style={{ height: `${iframeHeight}px`, minHeight: '480px' }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Pied de page avec lien de secours */}
        <div className="p-3 bg-white border-t border-[#E2E8F0] flex items-center justify-between text-xs">
          <span className="text-[11px] text-[#7A808C] flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Cryptage bancaire 256 bits · Ref: {session.reference}
          </span>

          <a
            href={resumeUrl || session.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-[#235BF7] hover:underline"
          >
            <span>Ouvrir en plein écran</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
