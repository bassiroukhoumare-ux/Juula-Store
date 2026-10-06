'use client';

import {
  ComparisonTable,
  FaqAccordion,
  ProductDescription,
  PageSection,
} from '@/components/showcase/ProductLongContent';
import { displayFont } from '@/app/fonts';
import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingCart,
  Check,
  Eye,
  Smartphone,
  Truck,
  ShieldCheck,
  Star,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  X,
  ArrowRight,
  Banknote,
  MapPin,
  User,
  Award,
  Send,
  Maximize2,
  Lock,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  CheckCheck,
  Plus,
  Minus,
  ArrowLeft,
  Palette,
} from 'lucide-react';
import {
  FunnelPageConfig,
  OrderLead,
  CustomerReview,
  ProofItem,
  QuantityDiscountTier,
} from '@/types/juula';
import { Button } from '@/components/ui/Button';
import { formatOrderId, formatFCFA } from '@/lib/orderUtils';
import { formatMoney, getDisplayCurrency } from '@/lib/money';
import { DEFAULT_URGENCY_TEXT } from '@/lib/store/urgency';
import { MonerizCheckoutModal } from '@/components/payments/MonerizCheckoutModal';

// SVG Officiel WhatsApp
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/** What the server returns once a public order is saved. */
export interface SubmittedOrder {
  /** Server-side order id (used to start and verify the online payment). */
  id: string;
  reference: string;
  amount: number;
  deliveryFee: number;
  totalAmount: number;
}

interface ImmersiveShowcaseProps {
  config: FunnelPageConfig;
  onOrderCreated?: (order: Partial<OrderLead>) => void;
  /**
   * Public product page mode: persist the order server-side before showing
   * the confirmation. The resolved reference/amounts (priced by the server)
   * replace the locally computed ones. A rejection's message is shown.
   */
  submitOrder?: (order: OrderLead) => Promise<SubmittedOrder>;
  /**
   * Public mode: ask the server to verify an online payment with Moneriz
   * (the iframe's "paid" message alone is not trusted). Resolves true when
   * the server confirmed it.
   */
  confirmPayment?: (orderId: string) => Promise<boolean>;
  /** Fired when the customer opens the order form (pixel InitiateCheckout). */
  onCheckoutOpened?: (info: { quantity: number; value: number }) => void;
  /** Public mode: the order form is being filled in (abandoned-checkout capture). */
  onCheckoutDraft?: (draft: {
    customerName: string;
    phone: string;
    address: string;
    quantity: number;
  }) => void;
  isInsideMockup?: boolean;
}

export const ImmersiveShowcase: React.FC<ImmersiveShowcaseProps> = ({
  config,
  onOrderCreated,
  submitOrder,
  confirmPayment,
  onCheckoutOpened,
  onCheckoutDraft,
  isInsideMockup = false,
}) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isCheckoutPageOpen, setIsCheckoutPageOpen] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  // What the merchant offers (injected on public pages from the store).
  const codOn = config.codEnabled !== false;
  const onlineOn = config.onlinePaymentsEnabled !== false && config.mobileMoneyEnabled !== false;
  const directMethods = config.directPaymentMethods ?? [];
  const waNumber = config.whatsappOrderNumber ?? null;
  const defaultChoice = codOn
    ? 'cod'
    : onlineOn
      ? 'online'
      : directMethods[0]
        ? `direct:${directMethods[0].id}`
        : 'cod';
  // 'cod' | 'online' (Mobile Money via JuulaPay) | `direct:<methodId>`
  const [paymentChoice, setPaymentChoice] = useState<string>(defaultChoice);
  // « Commander maintenant » (order form + payment) or « Commander sur WhatsApp ».
  const [checkoutMode, setCheckoutMode] = useState<'order' | 'whatsapp'>('order');
  const chosenDirect = paymentChoice.startsWith('direct:')
    ? directMethods.find((m) => `direct:${m.id}` === paymentChoice)
    : undefined;
  const [selectedColor, setSelectedColor] = useState<string>(
    config.availableColors && config.availableColors.length > 0
      ? config.availableColors[0]?.name || ''
      : '',
  );

  useEffect(() => {
    if (config.availableColors && config.availableColors.length > 0 && !selectedColor) {
      setSelectedColor(config.availableColors[0]?.name || '');
    }
  }, [config.availableColors, selectedColor]);

  // Moneriz Checkout Modal state
  const [monerizSession, setMonerizSession] =
    useState<React.ComponentProps<typeof MonerizCheckoutModal>['session']>(null);
  const [isMonerizModalOpen, setIsMonerizModalOpen] = useState(false);
  const [pendingOnlineOrder, setPendingOnlineOrder] = useState<OrderLead | null>(null);
  const [pendingOrderDbId, setPendingOrderDbId] = useState<string | null>(null);

  // Address Input Mode: text vs voice
  const [addressInputMode, setAddressInputMode] = useState<'text' | 'voice'>('text');

  // Voice Note Recorder state
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [, setVoiceNoteBlob] = useState<Blob | null>(null);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [, setIsPlayingRecordedVoice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewsList, setReviewsList] = useState<CustomerReview[]>(
    config.reviews && config.reviews.length > 0 ? config.reviews : [],
  );

  // New review form
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewCity, setNewReviewCity] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Proof Items (Images, Videos, WhatsApp Voice Notes)
  const [playingProofAudioId, setPlayingProofAudioId] = useState<string | null>(null);
  const [selectedProofModalItem, setSelectedProofModalItem] = useState<ProofItem | null>(null);

  const proofAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const allProofItems: ProofItem[] =
    config.proofItems && config.proofItems.length > 0 ? config.proofItems : [];

  // Store header + urgency block
  const storeDisplayName = config.storeName || 'Ma Boutique';
  const storeInitials =
    storeDisplayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'JS';
  const showUrgency = config.urgencyEnabled !== false;
  const hasStockBadge = config.stockQuantity !== undefined && config.showStockBadge !== false;
  const stockBarPercent = Math.min(90, Math.max(8, (config.stockQuantity ?? 0) * 2));
  const reviewAverage =
    reviewsList.length > 0
      ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length
      : 0;

  // Checkout Form fields
  const [customerName, setCustomerName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<OrderLead | null>(null);

  // Abandoned-checkout capture: report what the customer typed, debounced,
  // until the order is placed.
  useEffect(() => {
    if (!onCheckoutDraft || !isCheckoutPageOpen || orderSuccess) return;
    if (!customerName.trim() && !whatsappNumber.trim()) return;
    const timer = setTimeout(
      () =>
        onCheckoutDraft({
          customerName,
          phone: whatsappNumber,
          address: [neighborhood, deliveryAddress].filter(Boolean).join(' — '),
          quantity,
        }),
      1500,
    );
    return () => clearTimeout(timer);
  }, [
    onCheckoutDraft,
    isCheckoutPageOpen,
    orderSuccess,
    customerName,
    whatsappNumber,
    neighborhood,
    deliveryAddress,
    quantity,
  ]);

  const deliveryFee =
    config.deliveryPricingType === 'fixed'
      ? config.fixedDeliveryFee || 0
      : config.deliveryFree
        ? 0
        : (config.deliveryFee ?? 0);

  // Paliers de réductions par volume (Pack Duo, Trio, etc.)
  const defaultTiers: QuantityDiscountTier[] = [
    { id: 't1', minQty: 1, discountType: 'percent', discountValue: 0, label: '1 Pièce (Standard)' },
    {
      id: 't2',
      minQty: 2,
      discountType: 'percent',
      discountValue: 10,
      label: 'Pack Duo — 2 Pièces (-10%)',
      isPopular: true,
    },
    {
      id: 't3',
      minQty: 3,
      discountType: 'percent',
      discountValue: 20,
      label: 'Pack Famille — 3 Pièces (-20%)',
    },
  ];

  const quantityTiers =
    config.quantityDiscounts && config.quantityDiscounts.length > 0
      ? config.quantityDiscounts
      : defaultTiers;

  const activeTier = [...quantityTiers]
    .sort((a, b) => b.minQty - a.minQty)
    .find((t) => quantity >= t.minQty);

  const baseSubtotal = config.price * quantity;
  let discountAmount = 0;
  if (config.quantityDiscountsEnabled !== false && activeTier && activeTier.discountValue > 0) {
    if (activeTier.discountType === 'percent') {
      discountAmount = Math.round((baseSubtotal * activeTier.discountValue) / 100);
    } else {
      discountAmount = Math.max(0, baseSubtotal - activeTier.discountValue * quantity);
    }
  }

  const subtotalAfterDiscount = baseSubtotal - discountAmount;
  const totalAmount = subtotalAfterDiscount + deliveryFee;

  const images = config.mediaItems.filter((m) => m.type === 'image');
  const totalSlides = images.length + (config.hasVideo && config.videoUrl ? 1 : 0);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // -------------------------------------------------------------
  // VOICE NOTE RECORDER LOGIC (MAX 2 MINUTES, PAUSE/RESUME/DELETE)
  // -------------------------------------------------------------
  const startVoiceRecording = async () => {
    try {
      setRecordingSeconds(0);
      setIsRecording(true);
      setIsRecordingPaused(false);
      setVoiceNoteUrl(null);
      setVoiceNoteBlob(null);

      // Attempt microphone capture
      if (navigator?.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          const chunks: Blob[] = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            setVoiceNoteBlob(blob);
            setVoiceNoteUrl(URL.createObjectURL(blob));
            // stop tracks
            stream.getTracks().forEach((track) => track.stop());
          };

          mediaRecorder.start();
        } catch (err) {
          console.warn('Microphone permission not granted, using simulated recording timer', err);
        }
      }

      // Interval timer (Max 120s = 2 minutes)
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 119) {
            stopVoiceRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e) {
      console.error(e);
    }
  };

  const pauseVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecordingPaused(true);
  };

  const resumeVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    setIsRecordingPaused(false);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => {
        if (prev >= 119) {
          stopVoiceRecording();
          return 120;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Fallback synthetic voice note URL for environments without hardware mic
      const sampleAudioUrl = 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3';
      setVoiceNoteUrl(sampleAudioUrl);
    }

    setIsRecording(false);
    setIsRecordingPaused(false);
  };

  const deleteVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingSeconds(0);
    setVoiceNoteBlob(null);
    setVoiceNoteUrl(null);
    setIsPlayingRecordedVoice(false);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Proof Audio playback
  const handleToggleProofAudio = (item: ProofItem) => {
    if (playingProofAudioId === item.id) {
      if (proofAudioPlayerRef.current) proofAudioPlayerRef.current.pause();
      setPlayingProofAudioId(null);
    } else {
      if (proofAudioPlayerRef.current) {
        proofAudioPlayerRef.current.src = item.url;
        proofAudioPlayerRef.current.play().catch(() => {});
      }
      setPlayingProofAudioId(item.id);
    }
  };

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleOpenCheckout = (mode: 'order' | 'whatsapp') => {
    setCheckoutMode(mode);
    setPaymentChoice(defaultChoice);
    setOrderSuccess(null);
    setSubmitError(null);
    setIsCheckoutPageOpen(true);
    onCheckoutOpened?.({ quantity, value: totalAmount });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !whatsappNumber) return;

    // Check if either address text or voice note was provided
    if (!deliveryAddress && !voiceNoteUrl) {
      setAddressInputMode('text');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const viaWhatsApp = checkoutMode === 'whatsapp';
      const isOnline = !viaWhatsApp && paymentChoice === 'online';
      const orderSeq = Math.floor(10 + Math.random() * 900);
      const generatedId = formatOrderId(config.storeCode || 'BDE', orderSeq);

      const finalAddressDesc = deliveryAddress
        ? deliveryAddress
        : `[Note vocale de ${recordingSeconds}s enregistrée] ${neighborhood}`;

      const newOrder: OrderLead = {
        id: generatedId,
        sequenceNumber: orderSeq,
        customerName,
        phone: `+221 ${whatsappNumber}`,
        whatsappNumber: `221${whatsappNumber.replace(/\s+/g, '')}`,
        neighborhood,
        deliveryAddress: finalAddressDesc,
        hasVoiceNote: !!voiceNoteUrl,
        voiceNoteUrl: voiceNoteUrl || undefined,
        city: 'Dakar',
        productName: quantity > 1 ? `${config.productTitle} (×${quantity})` : config.productTitle,
        amount: subtotalAfterDiscount,
        deliveryFee,
        totalAmount,
        quantity,
        currency: config.currency,
        status: 'new',
        createdAt: "À l'instant",
        paymentType: viaWhatsApp
          ? 'whatsapp'
          : chosenDirect
            ? 'direct'
            : isOnline
              ? 'online_momo'
              : 'cod',
        paymentStatus:
          chosenDirect && !viaWhatsApp ? 'pending_direct' : isOnline ? 'paid' : 'pending_cod',
        ...(chosenDirect && !viaWhatsApp
          ? { paymentMethodName: chosenDirect.name, directMethodId: chosenDirect.id }
          : {}),
        deliveryNotes: viaWhatsApp
          ? 'Commande passée sur WhatsApp'
          : chosenDirect
            ? `Paiement direct via ${chosenDirect.name}`
            : isOnline
              ? 'Payé en ligne par Mobile Money'
              : 'Paiement en espèces prévu à la livraison',
        selectedColor: selectedColor || (config.availableColors?.[0]?.name ?? undefined),
      };

      // Paiement en ligne Moneriz (Wave · OM · Carte). Le serveur fixe le
      // montant à partir de la commande enregistrée : seul son id est envoyé.
      const startOnlinePayment = (order: OrderLead, orderDbId: string) => {
        const failOnline = (message?: string) => {
          setIsSubmitting(false);
          const fallback =
            config.codEnabled === false
              ? 'Veuillez réessayer votre paiement en ligne.'
              : 'vous pouvez réessayer ou payer à la livraison.';
          setSubmitError(
            `${message || 'Le paiement en ligne n’a pas pu démarrer.'} Votre commande ${order.id} est enregistrée : ${fallback}`,
          );
        };
        fetch('/api/payments/moneriz/checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderDbId, integrationMode: 'iframe' }),
        })
          .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => null) }))
          .then(({ ok, data }) => {
            if (!ok || !data?.checkoutUrl) {
              failOnline(data?.message);
              return;
            }
            setIsSubmitting(false);
            setPendingOnlineOrder(order);
            setPendingOrderDbId(orderDbId);
            setMonerizSession(data);

            if (data.integrationMode === 'redirect' || !data.embedUrl) {
              window.location.href = data.checkoutUrl;
              return;
            }

            setIsMonerizModalOpen(true);
          })
          .catch(() => failOnline());
      };

      // Page publique : la commande est d'abord enregistrée et chiffrée par
      // le serveur, puis (si besoin) le paiement en ligne démarre.
      if (submitOrder) {
        setSubmitError(null);
        submitOrder(newOrder)
          .then((saved) => {
            const persisted: OrderLead = {
              ...newOrder,
              id: saved.reference,
              amount: saved.amount,
              deliveryFee: saved.deliveryFee,
              totalAmount: saved.totalAmount,
              paymentStatus:
                chosenDirect && !viaWhatsApp
                  ? 'pending_direct'
                  : isOnline
                    ? 'pending_online'
                    : 'pending_cod',
            };
            if (viaWhatsApp && waNumber) {
              setIsSubmitting(false);
              setOrderSuccess(persisted);
              const recap = [
                `Bonjour ${config.storeName || ''}, je viens de commander (réf. ${persisted.id}) :`,
                `• ${config.productTitle} ×${quantity}`,
                selectedColor ? `• Couleur : ${selectedColor}` : '',
                `• Total : ${formatMoney(persisted.totalAmount ?? totalAmount, 'XOF')}`,
                `• Nom : ${customerName}`,
                `• Adresse : ${[neighborhood, deliveryAddress].filter(Boolean).join(' — ')}`,
              ]
                .filter(Boolean)
                .join('\n');
              window.location.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(recap)}`;
            } else if (isOnline) {
              startOnlinePayment(persisted, saved.id);
            } else {
              setIsSubmitting(false);
              setOrderSuccess(persisted);
            }
          })
          .catch((err: unknown) => {
            setIsSubmitting(false);
            setSubmitError(
              err instanceof Error && err.message
                ? err.message
                : "La commande n'a pas pu être envoyée. Vérifiez votre connexion et réessayez.",
            );
          });
        return;
      }

      if (onOrderCreated) {
        onOrderCreated(newOrder);
      }

      setIsSubmitting(false);
      setOrderSuccess(newOrder);
    }, 600);
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;

    const newRev: CustomerReview = {
      id: `rev-${Date.now()}`,
      authorName: newReviewAuthor.trim(),
      city: newReviewCity.trim() || 'Dakar',
      rating: newReviewRating,
      comment: newReviewComment.trim(),
      date: "À l'instant",
      verified: true,
    };

    setReviewsList((prev) => [newRev, ...prev]);
    setReviewSubmitted(true);
    setTimeout(() => {
      setReviewSubmitted(false);
      setIsReviewModalOpen(false);
      setNewReviewAuthor('');
      setNewReviewCity('');
      setNewReviewComment('');
      setNewReviewRating(5);
    }, 1500);
  };

  const discountPercent = Math.round(
    ((config.originalPrice - config.price) / config.originalPrice) * 100,
  );

  // ========================================================
  // PAGE DÉSACTIVÉE PAR LE MARCHAND (LIEN COUPÉ)
  if (config.status === 'inactive') {
    return (
      <div
        className={`w-full bg-[#F6F7F9] text-[#201D1D] flex items-center justify-center p-6 text-center select-none ${
          isInsideMockup ? 'h-full' : 'min-h-screen'
        }`}
      >
        <div className="max-w-md w-full bg-white rounded-[28px] p-8 border border-[#E3E7EE] shadow-xl space-y-5 animate-in fade-in">
          <div className="w-16 h-16 rounded-[28px] bg-[#FFF1F2] text-rose-500 mx-auto flex items-center justify-center shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
              Page Hors Ligne
            </span>
            <h2 className="text-xl font-black text-[#201D1D] tracking-tight">
              Cette offre est actuellement désactivée
            </h2>
            <p className="text-xs text-[#7A808C] leading-relaxed">
              La boutique <span className="font-bold text-[#201D1D]">{config.storeName}</span> a
              temporairement suspendu cette offre. Revenez un peu plus tard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // PAGE EN ENTIÈRE : FINALISATION DE COMMANDE (PLEINE PAGE)
  // (DEMANDE FORMELLE DE L'UTILISATEUR : PAS DE SIMPLE POPUP)
  // ========================================================
  if (isCheckoutPageOpen) {
    return (
      <div
        className={`relative w-full bg-[#F6F7F9] text-[#201D1D] flex flex-col ${displayFont.className} select-none ${
          isInsideMockup ? 'h-full overflow-y-auto' : 'min-h-screen'
        }`}
      >
        {/* Top Header Navigation */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E3E7EE] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
          <button
            type="button"
            onClick={() => {
              setIsCheckoutPageOpen(false);
              setOrderSuccess(null);
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#235BF7] hover:text-[#1A4AD6] transition-colors cursor-pointer bg-[#EEF3FF] hover:bg-[#DBEAFE] px-3 py-1.5 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retourner à la vitrine</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-[#201D1D] uppercase tracking-wide">
              Finalisation de Commande
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#7A808C]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">Livraison & Paiement Sécurisés à Dakar</span>
          </div>
        </header>

        {orderSuccess ? (
          /* Confirmation Screen Full Page */
          <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8 flex flex-col items-center justify-center animate-in fade-in duration-200">
            <div className="w-full bg-white rounded-[28px] p-6 sm:p-8 border border-[#E3E7EE] shadow-xl text-center space-y-5">
              <div className="w-20 h-20 bg-[#ECFDF5] text-[#10B981] rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3.5 py-1 rounded-full">
                  Commande Confirmée avec Succès
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#201D1D] mt-2">
                  Merci {orderSuccess.customerName} !
                </h2>
                <p className="text-xs sm:text-sm text-[#7A808C] max-w-md mx-auto">
                  Votre commande{' '}
                  <span className="font-bold text-[#201D1D]">#{orderSuccess.id}</span> pour{' '}
                  {orderSuccess.productName} a bien été enregistrée et transmise à notre équipe
                  logistique à Dakar.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#F6F7F9] border border-[#E3E7EE] text-left text-xs space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-[#E3E7EE]">
                  <span className="text-[#7A808C]">Numéro de commande :</span>
                  <span className="font-mono font-bold text-[#235BF7] bg-[#EEF3FF] px-2 py-0.5 rounded">
                    #{orderSuccess.id}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-[#7A808C] shrink-0">Adresse de livraison :</span>
                  <span className="font-bold text-[#201D1D] text-right ml-4">
                    {orderSuccess.deliveryAddress || orderSuccess.neighborhood}
                  </span>
                </div>

                {orderSuccess.selectedColor && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#7A808C]">Couleur choisie :</span>
                    <span className="font-bold text-[#201D1D] bg-white border border-[#E3E7EE] px-2 py-0.5 rounded-md">
                      {orderSuccess.selectedColor}
                    </span>
                  </div>
                )}

                {orderSuccess.hasVoiceNote && (
                  <div className="flex justify-between items-center bg-[#EEF3FF] border border-[#BFDBFE] p-2.5 rounded-xl text-[#235BF7] font-bold">
                    <span className="flex items-center gap-1.5">
                      <Mic className="w-4 h-4" /> Note vocale d'adresse
                    </span>
                    <span className="text-[11px] bg-white px-2 py-0.5 rounded-full font-semibold">
                      Transmise au coursier
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-[#E3E7EE]">
                  <span className="text-sm font-bold text-[#201D1D]">Montant total à régler :</span>
                  <span className="text-base font-black text-[#235BF7]">
                    {formatFCFA(orderSuccess.totalAmount || orderSuccess.amount)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#7A808C]">Mode de règlement :</span>
                  <span className="font-bold text-emerald-700">
                    {orderSuccess.paymentType === 'whatsapp'
                      ? 'Commande envoyée sur WhatsApp'
                      : orderSuccess.paymentType === 'cod'
                        ? 'Paiement en espèces à la livraison (COD)'
                        : orderSuccess.paymentType === 'direct'
                          ? `Paiement direct via ${orderSuccess.paymentMethodName ?? 'le vendeur'}`
                          : orderSuccess.paymentStatus === 'pending_online'
                            ? 'Paiement en ligne — confirmation en cours'
                            : 'Payé en ligne par Mobile Money'}
                  </span>
                </div>
              </div>

              {orderSuccess.paymentType === 'direct' &&
                (() => {
                  const method = directMethods.find(
                    (m) => m.name === orderSuccess.paymentMethodName,
                  );
                  if (!method) return null;
                  return (
                    <div className="p-4 rounded-2xl bg-[#F6F7F9] border border-[#E3E7EE] text-left space-y-3">
                      <p className="text-sm font-bold text-[#201D1D]">
                        Réglez maintenant{' '}
                        {formatFCFA(orderSuccess.totalAmount || orderSuccess.amount)} via{' '}
                        {method.name}
                      </p>
                      {method.qrUrl && (
                        <img
                          src={method.qrUrl}
                          alt={`QR code ${method.name}`}
                          className="w-44 h-44 mx-auto rounded-xl bg-white border border-[#E3E7EE] object-contain p-2"
                        />
                      )}
                      {method.url && (
                        <a
                          href={method.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 rounded-2xl bg-[#201D1D] hover:bg-black text-white font-bold text-sm flex items-center justify-center gap-2"
                        >
                          Ouvrir le lien de paiement {method.name}
                        </a>
                      )}
                      <p className="text-xs text-[#7A808C]">
                        Indiquez la référence {orderSuccess.id} dans votre paiement. Le vendeur
                        confirme la réception puis prépare votre livraison.
                      </p>
                    </div>
                  );
                })()}

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutPageOpen(false);
                    setOrderSuccess(null);
                  }}
                  className="w-full py-3 text-xs font-semibold text-[#7A808C] hover:text-[#201D1D] hover:bg-[#F1F3F6] rounded-xl transition-colors cursor-pointer"
                >
                  ← Retourner à la boutique
                </button>
              </div>
            </div>
          </main>
        ) : (
          /* Dedicated Checkout Page */
          <main
            className={`flex-1 ${isInsideMockup ? 'w-full p-3 sm:p-4' : 'max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8'} animate-in fade-in duration-200`}
          >
            <div
              className={
                isInsideMockup
                  ? 'flex flex-col space-y-4'
                  : 'grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start'
              }
            >
              {/* LEFT COLUMN: PRODUCT RECAP, QUANTITY DISCOUNTS & SUMMARY */}
              <div className={isInsideMockup ? 'w-full space-y-4' : 'lg:col-span-7 space-y-5'}>
                {/* Product Card */}
                <div className="p-4 sm:p-5 rounded-[28px] bg-white border border-[#E3E7EE] shadow-xs flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
                  <img
                    src={images[currentMediaIndex]?.url || images[0]?.url || undefined}
                    alt={config.productTitle}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover bg-black shrink-0 border border-[#E3E7EE]"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-[#235BF7] bg-[#EEF3FF] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {config.storeName || 'Boutique Officielle'}
                      </span>
                      {config.stockQuantity !== undefined && config.showStockBadge !== false ? (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />⚡
                          Plus que {config.stockQuantity} pièces restantes
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          En stock à Dakar
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-[#201D1D] leading-tight">
                      {config.productTitle}
                    </h3>
                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="text-lg font-black text-[#235BF7]">
                        {formatFCFA(config.price)}
                      </span>
                      {config.originalPrice > config.price && (
                        <span className="text-xs text-[#9AA0AB] line-through font-semibold">
                          {formatFCFA(config.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sélecteur de Couleur (si disponible) */}
                {config.availableColors && config.availableColors.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-[28px] bg-white border border-[#E3E7EE] shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-[#235BF7]" />
                        <h4 className="text-sm font-black text-[#201D1D]">Couleur / Modèle</h4>
                      </div>
                      <span className="text-xs font-black text-[#235BF7]">
                        {selectedColor || config.availableColors[0]?.name}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {config.availableColors.map((color) => {
                        const isSelected =
                          (selectedColor || config.availableColors?.[0]?.name) === color.name;
                        return (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => setSelectedColor(color.name)}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-[#201D1D] text-white border-[#201D1D] shadow-xs'
                                : 'bg-[#F6F7F9] text-[#201D1D] border-[#E3E7EE] hover:border-[#D5DAE2]'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                              style={{ backgroundColor: color.hex }}
                            />
                            <span>{color.name}</span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sélecteur de Quantité & Paliers Dégressifs */}
                <div className="p-5 rounded-[28px] bg-white border border-[#E3E7EE] shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-[#201D1D]">Quantité commandée</h4>
                      <p className="text-xs text-[#7A808C]">
                        Choisissez votre pack ou ajustez manuellement
                      </p>
                    </div>

                    {/* Stepper - / + */}
                    <div className="flex items-center gap-2 bg-[#F1F3F6] p-1 rounded-2xl border border-[#E3E7EE]">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-xl bg-white text-[#201D1D] hover:bg-[#E3E7EE] disabled:opacity-40 flex items-center justify-center font-bold text-sm shadow-xs transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-black text-[#201D1D]">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-8 h-8 rounded-xl bg-white text-[#201D1D] hover:bg-[#E3E7EE] flex items-center justify-center font-bold text-sm shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Cartes de Paliers Dégressifs (Packs) */}
                  {config.quantityDiscountsEnabled &&
                    config.quantityDiscounts &&
                    config.quantityDiscounts.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        {/* Pack 1 pièce */}
                        <button
                          type="button"
                          onClick={() => setQuantity(1)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            quantity === 1
                              ? 'border-[#235BF7] bg-[#EEF3FF] ring-2 ring-[#235BF7]/20 shadow-xs'
                              : 'border-[#E3E7EE] bg-[#F6F7F9] hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#201D1D]">1 Article</span>
                            {quantity === 1 && (
                              <Check className="w-3.5 h-3.5 text-[#235BF7] stroke-[3]" />
                            )}
                          </div>
                          <span className="text-[11px] text-[#7A808C] block mt-0.5">
                            Prix standard
                          </span>
                          <span className="text-xs font-black text-[#201D1D] block mt-1">
                            {formatFCFA(config.price)}
                          </span>
                        </button>

                        {/* Tiers configurés par le commerçant */}
                        {config.quantityDiscounts.map((tier) => {
                          const isSelected = quantity === tier.minQty;
                          const tierSubtotal = config.price * tier.minQty;
                          const tierDisc =
                            tier.discountType === 'percent'
                              ? Math.round(tierSubtotal * (tier.discountValue / 100))
                              : tier.discountValue;
                          const tierTotal = tierSubtotal - tierDisc;

                          return (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() => setQuantity(tier.minQty)}
                              className={`p-3 rounded-2xl border text-left transition-all relative cursor-pointer ${
                                isSelected
                                  ? 'border-[#235BF7] bg-[#EEF3FF] ring-2 ring-[#235BF7]/20 shadow-xs'
                                  : 'border-[#E3E7EE] bg-[#F6F7F9] hover:bg-white'
                              }`}
                            >
                              <span className="absolute -top-2 right-2 text-[9px] font-black uppercase tracking-wider text-white bg-emerald-600 px-1.5 py-0.5 rounded-full shadow-xs">
                                {tier.discountType === 'percent'
                                  ? `-${tier.discountValue}%`
                                  : `-${formatFCFA(tier.discountValue)}`}
                              </span>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#201D1D] truncate">
                                  {tier.label}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-[#235BF7] stroke-[3]" />
                                )}
                              </div>
                              <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                                Économie {formatFCFA(tierDisc)}
                              </span>
                              <span className="text-xs font-black text-[#201D1D] block mt-1">
                                {formatFCFA(tierTotal)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                </div>

                {/* Récapitulatif des Prix */}
                <div className="p-5 rounded-[28px] bg-white border border-[#E3E7EE] shadow-xs space-y-2.5 text-xs">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#7A808C]">
                    Détail du règlement
                  </h4>

                  <div className="flex items-center justify-between text-[#3F4654]">
                    <span>
                      Sous-total ({quantity} {quantity > 1 ? 'articles' : 'article'}) :
                    </span>
                    <span className="font-semibold text-[#201D1D]">{formatFCFA(baseSubtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-emerald-600 font-bold">
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        Réduction appliquée ({activeTier?.label || 'Pack'}) :
                      </span>
                      <span>-{formatFCFA(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[#3F4654]">
                    <span>Frais de livraison à Dakar :</span>
                    <span className="font-semibold text-[#201D1D]">
                      {deliveryFee === 0 ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          Gratuit
                        </span>
                      ) : (
                        `+${formatFCFA(deliveryFee)}`
                      )}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#F1F3F6] flex items-center justify-between">
                    <span className="text-sm font-black text-[#201D1D]">Total net à régler :</span>
                    <span className="text-xl font-black text-[#235BF7]">
                      {formatFCFA(totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Garanties et réassurance */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-[28px] bg-[#F1F3F6]/60 border border-[#E3E7EE] text-center text-[11px] text-[#3F4654]">
                  <div className="space-y-1">
                    <ShieldCheck className="w-4 h-4 text-[#235BF7] mx-auto" />
                    <span className="font-bold block text-[#201D1D]">Inspection libre</span>
                    <span className="text-[10px] text-[#7A808C]">Vérifiez avant de payer</span>
                  </div>
                  <div className="space-y-1 border-x border-[#D5DAE2]/60 px-1">
                    <Truck className="w-4 h-4 text-[#235BF7] mx-auto" />
                    <span className="font-bold block text-[#201D1D]">Livraison rapide</span>
                    <span className="text-[10px] text-[#7A808C]">Sous 2 à 4h à Dakar</span>
                  </div>
                  <div className="space-y-1">
                    <RotateCcw className="w-4 h-4 text-[#235BF7] mx-auto" />
                    <span className="font-bold block text-[#201D1D]">Échange 48h</span>
                    <span className="text-[10px] text-[#7A808C]">Garantie satisfaction</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: DELIVERY & PAYMENT FORM */}
              <div
                className={`${isInsideMockup ? 'w-full' : 'lg:col-span-5'} bg-white rounded-[28px] p-5 sm:p-6 border border-[#E3E7EE] shadow-sm space-y-5`}
              >
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#201D1D]">
                    Adresse de livraison & Paiement
                  </h3>
                  <p className="text-xs text-[#7A808C]">
                    Renseignez vos coordonnées pour la remise en main propre
                  </p>
                </div>

                <form onSubmit={handleSubmitOrder} className="space-y-4">
                  {/* Mode de règlement (« Commander maintenant » only) */}
                  {checkoutMode === 'order' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#201D1D] block">
                        Comment souhaitez-vous payer ?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {codOn && (
                          <button
                            type="button"
                            onClick={() => setPaymentChoice('cod')}
                            className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                              paymentChoice === 'cod'
                                ? 'border-[#201D1D] bg-[#201D1D] text-white'
                                : 'border-[#E3E7EE] bg-[#F6F7F9] text-[#3F4654] hover:bg-white'
                            }`}
                          >
                            <Banknote className="w-4 h-4 mx-auto mb-1" />
                            <span className="text-[13px] font-bold block leading-tight">
                              Paiement à la livraison
                            </span>
                            <span className="text-[11px] opacity-75 block">Espèces</span>
                          </button>
                        )}
                        {onlineOn && (
                          <button
                            type="button"
                            onClick={() => setPaymentChoice('online')}
                            className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                              paymentChoice === 'online'
                                ? 'border-[#235BF7] bg-[#235BF7] text-white'
                                : 'border-[#E3E7EE] bg-[#F6F7F9] text-[#3F4654] hover:bg-white'
                            }`}
                          >
                            <Smartphone className="w-4 h-4 mx-auto mb-1" />
                            <span className="text-[13px] font-bold block leading-tight">
                              Payer par Mobile Money
                            </span>
                            <span className="text-[11px] opacity-75 block">
                              Wave, Orange Money, carte
                            </span>
                          </button>
                        )}
                      </div>
                      {directMethods.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          {directMethods.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setPaymentChoice(`direct:${m.id}`)}
                              className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                                paymentChoice === `direct:${m.id}`
                                  ? 'border-[#201D1D] bg-[#201D1D] text-white'
                                  : 'border-[#E3E7EE] bg-[#F6F7F9] text-[#3F4654] hover:bg-white'
                              }`}
                            >
                              <Smartphone className="w-4 h-4 mx-auto mb-1" />
                              <span className="text-[11px] font-bold block leading-tight truncate">
                                {m.name}
                              </span>
                              <span className="text-[9px] opacity-75 block">Paiement direct</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nom complet */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#201D1D] flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#235BF7]" />
                      Nom et prénom *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex : Fatou Diop"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5DAE2] bg-[#F6F7F9] text-xs font-semibold text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Téléphone WhatsApp */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#201D1D] flex items-center gap-1">
                      <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                      Numéro WhatsApp joignable *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#D5DAE2] bg-[#F1F3F6] text-xs font-bold text-[#3F4654]">
                        +221
                      </span>
                      <input
                        type="tel"
                        required
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="77 000 00 00"
                        className="flex-1 px-3.5 py-2.5 rounded-r-xl border border-[#D5DAE2] bg-[#F6F7F9] text-xs font-semibold text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white transition-all"
                      />
                    </div>
                    <span className="text-[10px] text-[#7A808C]">
                      Le coursier vous contactera sur ce numéro.
                    </span>
                  </div>

                  {/* Adresse saisie par le client */}
                  <div className="space-y-1">
                    <label
                      htmlFor="checkout-address"
                      className="text-xs font-bold text-[#201D1D] flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#235BF7]" />
                      Votre adresse (quartier, ville) *
                    </label>
                    <input
                      id="checkout-address"
                      type="text"
                      required
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Ex : Sacré-Cœur 3, Dakar"
                      autoComplete="street-address"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5DAE2] bg-[#F6F7F9] text-xs font-semibold text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Choix Mode Adresse : Texte vs Note Vocale */}
                  <div className="space-y-2 pt-1 border-t border-[#F1F3F6]">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#201D1D]">
                        Indications d'adresse
                      </label>
                      <div className="flex items-center gap-1 bg-[#F1F3F6] p-0.5 rounded-xl border border-[#E3E7EE]">
                        <button
                          type="button"
                          onClick={() => setAddressInputMode('text')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            addressInputMode === 'text'
                              ? 'bg-white text-[#235BF7] shadow-xs'
                              : 'text-[#7A808C]'
                          }`}
                        >
                          Écrire
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddressInputMode('voice')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            addressInputMode === 'voice'
                              ? 'bg-[#235BF7] text-white shadow-xs'
                              : 'text-[#7A808C]'
                          }`}
                        >
                          <Mic className="w-3 h-3" />
                          <span>Vocal (Recommandé)</span>
                        </button>
                      </div>
                    </div>

                    {addressInputMode === 'text' ? (
                      <textarea
                        rows={2}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Ex : En face de la pharmacie, Immeuble bleu, 2ème étage..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5DAE2] bg-[#F6F7F9] text-xs font-medium text-[#201D1D] focus:outline-none focus:border-[#235BF7] focus:bg-white transition-all"
                      />
                    ) : (
                      /* Enregistreur Vocal Interactif Max 2 min */
                      <div className="p-3.5 rounded-2xl bg-[#EEF3FF] border border-[#BFDBFE] space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#235BF7] flex items-center gap-1.5">
                            <Mic className="w-4 h-4" />
                            Note vocale pour le livreur (max 2 min)
                          </span>
                          <span className="font-mono font-bold text-[#235BF7]">
                            {formatTimer(recordingSeconds)} / 02:00
                          </span>
                        </div>

                        {!isRecording && !voiceNoteUrl && (
                          <button
                            type="button"
                            onClick={startVoiceRecording}
                            className="w-full py-2.5 px-3 rounded-xl bg-[#235BF7] hover:bg-[#1A4AD6] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                          >
                            <Mic className="w-4 h-4" />
                            <span>Démarrer l'enregistrement vocal</span>
                          </button>
                        )}

                        {isRecording && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-[#BFDBFE]">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                                <span className="text-xs font-bold text-rose-600">
                                  {isRecordingPaused
                                    ? 'Enregistrement en pause'
                                    : 'Enregistrement en cours...'}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-xs text-[#201D1D]">
                                {formatTimer(recordingSeconds)}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {isRecordingPaused ? (
                                <button
                                  type="button"
                                  onClick={resumeVoiceRecording}
                                  className="py-2 px-3 rounded-xl bg-[#235BF7] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Reprendre</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={pauseVoiceRecording}
                                  className="py-2 px-3 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                  <span>Pause</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={stopVoiceRecording}
                                className="py-2 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Terminer</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {voiceNoteUrl && !isRecording && (
                          <div className="space-y-2 bg-white p-2.5 rounded-xl border border-[#BFDBFE]">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                Vocal enregistré ({formatTimer(recordingSeconds)})
                              </span>
                              <button
                                type="button"
                                onClick={deleteVoiceRecording}
                                className="text-xs text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Supprimer</span>
                              </button>
                            </div>
                            <audio src={voiceNoteUrl} controls className="w-full h-8 rounded" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bouton de Soumission */}
                  <div className="pt-2 space-y-2">
                    {submitError && (
                      <p
                        role="alert"
                        className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
                      >
                        {submitError}
                      </p>
                    )}
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={isSubmitting}
                      iconRight={<ArrowRight className="w-4 h-4" />}
                      className="!py-4 text-sm font-black shadow-md cursor-pointer"
                    >
                      {checkoutMode === 'whatsapp'
                        ? `Commander sur WhatsApp (${formatFCFA(totalAmount)})`
                        : paymentChoice === 'online'
                          ? `Payer par Mobile Money (${formatFCFA(totalAmount)})`
                          : `Valider la commande (${formatFCFA(totalAmount)})`}
                    </Button>
                    {getDisplayCurrency() !== 'XOF' && (
                      <p className="text-center text-xs text-[#7A808C]">
                        Montant débité :{' '}
                        <strong className="text-[#201D1D]">
                          {formatMoney(totalAmount, 'XOF')}
                        </strong>
                      </p>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </main>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full bg-[#F6F7F9] text-[#201D1D] flex flex-col ${displayFont.className} select-none ${
        isInsideMockup ? 'h-full overflow-y-auto' : 'min-h-screen'
      }`}
    >
      {/* Hidden audio player for proof recordings */}
      <audio
        ref={proofAudioPlayerRef}
        onEnded={() => setPlayingProofAudioId(null)}
        className="hidden"
      />

      {/* ======================================================== */}
      {/* STORE HEADER: merchant logo + store name, centered       */}
      {/* ======================================================== */}
      <header
        className={`${isInsideMockup ? '' : 'sticky top-0'} z-30 bg-white/95 backdrop-blur-md border-b border-[#ECEFF4]`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <span aria-hidden="true" />
          <div className="flex items-center justify-center gap-2.5 min-w-0">
            {config.storeLogoUrl ? (
              <img
                src={config.storeLogoUrl}
                alt={`Logo ${storeDisplayName}`}
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-cover border border-[#ECEFF4] bg-white shrink-0"
              />
            ) : (
              <span className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-[#235BF7] text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                {storeInitials}
              </span>
            )}
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#201D1D] truncate max-w-[48vw] sm:max-w-xs">
              {storeDisplayName}
            </span>
          </div>
          <span aria-hidden="true" />
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN CONTAINER (Mobile Vertical / Desktop 2-Column Grid) */}
      {/* ======================================================== */}
      <div
        className={`w-full ${
          isInsideMockup ? 'p-0 max-w-full' : 'max-w-6xl mx-auto px-0 sm:px-6 lg:px-8 lg:py-8'
        }`}
      >
        <div
          className={
            isInsideMockup
              ? 'flex flex-col space-y-3'
              : 'grid grid-cols-1 lg:grid-cols-12 lg:gap-10 items-start'
          }
        >
          {/* ======================================================== */}
          {/* LEFT COLUMN: PRODUCT MEDIA GALLERY                       */}
          {/* ======================================================== */}
          <div
            className={
              isInsideMockup ? 'w-full space-y-2' : 'lg:col-span-6 lg:sticky lg:top-20 space-y-3'
            }
          >
            {/* PRODUCT HERO IMAGE / VIDEO (SANS LES BADGES COMME DEMANDÉ AUDIO 2) */}
            <div
              className={`relative w-full ${isInsideMockup ? 'h-[360px] rounded-none sm:rounded-b-2xl' : 'h-[62vh] min-h-[400px] max-h-[580px] lg:h-[520px] lg:max-h-none lg:rounded-[28px]'} bg-black overflow-hidden flex-shrink-0 shadow-sm`}
            >
              {config.hasVideo && config.videoUrl && currentMediaIndex === 0 ? (
                <div className="relative w-full h-full">
                  <video
                    src={config.videoUrl}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={
                      images[config.hasVideo ? currentMediaIndex - 1 : currentMediaIndex]?.url ||
                      images[0]?.url ||
                      undefined
                    }
                    alt={config.productTitle}
                    className="w-full h-full object-cover transition-opacity duration-300"
                  />
                </div>
              )}

              {/* Carousel navigation arrows */}
              {totalSlides > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCurrentMediaIndex((prev) => (prev === 0 ? totalSlides - 1 : prev - 1))
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentMediaIndex((prev) => (prev === totalSlides - 1 ? 0 : prev + 1))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Dots indicator */}
                  <div className="absolute bottom-5 left-0 right-0 z-20 flex justify-center gap-1.5">
                    {[...Array(totalSlides)].map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentMediaIndex(idx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          currentMediaIndex === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Mobile gradient bottom fade */}
              <div className="lg:hidden absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F6F7F9] via-[#F6F7F9]/30 to-transparent pointer-events-none" />
            </div>

            {/* Desktop Thumbnails Grid */}
            {!isInsideMockup && (
              <div className="hidden lg:grid grid-cols-5 gap-2.5 pt-1">
                {config.hasVideo && config.videoUrl && (
                  <button
                    onClick={() => setCurrentMediaIndex(0)}
                    className={`h-20 rounded-2xl overflow-hidden border-2 relative cursor-pointer transition-all ${
                      currentMediaIndex === 0
                        ? 'border-[#235BF7] ring-2 ring-[#235BF7]/20 scale-102'
                        : 'border-[#E3E7EE] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <video src={config.videoUrl} className="w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[10px] font-bold">
                      Vidéo
                    </span>
                  </button>
                )}

                {images.map((img, i) => {
                  const slideIdx = config.hasVideo ? i + 1 : i;
                  return (
                    <button
                      key={img.id}
                      onClick={() => setCurrentMediaIndex(slideIdx)}
                      className={`h-20 rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                        currentMediaIndex === slideIdx
                          ? 'border-[#235BF7] ring-2 ring-[#235BF7]/20 scale-102'
                          : 'border-[#E3E7EE] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img.url || undefined}
                        alt={`Aperçu ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: CONTENT STRICTEMENT SELON VOS CONSIGNES    */}
          {/* ======================================================== */}
          <div
            className={`${isInsideMockup ? 'w-full px-4 pt-1 space-y-4' : 'lg:col-span-6 px-5 lg:px-0 pt-3 lg:pt-0 space-y-5 -mt-4 lg:mt-0'} relative z-10`}
          >
            {/* 1. Guarantee badge */}
            <div className="flex items-center">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                <span>{config.guaranteeBadge || 'Stock Garanti à Dakar'}</span>
              </span>
            </div>

            {/* 2. Product Title & Pricing (Single Line Pricing) */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-[#201D1D] leading-tight tracking-tight">
                {config.productTitle}
              </h1>

              <div className="flex flex-wrap items-baseline gap-2.5 sm:gap-3.5 pt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#235BF7] tracking-tight whitespace-nowrap">
                  {formatFCFA(config.price)}
                </span>
                <span className="text-sm font-semibold text-[#9AA0AB] line-through whitespace-nowrap">
                  {formatFCFA(config.originalPrice)}
                </span>
                <span className="text-xs font-extrabold text-[#235BF7] bg-[#EEF3FF] px-2.5 py-0.5 rounded-lg border border-[#BFDBFE] whitespace-nowrap">
                  {config.discountPercent || `-${discountPercent}% RÉDUCTION`}
                </span>
              </div>
            </div>

            {/* 3. Urgency: live interest + limited stock (no blinking) */}
            {(showUrgency || hasStockBadge) && (
              <div className="rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] p-4 space-y-3">
                {showUrgency && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#FED7AA] text-[#EA580C] flex items-center justify-center shrink-0">
                      <Eye className="w-[18px] h-[18px]" />
                    </div>
                    <p className="text-sm font-bold text-[#9A3412] leading-snug">
                      {config.urgencyText?.trim() || DEFAULT_URGENCY_TEXT}
                    </p>
                  </div>
                )}
                {hasStockBadge && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[13px] text-[#9A3412]">
                      <span>
                        Plus que <strong>{config.stockQuantity}</strong> pièce
                        {(config.stockQuantity ?? 0) > 1 ? 's' : ''} en stock
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wide">
                        Forte demande
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white border border-[#FED7AA] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#EA580C]"
                        style={{ width: `${stockBarPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sélecteur de Variante / Couleur (si configuré) */}
            {config.availableColors && config.availableColors.length > 0 && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E3E7EE] shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#7A808C] flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#235BF7]" />
                    Couleur :{' '}
                    <strong className="text-[#201D1D]">
                      {selectedColor || config.availableColors[0]?.name}
                    </strong>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.availableColors.map((color) => {
                    const isSelected =
                      (selectedColor || config.availableColors?.[0]?.name) === color.name;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSelectedColor(color.name)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#201D1D] text-white border-[#201D1D] shadow-xs'
                            : 'bg-white text-[#201D1D] border-[#E3E7EE] hover:border-[#D5DAE2]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span>{color.name}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* 4. LES 2 BOUTONS : ÉPURÉS SANS TEXTE DU BAS (AUDIO 5)     */}
            {/* ======================================================== */}
            <div className="p-3 rounded-2xl bg-[#F1F3F6]/80 border border-[#E3E7EE] space-y-2.5">
              <div
                className={`grid gap-2.5 ${waNumber ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}
              >
                {/* Bouton 1 : Commander maintenant (livraison ou paiement en ligne) */}
                <button
                  type="button"
                  onClick={() => handleOpenCheckout('order')}
                  className="w-full py-4 px-4 rounded-2xl bg-[#235BF7] hover:bg-[#1A4AD6] active:scale-[0.98] text-white font-black text-[15px] tracking-tight flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-white" />
                  <span>Commander maintenant</span>
                </button>
                {/* Bouton 2 : Commander sur WhatsApp */}
                {waNumber && (
                  <button
                    type="button"
                    onClick={() => handleOpenCheckout('whatsapp')}
                    className="w-full py-4 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20BA5A] active:scale-[0.98] text-white font-black text-[15px] tracking-tight flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>Commander sur WhatsApp</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between px-2 text-[11px] text-[#7A808C]">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  Commande 100% sécurisée
                </span>
                <span>
                  Livraison :{' '}
                  <strong className={deliveryFee === 0 ? 'text-emerald-700' : 'text-[#201D1D]'}>
                    {deliveryFee === 0 ? 'Offerte (Gratuit)' : `+${formatFCFA(deliveryFee)}`}
                  </strong>
                </span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* 5. EXPÉDITION LOCALE (APRÈS LES BOUTONS)                  */}
            {/* ======================================================== */}
            <div className="rounded-2xl bg-white border border-[#ECEFF4] divide-y divide-[#F1F3F6]">
              <div className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
                  <Truck className="w-[18px] h-[18px]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-[#201D1D]">
                    {config.deliveryNotice || 'Expédition locale sous 2h à 4h à Dakar'}
                  </p>
                  <p className="text-[13px] text-[#7A808C] leading-relaxed">
                    Notre service logistique vous contacte immédiatement sur WhatsApp pour
                    coordonner l'heure exacte et l'adresse de livraison.
                  </p>
                </div>
              </div>
              <div className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-[18px] h-[18px]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-[#201D1D]">
                    Zéro risque : satisfait ou remboursé
                  </p>
                  <p className="text-[13px] text-[#7A808C] leading-relaxed">
                    Essayez votre article devant le livreur avant de régler en espèces ou Wave.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTIONS PLEINE LARGEUR (après « Zéro risque ») : avantages,  */}
      {/* description, comparatif, preuves, avis, FAQ — comme un site.  */}
      {/* ======================================================== */}
      <div className="@container/page w-full">
        <div
          className={
            isInsideMockup
              ? 'w-full px-4 pt-6 pb-24 space-y-10'
              : 'w-full max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 pt-8 lg:pt-16 pb-28 lg:pb-20 space-y-12 lg:space-y-20'
          }
        >
          {/* ======================================================== */}
          {/* 6. AVANTAGES & CARACTÉRISTIQUES                           */}
          {/* ======================================================== */}
          {config.benefits.length > 0 && (
            <PageSection
              id="adv-title"
              title="Avantages & caractéristiques"
              intro="Ce qui fait la différence au quotidien."
            >
              <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-2.5 @3xl:gap-3">
                {config.benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 @3xl/page:p-5 rounded-2xl bg-white border border-[#ECEFF4] hover:border-[#D5DAE2] transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#235BF7] text-white flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <p className="pt-0.5 text-[16px] @3xl/page:text-[17px] font-medium text-[#201D1D] leading-relaxed">
                      {benefit}
                    </p>
                  </div>
                ))}
              </div>
            </PageSection>
          )}

          {/* 6b. Description longue + tableau « Nous vs Les autres » (masqués si vides) */}
          <ProductDescription text={config.description} />
          <ComparisonTable comparison={config.comparison} />

          {/* ======================================================== */}
          {/* 7. PREUVES CLIENTS REÇUES : PHOTOS, VIDÉOS & VOCAUX      */}
          {/* (NOUVELLE ICÔNE + 3 TYPES DE PREUVES REÇUES - AUDIO 3)   */}
          {/* ======================================================== */}
          {allProofItems.length > 0 && (
            <PageSection
              id="proofs-title"
              title="Preuves clients"
              intro="Photos, vidéos et vocaux envoyés par nos clients."
              aside={
                allProofItems.length > 1 ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => scrollSlider('left')}
                      aria-label="Précédent"
                      className="w-9 h-9 rounded-full bg-white border border-[#E3E7EE] flex items-center justify-center text-[#7A808C] hover:text-[#201D1D] hover:bg-[#F1F3F6] cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollSlider('right')}
                      aria-label="Suivant"
                      className="w-9 h-9 rounded-full bg-white border border-[#E3E7EE] flex items-center justify-center text-[#7A808C] hover:text-[#201D1D] hover:bg-[#F1F3F6] cursor-pointer transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : undefined
              }
            >
              {/* Slider Carrousel de droite à gauche */}
              <div
                ref={sliderRef}
                className="flex gap-3 overflow-x-auto pb-2 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {allProofItems.map((item) => (
                  <div key={item.id} className="snap-start flex-shrink-0">
                    {/* TYPE 1: NOTE VOCALE WHATSAPP */}
                    {item.type === 'audio' && (
                      <div className="w-64 h-64 rounded-2xl bg-gradient-to-br from-[#201D1D] to-[#2A2626] p-4 text-white flex flex-col justify-between border border-neutral-800 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center font-bold text-xs">
                              <WhatsAppIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold block leading-tight">
                                {item.authorName}
                              </span>
                              <span className="text-[10px] text-[#25D366] font-medium flex items-center gap-1">
                                <CheckCheck className="w-3 h-3" /> {item.city}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-white/80">
                            Vocal
                          </span>
                        </div>

                        {/* Player waveform */}
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleProofAudio(item)}
                              className="w-10 h-10 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-95 flex-shrink-0"
                            >
                              {playingProofAudioId === item.id ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              )}
                            </button>

                            <div className="flex-1 space-y-1">
                              {/* Audio wave bars animation */}
                              <div className="flex items-center gap-0.5 h-6">
                                {[
                                  14, 22, 10, 24, 18, 26, 12, 20, 24, 16, 22, 12, 18, 24, 14, 20,
                                  16, 22, 10,
                                ].map((h, idx) => (
                                  <span
                                    key={idx}
                                    style={{ height: `${h}px` }}
                                    className={`w-1 rounded-full transition-all duration-200 ${
                                      playingProofAudioId === item.id
                                        ? 'bg-[#25D366] animate-pulse'
                                        : 'bg-white/30'
                                    }`}
                                  />
                                ))}
                              </div>
                              <div className="flex justify-between text-[10px] text-white/60">
                                <span>
                                  {playingProofAudioId === item.id ? 'Lecture...' : 'Message audio'}
                                </span>
                                <span>{item.duration || '0:38'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-white/80 italic bg-black/20 p-2 rounded-xl">
                          "{item.title}"
                        </div>
                      </div>
                    )}

                    {/* TYPE 2: VIDÉO DÉBALLAGE */}
                    {item.type === 'video' && (
                      <div
                        onClick={() => setSelectedProofModalItem(item)}
                        className="w-52 h-64 rounded-2xl overflow-hidden bg-black flex-shrink-0 relative group cursor-pointer border border-[#E3E7EE] shadow-xs hover:shadow-md transition-all"
                      >
                        <img
                          src={item.thumbnailUrl || images[0]?.url || undefined}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/90 text-[#235BF7] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 text-white">
                          <span className="text-[10px] font-bold block truncate">{item.title}</span>
                          <span className="text-[9px] text-white/70">
                            {item.authorName} &bull; {item.city} ({item.duration || '0:18'})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* TYPE 3: PHOTO REÇUE / CAPTURE */}
                    {item.type === 'image' && (
                      <div
                        onClick={() => setSelectedProofModalItem(item)}
                        className="w-52 h-64 rounded-2xl overflow-hidden bg-black flex-shrink-0 relative group cursor-pointer border border-[#E3E7EE] shadow-xs hover:shadow-md transition-all"
                      >
                        <img
                          src={item.url || undefined}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-2.5 text-white">
                          <span className="text-[10px] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                            {item.authorName}
                          </span>
                          <span className="text-[9px] text-white/80">
                            {item.title} &bull; {item.city}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 backdrop-blur-xs flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <Maximize2 className="w-3 h-3" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </PageSection>
          )}

          {/* ======================================================== */}
          {/* 8. SECTION AVIS CLIENTS & BOUTON "LAISSER UN AVIS"        */}
          {/* ======================================================== */}
          <PageSection
            id="reviews-title"
            title={`Avis clients (${reviewsList.length})`}
            intro={
              reviewsList.length > 0 ? (
                <span className="flex items-center gap-2 text-amber-500">
                  <span className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${i < Math.round(reviewAverage) ? 'fill-current' : 'text-[#D5DAE2]'}`}
                      />
                    ))}
                  </span>
                  <span className="text-[16px] font-bold text-[#201D1D]">
                    {reviewAverage.toFixed(1).replace('.', ',')}/5
                  </span>
                </span>
              ) : (
                'Votre expérience aide les autres clients à choisir.'
              )
            }
            aside={
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="h-11 px-5 rounded-xl bg-[#235BF7] hover:bg-[#1A4AD6] text-white text-[15px] font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Laisser un avis</span>
              </button>
            }
          >
            {reviewsList.length === 0 && (
              <div className="p-6 @3xl:p-8 rounded-2xl border-2 border-dashed border-[#D5DAE2] text-center">
                <p className="text-[16px] font-bold text-[#201D1D]">Aucun avis pour le moment</p>
                <p className="mt-1 text-[15px] text-[#7A808C]">
                  Soyez le premier à donner votre avis.
                </p>
              </div>
            )}
            {/* Reviews List */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-3">
              {reviewsList.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 @3xl/page:p-5 rounded-2xl bg-white border border-[#E3E7EE] space-y-2.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#235BF7]/10 text-[#235BF7] font-bold text-[16px] flex items-center justify-center shrink-0">
                      {rev.authorName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[15px] font-bold text-[#201D1D] block leading-tight truncate">
                        {rev.authorName}
                      </span>
                      <span className="block text-[13px] text-[#7A808C] whitespace-nowrap truncate">
                        {rev.city || 'Dakar'} &bull; {rev.date}
                      </span>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <div className="flex text-amber-500">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                        {rev.verified && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap">
                            Achat vérifié
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-[15px] @3xl/page:text-[16px] text-[#3F4654] leading-relaxed">
                    "{rev.comment}"
                  </p>
                </div>
              ))}
            </div>
          </PageSection>

          {/* 9. FAQ (accordéon, masquée si aucune question) */}
          <FaqAccordion items={config.faqItems} />
        </div>
      </div>

      {/* ======================================================== */}
      {/* MOBILE STICKY BOTTOM BAR                                 */}
      {/* ======================================================== */}
      {isInsideMockup ? (
        <div className="sticky bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md p-3 border-t border-[#E3E7EE] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] flex items-center justify-center">
          <div
            className={`w-full max-w-sm mx-auto grid gap-2 ${waNumber ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            <button
              type="button"
              onClick={() => handleOpenCheckout('order')}
              className="py-3.5 px-3 rounded-2xl bg-[#235BF7] hover:bg-[#1A4AD6] active:scale-[0.98] text-white font-black text-xs tracking-tight flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-white" />
              <span className="truncate">Commander maintenant</span>
            </button>
            {waNumber && (
              <button
                type="button"
                onClick={() => handleOpenCheckout('whatsapp')}
                className="py-3.5 px-3 rounded-2xl bg-[#25D366] hover:bg-[#20BA5A] active:scale-[0.98] text-white font-black text-xs tracking-tight flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span className="truncate">WhatsApp</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md p-3.5 border-t border-[#E3E7EE] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] flex items-center justify-center">
          <div
            className={`w-full max-w-md mx-auto grid gap-2.5 ${waNumber ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            <button
              type="button"
              onClick={() => handleOpenCheckout('order')}
              className="py-3.5 px-3 rounded-2xl bg-[#235BF7] hover:bg-[#1A4AD6] active:scale-[0.98] text-white font-black text-xs tracking-tight flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-white" />
              <span className="truncate">Commander maintenant</span>
            </button>
            {waNumber && (
              <button
                type="button"
                onClick={() => handleOpenCheckout('whatsapp')}
                className="py-3.5 px-3 rounded-2xl bg-[#25D366] hover:bg-[#20BA5A] active:scale-[0.98] text-white font-black text-xs tracking-tight flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span className="truncate">WhatsApp</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL : LAISSER UN AVIS VÉRIFIÉ SUR CE PRODUIT           */}
      {/* ======================================================== */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsReviewModalOpen(false)} />

          <div className="relative w-full max-w-md bg-white rounded-[28px] p-6 border border-[#E3E7EE] shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F6]">
              <div>
                <h3 className="text-base font-black text-[#201D1D]">
                  Laisser un avis sur ce produit
                </h3>
                <p className="text-xs text-[#7A808C]">
                  Votre retour d'expérience aide les futurs acheteurs à Dakar
                </p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1.5 rounded-full text-[#7A808C] hover:text-[#201D1D] hover:bg-[#F1F3F6] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reviewSubmitted ? (
              <div className="py-6 text-center space-y-2 animate-in zoom-in-95">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="text-base font-black text-[#201D1D]">Merci pour votre avis !</h4>
                <p className="text-xs text-[#7A808C]">
                  Votre commentaire a été validé et publié avec le badge "Achat vérifié".
                </p>
              </div>
            ) : (
              <form onSubmit={handleAddReview} className="space-y-3.5">
                {/* Rating selection */}
                <div>
                  <label className="block text-xs font-bold text-[#201D1D] mb-1">
                    Votre note globale *
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReviewRating(star)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= newReviewRating
                              ? 'fill-current text-amber-500'
                              : 'text-[#D5DAE2]'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-[#201D1D] ml-2">
                      {newReviewRating}/5 étoiles
                    </span>
                  </div>
                </div>

                {/* Nom & Prénom */}
                <div>
                  <label className="block text-xs font-bold text-[#201D1D] mb-1">
                    Nom et Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={newReviewAuthor}
                    onChange={(e) => setNewReviewAuthor(e.target.value)}
                    placeholder="Ex: Cheikh Sow"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E3E7EE] text-xs text-[#201D1D] focus:outline-none focus:border-[#235BF7]"
                  />
                </div>

                {/* Ville / Quartier */}
                <div>
                  <label className="block text-xs font-bold text-[#201D1D] mb-1">
                    Quartier / Ville
                  </label>
                  <input
                    type="text"
                    value={newReviewCity}
                    onChange={(e) => setNewReviewCity(e.target.value)}
                    placeholder="Ex: Mermoz, Dakar"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E3E7EE] text-xs text-[#201D1D] focus:outline-none focus:border-[#235BF7]"
                  />
                </div>

                {/* Message / Avis */}
                <div>
                  <label className="block text-xs font-bold text-[#201D1D] mb-1">
                    Votre avis sur le produit et la livraison *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    placeholder="Partagez votre expérience : délai de livraison, état du colis, satisfaction..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E3E7EE] text-xs text-[#201D1D] focus:outline-none focus:border-[#235BF7] resize-none"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    fullWidth
                    iconRight={<Send className="w-3.5 h-3.5" />}
                  >
                    Publier mon avis vérifié
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL : APERÇU GRAND FORMAT PREUVE (PHOTO / VIDÉO)       */}
      {/* ======================================================== */}
      {selectedProofModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setSelectedProofModalItem(null)} />
          <div className="relative max-w-xl w-full bg-black rounded-[28px] overflow-hidden shadow-2xl z-10 border border-white/20">
            <button
              onClick={() => setSelectedProofModalItem(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {selectedProofModalItem.type === 'video' ? (
              <video
                src={selectedProofModalItem.url || undefined}
                controls
                autoPlay
                className="w-full max-h-[75vh] object-contain"
              />
            ) : (
              <img
                src={selectedProofModalItem.url || undefined}
                alt={selectedProofModalItem.title}
                className="w-full max-h-[75vh] object-contain"
              />
            )}

            <div className="p-3.5 bg-neutral-900 text-white text-xs flex items-center justify-between">
              <div>
                <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-4 h-4 stroke-[3]" /> {selectedProofModalItem.title}
                </span>
                <span className="text-white/60 text-[11px]">
                  {selectedProofModalItem.authorName} &bull; {selectedProofModalItem.city}
                </span>
              </div>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/80 font-bold uppercase">
                {selectedProofModalItem.type === 'video' ? 'Vidéo Unboxing' : 'Photo Colis'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Moneriz Checkout Modal (Intégration iframe sécurisée) */}
      <MonerizCheckoutModal
        isOpen={isMonerizModalOpen}
        onClose={() => setIsMonerizModalOpen(false)}
        session={monerizSession}
        onPaymentSuccess={() => {
          setIsMonerizModalOpen(false);
          if (!pendingOnlineOrder) return;
          const order = pendingOnlineOrder;
          // Le message de l'iframe n'est qu'un signal : le serveur revérifie
          // le paiement auprès de Moneriz avant de le marquer payé.
          const verify =
            confirmPayment && pendingOrderDbId
              ? confirmPayment(pendingOrderDbId).catch(() => false)
              : Promise.resolve(false);
          void verify.then((paid) => {
            setOrderSuccess({
              ...order,
              paymentStatus: paid ? 'paid' : 'pending_online',
              deliveryNotes: paid
                ? 'Paiement en ligne confirmé'
                : 'Paiement reçu, confirmation en cours (quelques minutes)',
            });
          });
        }}
      />
    </div>
  );
};
