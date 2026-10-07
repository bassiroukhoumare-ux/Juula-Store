'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Crown, Loader2, Search, Sparkles, X } from 'lucide-react';
import { adminFetch, dateFmt } from './ui';

export interface MerchantRow {
  userId: string;
  email: string;
  name: string | null;
  storeName: string;
  subdomain: string | null;
  pro: boolean;
  planExpiresAt: string | null;
}

const DURATIONS = [
  { id: '7d', label: '7 jours', hint: 'Essai court' },
  { id: '14d', label: '14 jours', hint: '2 semaines' },
  { id: '30d', label: '1 mois', hint: '30 jours' },
  { id: '90d', label: '3 mois', hint: 'Trimestre' },
  { id: '180d', label: '6 mois', hint: 'Semestre' },
  { id: '365d', label: '1 an', hint: 'Annuel' },
  { id: 'lifetime', label: 'À vie', hint: 'Illimité' },
  { id: 'custom', label: 'Date précise', hint: 'Calendrier' },
] as const;

type Duration = (typeof DURATIONS)[number]['id'];

const NOTES = ['Paiement reçu en espèces', 'Partenaire VIP', 'Offre test', 'Geste commercial'];

export const GrantModal: React.FC<{
  initial?: MerchantRow | null;
  onClose: () => void;
  onDone: (message: string) => void;
}> = ({ initial = null, onClose, onDone }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MerchantRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<MerchantRow | null>(initial);
  const [duration, setDuration] = useState<Duration>('30d');
  const [until, setUntil] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Autocomplete: email, name or sub-domain (debounced).
  useEffect(() => {
    if (picked) return;
    const t = setTimeout(() => {
      setSearching(true);
      adminFetch<{ merchants: MerchantRow[] }>(
        `/api/adminom/merchants?q=${encodeURIComponent(q.trim())}`,
      )
        .then((r) => setResults(r.merchants.slice(0, 8)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, picked]);

  const submit = async () => {
    if (!picked || busy) return;
    if (duration === 'custom' && !until) {
      setError('Choisissez la date de fin.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await adminFetch<{ storeName: string; expiresAt: string | null }>(
        '/api/adminom/grant',
        {
          method: 'POST',
          body: {
            userId: picked.userId,
            duration,
            until: duration === 'custom' ? new Date(until).toISOString() : null,
            note,
          },
        },
      );
      onDone(
        `Accès PRO accordé à ${r.storeName} ${r.expiresAt ? `jusqu’au ${dateFmt.format(new Date(r.expiresAt))}` : 'à vie'}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'L’opération a échoué.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Accorder un accès PRO manuel"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-[var(--a-surface)] text-[var(--a-text)] rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-7 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-amber-400/15 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-[19px] font-extrabold">Accorder un accès PRO manuel</h2>
              <p className="text-[13px] text-[var(--a-muted)]">
                Effet immédiat : boutique en ligne, fonctions PRO débloquées.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--a-muted)] hover:bg-[var(--a-soft)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Account */}
        <div className="space-y-2">
          <p className="text-[14px] font-semibold">1. Compte marchand</p>
          {picked ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl border-2 border-[#235BF7] bg-[#235BF7]/8">
              <CheckCircle2 className="w-5 h-5 text-[#235BF7] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold truncate">{picked.storeName}</p>
                <p className="text-[13px] text-[var(--a-muted)] truncate">
                  {picked.email}
                  {picked.subdomain ? ` · ${picked.subdomain}.juula.store` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="shrink-0 h-9 px-3 rounded-xl text-[13px] font-semibold text-[var(--a-muted)] hover:bg-[var(--a-soft)] cursor-pointer"
              >
                Changer
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--a-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Email, nom ou sous-domaine de la boutique"
                  className="w-full h-12 pl-10 pr-10 rounded-xl border border-[var(--a-border)] bg-[var(--a-soft)] text-[15px] focus:outline-none focus:border-[#235BF7]"
                />
                {searching && (
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--a-muted)] absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
              <ul className="max-h-60 overflow-y-auto rounded-2xl border border-[var(--a-border)] divide-y divide-[var(--a-border)]">
                {results.length === 0 ? (
                  <li className="px-4 py-3 text-[14px] text-[var(--a-muted)]">
                    Aucun marchand trouvé.
                  </li>
                ) : (
                  results.map((m) => (
                    <li key={m.userId}>
                      <button
                        type="button"
                        onClick={() => setPicked(m)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--a-soft)] cursor-pointer"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold truncate">
                            {m.storeName}
                          </span>
                          <span className="block text-[13px] text-[var(--a-muted)] truncate">
                            {m.email}
                            {m.subdomain ? ` · ${m.subdomain}` : ''}
                          </span>
                        </span>
                        {m.pro && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[12px] font-bold text-amber-500">
                            <Crown className="w-3.5 h-3.5" /> PRO
                          </span>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
          {picked?.pro && (
            <p className="text-[13px] text-[var(--a-muted)]">
              Déjà PRO{' '}
              {picked.planExpiresAt
                ? `jusqu’au ${dateFmt.format(new Date(picked.planExpiresAt))} : la durée s’ajoute à la suite.`
                : 'à vie.'}
            </p>
          )}
        </div>

        {/* 2. Duration */}
        <div className="space-y-2">
          <p className="text-[14px] font-semibold">2. Durée</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDuration(d.id)}
                aria-pressed={duration === d.id}
                className={`min-h-14 px-2 rounded-2xl border-2 text-center cursor-pointer transition-colors ${
                  duration === d.id
                    ? 'border-[#235BF7] bg-[#235BF7]/8'
                    : 'border-[var(--a-border)] hover:bg-[var(--a-soft)]'
                }`}
              >
                <span className="block text-[14px] font-bold">{d.label}</span>
                <span className="block text-[12px] text-[var(--a-muted)]">{d.hint}</span>
              </button>
            ))}
          </div>
          {duration === 'custom' && (
            <input
              type="datetime-local"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              aria-label="Date de fin"
              className="w-full h-12 px-4 rounded-xl border border-[var(--a-border)] bg-[var(--a-soft)] text-[15px] focus:outline-none focus:border-[#235BF7]"
            />
          )}
        </div>

        {/* 3. Note */}
        <div className="space-y-2">
          <p className="text-[14px] font-semibold">
            3. Motif <span className="font-normal text-[var(--a-muted)]">(note interne)</span>
          </p>
          <input
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex : Paiement reçu en espèces"
            className="w-full h-12 px-4 rounded-xl border border-[var(--a-border)] bg-[var(--a-soft)] text-[15px] focus:outline-none focus:border-[#235BF7]"
          />
          <div className="flex flex-wrap gap-1.5">
            {NOTES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNote(n)}
                className="h-8 px-3 rounded-full bg-[var(--a-soft)] text-[12px] font-semibold text-[var(--a-muted)] hover:text-[var(--a-text)] cursor-pointer"
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-[14px] font-semibold text-rose-500">{error}</p>}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={!picked || busy}
          className="w-full h-12 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] disabled:opacity-50 text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Confirmer l’accès PRO
        </button>
      </div>
    </div>
  );
};
