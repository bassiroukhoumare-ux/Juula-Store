'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Tag, X } from 'lucide-react';
import { formatMoney } from '@/lib/money';

export interface AppliedPromo {
  code: string;
  label: string;
  discount: number;
  total: number;
}

interface PromoCodeFieldProps {
  /** Body of POST /api/public/promo without the code (shop + items, or product). */
  request: Record<string, unknown>;
  /** Changes when the order changes: an applied code is re-checked. */
  signature: string;
  applied: AppliedPromo | null;
  onChange: (promo: AppliedPromo | null) => void;
  /** Visual tone: the shop uses its accent colour. */
  accentVar?: string;
}

/** « Vous avez un code promo ? » → field + Appliquer, checked by the server. */
export const PromoCodeField: React.FC<PromoCodeFieldProps> = ({
  request,
  signature,
  applied,
  onChange,
  accentVar = 'var(--accent,#235BF7)',
}) => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(request);
  requestRef.current = request;

  const check = async (raw: string): Promise<void> => {
    const value = raw.trim();
    if (!value) {
      setError('Saisissez un code promo.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/public/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestRef.current, code: value }),
      });
      const body = (await res.json().catch(() => null)) as
        | (AppliedPromo & { ok: true })
        | { ok: false; message?: string }
        | null;
      if (!res.ok || !body || !body.ok) {
        onChange(null);
        setError((body && 'message' in body && body.message) || 'Ce code promo n’est pas valide.');
        return;
      }
      onChange({ code: body.code, label: body.label, discount: body.discount, total: body.total });
      setCode('');
    } catch {
      setError('Vérification impossible. Vérifiez votre connexion.');
    } finally {
      setBusy(false);
    }
  };

  // The cart / quantity changed: the discount (or the minimum) may change too.
  const appliedCode = applied?.code;
  useEffect(() => {
    if (appliedCode) void check(appliedCode);
  }, [signature]);

  if (applied) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
        <p className="min-w-0 flex-1 text-[14px] text-emerald-900">
          Code <strong>{applied.code}</strong> appliqué :{' '}
          <strong>-{formatMoney(applied.discount)}</strong>
          {applied.label === 'Livraison offerte' ? ' (livraison offerte)' : ''}
        </p>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Retirer le code promo"
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-emerald-800 hover:bg-emerald-100 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-[14px] font-semibold hover:underline underline-offset-2 cursor-pointer"
        style={{ color: accentVar }}
      >
        <Tag className="w-4 h-4" /> Vous avez un code promo ?
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void check(code);
            }
          }}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={30}
          placeholder="Ex : WELCOME10"
          aria-label="Code promo"
          className="min-w-0 flex-1 h-12 px-4 rounded-xl border border-[#E3E7EE] bg-[#F6F7F9] text-[16px] font-semibold tracking-wide text-[#201D1D] placeholder:font-normal placeholder:tracking-normal placeholder:text-[#9AA0AB] focus:outline-none focus:bg-white"
          style={{ borderColor: error ? '#FCA5A5' : undefined }}
        />
        <button
          type="button"
          onClick={() => void check(code)}
          disabled={busy}
          className="shrink-0 h-12 px-5 rounded-xl bg-[#201D1D] text-white text-[15px] font-semibold disabled:opacity-60 inline-flex items-center gap-2 cursor-pointer"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Appliquer
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[14px] font-semibold text-[#DC2626]">
          {error}
        </p>
      )}
    </div>
  );
};

/** The applied code, kept for the visit so the cart and the checkout share it. */
export function useStoredPromo(
  shop: string,
): [AppliedPromo | null, (p: AppliedPromo | null) => void] {
  const key = `juula-promo:${shop}`;
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) setPromo(JSON.parse(raw) as AppliedPromo);
    } catch {
      // private mode / corrupted value
    }
  }, [key]);
  const update = (p: AppliedPromo | null) => {
    setPromo(p);
    try {
      if (p) sessionStorage.setItem(key, JSON.stringify(p));
      else sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  };
  return [promo, update];
}
