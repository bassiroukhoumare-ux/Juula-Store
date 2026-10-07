'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { JuulaLogo } from '@/components/brand/JuulaLogo';

/** Lock screen of /adminom: one masked field, checked by the server. */
export const AdminLogin: React.FC = () => {
  const [code, setCode] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !code) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/adminom/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        setError(body?.message ?? 'Accès refusé.');
        setCode('');
        return;
      }
      window.location.reload();
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-[32px] p-7 sm:p-8 space-y-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
      >
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <JuulaLogo height={34} />
          </div>
          <span className="mx-auto w-14 h-14 rounded-2xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-[22px] font-extrabold text-[#0F172A]">Juula Admin</h1>
            <p className="text-[14px] text-[#64748B]">Espace réservé. Saisissez le code d’accès.</p>
          </div>
        </div>
        <label className="block space-y-1.5">
          <span className="text-[13px] font-semibold text-[#0F172A]">
            Code d’accès administrateur
          </span>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="w-full h-12 pl-4 pr-12 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[16px] tracking-wider text-[#0F172A] focus:outline-none focus:border-[#235BF7] focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Masquer le code' : 'Afficher le code'}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>
        {error && (
          <p role="alert" className="text-[14px] font-semibold text-[#DC2626] text-center">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !code}
          className="w-full h-12 rounded-xl bg-[#0F172A] hover:bg-black disabled:opacity-50 text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Déverrouiller
        </button>
      </form>
    </main>
  );
};
