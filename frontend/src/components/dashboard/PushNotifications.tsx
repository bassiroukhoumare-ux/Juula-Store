'use client';

// Push notifications of the merchant space: settings card + dashboard invite.
import React, { useEffect, useState } from 'react';
import {
  BellOff,
  BellRing,
  CheckCircle2,
  Loader2,
  PlusSquare,
  Send,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
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
const PROMPT_SNOOZE_MS = 14 * 86_400_000;

/** Discreet invite at the top of the dashboard (until enabled or dismissed). */
export const PushPrompt: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const { state, busy, enable } = usePushNotifications();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(PROMPT_KEY) ?? 0);
      setHidden(Date.now() - at < PROMPT_SNOOZE_MS);
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden || (state !== 'off' && state !== 'ios-install')) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(PROMPT_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setHidden(true);
  };

  return (
    <div className="mx-4 sm:mx-6 lg:mx-0 mt-3 p-3.5 sm:p-4 rounded-[20px] bg-[#EEF3FF] border border-[#BFD0FD] flex flex-wrap sm:flex-nowrap items-center gap-3">
      <span className="w-10 h-10 shrink-0 rounded-2xl bg-[#235BF7] text-white flex items-center justify-center">
        <BellRing className="w-5 h-5" />
      </span>
      <p className="min-w-0 flex-1 text-[14px] text-[#201D1D] leading-snug">
        <strong>Ne ratez plus aucune commande.</strong>{' '}
        <span className="text-[#3F4654]">
          {state === 'ios-install'
            ? 'Ajoutez Juula à votre écran d’accueil pour recevoir les alertes.'
            : 'Activez les notifications sur ce téléphone.'}
        </span>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Plus tard"
        className="shrink-0 w-9 h-9 rounded-xl text-[#7A808C] hover:bg-white/70 flex items-center justify-center cursor-pointer sm:order-last"
      >
        <X className="w-4 h-4" />
      </button>
      {state === 'off' ? (
        <button
          type="button"
          onClick={() => void enable()}
          disabled={busy}
          className="w-full sm:w-auto shrink-0 min-h-11 px-4 rounded-xl bg-[#235BF7] text-white text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Activer les notifications
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full sm:w-auto shrink-0 min-h-11 px-4 rounded-xl bg-[#235BF7] text-white text-[14px] font-semibold cursor-pointer"
        >
          Voir comment faire
        </button>
      )}
    </div>
  );
};
