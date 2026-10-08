'use client';

// Paramètres → Compte: danger zone + the 4-step account deletion dialog.
//   1. Are you sure?  2. What you lose (checkbox)  3. Type your e-mail → code
//   4. 6-digit code → erased, signed out, back to the homepage.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Mail,
  ShieldAlert,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { api, ApiError, clearCsrfToken } from '@/lib/api';
import { formatNumber } from '@/lib/orderUtils';

type Blocker = { code: string; amount?: number };
type Step = 1 | 2 | 3 | 4;

const LOSSES = [
  'La fermeture immédiate de votre boutique en ligne Juula Store.',
  'La suppression de tous vos produits, images et catalogues.',
  'La perte de l’historique de toutes vos commandes et des données de vos clients.',
  'L’annulation définitive de votre abonnement en cours, sans remboursement possible.',
];

function blockerText(b: Blocker): string {
  const amount = b.amount ? `${formatNumber(b.amount)} FCFA` : '';
  switch (b.code) {
    case 'BALANCE_AVAILABLE':
      return `Il vous reste ${amount} à retirer. Faites un retrait depuis Juula Pay avant de supprimer votre compte.`;
    case 'BALANCE_PENDING':
      return `${amount} de paiements sont encore en attente de disponibilité. Attendez qu’ils soient disponibles puis retirez-les.`;
    case 'WITHDRAWAL_IN_PROGRESS':
      return `Un retrait de ${amount} est en cours. Attendez qu’il soit terminé.`;
    case 'DISPUTE_OPEN':
      return `${amount} sont bloqués par un litige en cours. Contactez l’équipe Juula pour le régler.`;
    case 'ADMIN_ACCOUNT':
      return 'Ce compte a un rôle d’administrateur : il ne peut pas être supprimé d’ici.';
    case 'ORGANIZATION_OWNER':
      return 'Vous êtes propriétaire d’une organisation : transférez-la d’abord.';
    default:
      return 'Votre compte ne peut pas encore être supprimé.';
  }
}

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return (err.body?.message as string) || err.message || fallback;
  return 'Erreur réseau. Vérifiez votre connexion.';
}

/** Seconds until `iso` (0 once past), refreshed every second. */
function useCountdown(iso: string | null): number {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!iso) return setLeft(0);
    const tick = () =>
      setLeft(Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000)));
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [iso]);
  return left;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const btnDanger =
  'min-h-12 px-5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors';
const btnGhost =
  'min-h-12 px-5 rounded-xl border border-[#E3E7EE] bg-white hover:bg-[#F6F7F9] text-[#3F4654] text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors';

export const DeleteAccountDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState<Step>(1);
  const [accountEmail, setAccountEmail] = useState('');
  const [blockers, setBlockers] = useState<Blocker[] | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const expiresIn = useCountdown(expiresAt);
  const resendIn = useCountdown(resendAt);

  useEffect(() => {
    let alive = true;
    api<{ email: string; blockers: Blocker[] }>('/api/account/delete')
      .then((r) => {
        if (!alive) return;
        setAccountEmail(r.email);
        setBlockers(r.blockers);
      })
      .catch((e) => alive && setError(errorText(e, 'Impossible de vérifier votre compte.')));
    return () => {
      alive = false;
    };
  }, []);

  const close = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (step === 4) codeRef.current?.focus();
  }, [step]);

  const emailMatches = email.trim().toLowerCase() === accountEmail.trim().toLowerCase();

  const requestCode = async () => {
    setError(null);
    if (!emailMatches) {
      setError('Cette adresse ne correspond pas à l’e-mail de votre compte.');
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ expiresAt: string; resendAt: string }>('/api/account/delete/code', {
        method: 'POST',
        body: { email: email.trim() },
      });
      setExpiresAt(r.expiresAt);
      setResendAt(r.resendAt);
      setCode('');
      setNotice('Un code de sécurité a été envoyé à votre adresse e-mail.');
      setStep(4);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DELETION_BLOCKED') {
        setBlockers((e.body?.blockers as Blocker[]) ?? []);
      }
      setError(errorText(e, 'L’envoi du code a échoué.'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setError(null);
    setBusy(true);
    try {
      await api('/api/account/delete/confirm', { method: 'POST', body: { code } });
      clearCsrfToken();
      window.location.href = '/?compte=supprime';
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DELETION_BLOCKED') {
        setBlockers((e.body?.blockers as Blocker[]) ?? []);
      }
      setError(errorText(e, 'La suppression a échoué.'));
      setBusy(false);
    }
  };

  const blocked = Boolean(blockers && blockers.length > 0);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="del-title"
        className="relative w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] border border-[#ECEFF4] shadow-2xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto motion-safe:animate-[rise_300ms_cubic-bezier(.2,.75,.2,1)]"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fermer"
          className="absolute top-4 right-4 w-10 h-10 rounded-full text-[#7A808C] hover:bg-[#F1F5F9] flex items-center justify-center cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-5" aria-label={`Étape ${step} sur 4`}>
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all ${
                n <= step ? 'w-8 bg-[#DC2626]' : 'w-4 bg-[#E3E7EE]'
              }`}
            />
          ))}
          <span className="ml-2 text-[13px] font-semibold text-[#7A808C]">Étape {step} sur 4</span>
        </div>

        {blockers === null && !error ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#7A808C]" />
          </div>
        ) : blocked ? (
          <div className="space-y-4">
            <span className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <h2 id="del-title" className="text-[20px] font-extrabold text-[#201D1D]">
              Suppression impossible pour le moment
            </h2>
            <ul className="space-y-2">
              {blockers!.map((b) => (
                <li
                  key={b.code}
                  className="p-3 rounded-xl bg-amber-50 text-[14px] text-amber-900 leading-relaxed"
                >
                  {blockerText(b)}
                </li>
              ))}
            </ul>
            <p className="text-[14px] text-[#3F4654]">
              Votre argent reste à vous : nous ne supprimons jamais un compte qui détient encore des
              fonds.
            </p>
            <button type="button" onClick={close} className={`${btnGhost} w-full`}>
              Fermer
            </button>
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <span className="w-12 h-12 rounded-2xl bg-red-50 text-[#DC2626] flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <h2 id="del-title" className="text-[20px] font-extrabold text-[#201D1D]">
              Êtes-vous sûr de vouloir supprimer votre compte ?
            </h2>
            <p className="text-[15px] text-[#3F4654] leading-relaxed">
              Votre compte, votre boutique et toutes vos données seront supprimés définitivement.
              Cette action ne peut pas être annulée.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button type="button" onClick={close} className={`${btnGhost} sm:flex-1`}>
                Annuler
              </button>
              <button type="button" onClick={() => setStep(2)} className={`${btnDanger} sm:flex-1`}>
                Continuer la suppression
              </button>
            </div>
          </div>
        ) : step === 2 ? (
          <div className="space-y-4">
            <h2 id="del-title" className="text-[20px] font-extrabold text-[#201D1D]">
              Ce que vous allez perdre définitivement
            </h2>
            <ul className="space-y-2.5">
              {LOSSES.map((l) => (
                <li key={l} className="flex items-start gap-2.5 text-[14px] text-[#201D1D]">
                  <XCircle className="w-5 h-5 shrink-0 text-[#DC2626]" />
                  <span className="leading-relaxed">{l}</span>
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-3 p-3.5 rounded-xl border-2 border-[#ECEFF4] has-[:checked]:border-[#DC2626] has-[:checked]:bg-red-50/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-0.5 w-5 h-5 accent-[#DC2626] cursor-pointer"
              />
              <span className="text-[14px] font-semibold text-[#201D1D]">
                Je comprends que cette action est définitive et irréversible.
              </span>
            </label>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button type="button" onClick={() => setStep(1)} className={`${btnGhost} sm:flex-1`}>
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!understood}
                className={`${btnDanger} sm:flex-1`}
              >
                Passer à la vérification
              </button>
            </div>
          </div>
        ) : step === 3 ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void requestCode();
            }}
          >
            <span className="w-12 h-12 rounded-2xl bg-red-50 text-[#DC2626] flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </span>
            <h2 id="del-title" className="text-[20px] font-extrabold text-[#201D1D]">
              Confirmez votre adresse e-mail
            </h2>
            <p className="text-[14px] text-[#3F4654] leading-relaxed">
              Saisissez l’adresse e-mail de connexion de votre compte. Nous y enverrons un code de
              sécurité à 6 chiffres.
            </p>
            <div>
              <label htmlFor="del-email" className="block text-[14px] font-semibold text-[#201D1D]">
                Adresse e-mail
              </label>
              <input
                id="del-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                onPaste={(e) => e.preventDefault()}
                placeholder="vous@exemple.com"
                className="mt-1.5 w-full min-h-12 px-4 rounded-xl border-2 border-[#E2E8F0] focus:border-[#DC2626] focus:ring-4 focus:ring-[#DC2626]/15 text-[16px] text-[#201D1D] focus:outline-none transition-all"
              />
            </div>
            {error && (
              <p role="alert" className="text-[14px] font-semibold text-[#DC2626]">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button type="button" onClick={() => setStep(2)} className={`${btnGhost} sm:flex-1`}>
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className={`${btnDanger} sm:flex-1`}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Envoyer le code
              </button>
            </div>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 6) void confirm();
            }}
          >
            <h2 id="del-title" className="text-[20px] font-extrabold text-[#201D1D]">
              Saisissez le code de sécurité
            </h2>
            {notice && (
              <p className="p-3 rounded-xl bg-emerald-50 text-[14px] text-emerald-800">{notice}</p>
            )}
            <div>
              <label htmlFor="del-code" className="block text-[14px] font-semibold text-[#201D1D]">
                Code à 6 chiffres
              </label>
              <input
                id="del-code"
                ref={codeRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError(null);
                }}
                placeholder="••••••"
                className="mt-1.5 w-full min-h-14 px-4 rounded-xl border-2 border-[#E2E8F0] focus:border-[#DC2626] focus:ring-4 focus:ring-[#DC2626]/15 text-center text-[26px] font-bold tracking-[0.5em] text-[#201D1D] focus:outline-none transition-all"
              />
              <p className="mt-1.5 text-[13px] text-[#7A808C]" aria-live="polite">
                {expiresIn > 0
                  ? `Code valable encore ${mmss(expiresIn)}.`
                  : 'Ce code a expiré : demandez-en un nouveau.'}
              </p>
            </div>
            {error && (
              <p role="alert" className="text-[14px] font-semibold text-[#DC2626]">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className={`${btnDanger} w-full`}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Confirmer et supprimer définitivement
            </button>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(3);
                  setError(null);
                  setNotice(null);
                }}
                disabled={busy}
                className="min-h-11 px-2 text-[14px] font-semibold text-[#3F4654] hover:text-[#201D1D] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Changer d’adresse
              </button>
              <button
                type="button"
                onClick={() => void requestCode()}
                disabled={busy || resendIn > 0}
                className="min-h-11 px-2 text-[14px] font-semibold text-[#DC2626] disabled:text-[#9CA3AF] disabled:cursor-not-allowed cursor-pointer"
              >
                {resendIn > 0 ? `Renvoyer le code (${resendIn} s)` : 'Renvoyer le code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/** Paramètres → Compte. */
export const DangerZoneCard: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <section className="p-5 sm:p-6 rounded-[24px] bg-white border-2 border-red-200 space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 shrink-0 rounded-2xl bg-red-50 text-[#DC2626] flex items-center justify-center">
          <AlertTriangle className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[17px] font-extrabold text-[#201D1D]">Zone de danger</h3>
          <p className="mt-1 text-[14px] text-[#7A808C] leading-relaxed">
            La suppression de votre compte ferme votre boutique et efface définitivement vos
            produits, vos commandes et les données de vos clients.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${btnDanger} w-full sm:w-auto`}
      >
        <Trash2 className="w-4 h-4" /> Supprimer définitivement mon compte
      </button>
      {open && <DeleteAccountDialog onClose={() => setOpen(false)} />}
    </section>
  );
};
