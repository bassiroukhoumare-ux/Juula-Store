'use client';

// Push notifications of the merchant space: settings card + dashboard invite.
import React, { useCallback, useEffect, useState } from 'react';
import { BellOff, BellRing, Loader2, PlusSquare, Send, Share, Smartphone, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { usePushNotifications, type PushState } from '@/lib/push-client';

const IOS_STEPS = [
  { icon: <Share className="w-4 h-4" />, text: 'Touchez le bouton Partager de Safari' },
  { icon: <PlusSquare className="w-4 h-4" />, text: 'Choisissez « Sur l’écran d’accueil »' },
  {
    icon: <Smartphone className="w-4 h-4" />,
    text: 'Ouvrez Juula depuis cette icône, puis revenez ici',
  },
];

function IosInstallSteps() {
  return (
    <ol className="space-y-2">
      {IOS_STEPS.map((s, i) => (
        <li key={s.text} className="flex items-center gap-3 text-[14px] text-[#3F4654]">
          <span className="w-7 h-7 shrink-0 rounded-full bg-[#EEF3FF] text-[#235BF7] text-[12px] font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <span className="text-[#235BF7]">{s.icon}</span>
          {s.text}
        </li>
      ))}
    </ol>
  );
}

const STATUS: Record<PushState, { label: string; cls: string }> = {
  loading: { label: 'Vérification…', cls: 'bg-[#F1F3F6] text-[#7A808C]' },
  unsupported: { label: 'Non pris en charge', cls: 'bg-[#F1F3F6] text-[#7A808C]' },
  'ios-install': { label: 'Installation requise', cls: 'bg-amber-50 text-amber-700' },
  'not-configured': { label: 'Indisponible', cls: 'bg-[#F1F3F6] text-[#7A808C]' },
  denied: { label: 'Bloquées', cls: 'bg-rose-50 text-rose-700' },
  off: { label: 'Désactivées', cls: 'bg-[#F1F3F6] text-[#3F4654]' },
  on: { label: 'Activées', cls: 'bg-emerald-50 text-emerald-700' },
};

/** Paramètres → Notifications. */
export const PushNotificationsCard: React.FC = () => {
  const { state, busy, error, enable, disable } = usePushNotifications();
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const st = STATUS[state];

  const test = async () => {
    setTesting(true);
    setTestMsg(null);
    try {
      const r = await api<{ sent: number }>('/api/push/test', { method: 'POST' });
      setTestMsg(
        r.sent > 0
          ? 'Notification de test envoyée : elle doit apparaître dans quelques secondes.'
          : 'Aucun appareil n’a reçu le test. Désactivez puis réactivez les notifications.',
      );
    } catch {
      setTestMsg('L’envoi du test a échoué. Réessayez.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="p-5 sm:p-6 rounded-[24px] bg-white border border-[#ECEFF4] space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 shrink-0 rounded-2xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center">
          <BellRing className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] font-extrabold text-[#201D1D]">
              Notifications sur ce téléphone
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-[12px] font-bold ${st.cls}`}>
              {st.label}
            </span>
          </div>
          <p className="mt-1 text-[14px] text-[#7A808C]">
            Soyez alerté instantanément, même application fermée, à chaque nouvelle commande et à
            chaque paiement reçu.
          </p>
        </div>
      </div>

      {state === 'ios-install' && (
        <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-3">
          <p className="text-[14px] font-semibold text-[#201D1D]">
            Sur iPhone, installez d’abord Juula sur votre écran d’accueil :
          </p>
          <IosInstallSteps />
        </div>
      )}
      {state === 'denied' && (
        <p className="p-4 rounded-2xl bg-rose-50 text-[14px] text-rose-700">
          Les notifications sont bloquées pour Juula dans les réglages de votre navigateur.
          Autorisez-les (icône à gauche de l’adresse, ou Réglages → Notifications), puis rechargez
          la page.
        </p>
      )}
      {state === 'unsupported' && (
        <p className="text-[14px] text-[#7A808C]">
          Ce navigateur ne prend pas en charge les notifications. Utilisez Chrome sur Android, ou
          Safari sur iPhone après avoir ajouté Juula à l’écran d’accueil.
        </p>
      )}
      {state === 'not-configured' && (
        <p className="text-[14px] text-[#7A808C]">
          Les notifications ne sont pas encore disponibles.
        </p>
      )}

      {error && <p className="text-[14px] font-semibold text-rose-600">{error}</p>}
      {testMsg && <p className="text-[14px] text-[#3F4654]">{testMsg}</p>}

      <div className="flex flex-col sm:flex-row gap-2">
        {state === 'off' && (
          <button
            type="button"
            onClick={() => void enable()}
            disabled={busy}
            className="min-h-12 px-5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] disabled:opacity-60 text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
            Activer les notifications
          </button>
        )}
        {state === 'on' && (
          <>
            <button
              type="button"
              onClick={() => void test()}
              disabled={testing}
              className="min-h-12 px-5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] disabled:opacity-60 text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Envoyer un test
            </button>
            <button
              type="button"
              onClick={() => void disable()}
              disabled={busy}
              className="min-h-12 px-5 rounded-xl border border-[#E3E7EE] bg-white hover:bg-[#F6F7F9] text-[#3F4654] text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <BellOff className="w-4 h-4" /> Désactiver sur cet appareil
            </button>
          </>
        )}
      </div>
    </section>
  );
};

const PROMPT_KEY = 'juula-push-prompt-dismissed';
/** « Plus tard » / ✕ : not shown again for 15 days. */
export const PROMPT_SNOOZE_MS = 15 * 86_400_000;
/** Shown shortly after reaching the dashboard, never on first paint. */
const PROMPT_DELAY_MS = 4_000;

/** Snoozed by an earlier « Plus tard » (localStorage timestamp). */
export function isPromptSnoozed(now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(PROMPT_KEY) ?? 0);
    return now - at < PROMPT_SNOOZE_MS;
  } catch {
    return false;
  }
}

function snoozePrompt(): void {
  try {
    localStorage.setItem(PROMPT_KEY, String(Date.now()));
  } catch {
    // Private mode: the card simply comes back next visit.
  }
}

/** The browser has not been asked yet (granted / denied → never prompt). */
function permissionUndecided(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'default';
}

/**
 * Soft prompt: a floating card explaining the value of push notifications.
 * The native permission dialog opens ONLY when the merchant taps « Activer ».
 */
export const PushPrompt: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const { state, busy, error, enable } = usePushNotifications();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const eligible = (state === 'off' && permissionUndecided()) || state === 'ios-install';

  useEffect(() => {
    if (!eligible || isPromptSnoozed()) return;
    const t = window.setTimeout(() => setOpen(true), PROMPT_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [eligible]);

  const later = useCallback(() => {
    snoozePrompt();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && later();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, later]);

  if (!open || !eligible) return null;

  const activate = async () => {
    const next = await enable();
    if (next === 'on') {
      setOpen(false);
      toast('Notifications activées : vous serez alerté de chaque nouvelle commande.', 'success');
    } else if (next === 'denied') {
      setOpen(false);
    } else if (next === 'off') {
      // Native dialog dismissed without answering: same as « Plus tard ».
      later();
    }
  };

  const ios = state === 'ios-install';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="push-prompt-title"
      aria-describedby="push-prompt-desc"
      className="fixed z-50 inset-x-3 bottom-[92px] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[400px] p-5 rounded-[24px] bg-white border border-[#ECEFF4] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] motion-safe:animate-[rise_400ms_cubic-bezier(.2,.75,.2,1)]"
    >
      <button
        type="button"
        onClick={later}
        aria-label="Fermer"
        className="absolute top-3 right-3 w-9 h-9 rounded-xl text-[#7A808C] hover:bg-[#F6F7F9] flex items-center justify-center cursor-pointer transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3.5 pr-8">
        <span className="w-11 h-11 shrink-0 rounded-2xl bg-[#235BF7] text-white flex items-center justify-center">
          <BellRing className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h2 id="push-prompt-title" className="text-[16px] font-extrabold text-[#201D1D]">
            Ne ratez plus aucune commande
          </h2>
          <p id="push-prompt-desc" className="mt-1 text-[14px] leading-relaxed text-[#3F4654]">
            {ios
              ? 'Sur iPhone, ajoutez Juula à votre écran d’accueil pour être alerté en temps réel de chaque commande et de chaque paiement.'
              : 'Activez les notifications pour être alerté en temps réel de chaque nouvelle commande et de chaque paiement, même application fermée.'}
          </p>
        </div>
      </div>

      {error && <p className="mt-3 text-[13px] font-semibold text-rose-600">{error}</p>}

      <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          onClick={later}
          className="min-h-11 px-4 rounded-xl text-[14px] font-semibold text-[#3F4654] hover:bg-[#F6F7F9] cursor-pointer transition-colors"
        >
          Plus tard
        </button>
        {ios ? (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
            className="min-h-11 px-5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] text-white text-[14px] font-semibold cursor-pointer transition-colors"
          >
            Voir comment faire
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void activate()}
            disabled={busy}
            className="min-h-11 px-5 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] disabled:opacity-60 text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
            Activer
          </button>
        )}
      </div>
    </div>
  );
};
