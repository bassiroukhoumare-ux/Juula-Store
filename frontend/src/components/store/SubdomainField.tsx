'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import {
  normalizeSubdomain,
  ROOT_DOMAIN,
  subdomainProblem,
  SUBDOMAIN_MESSAGES,
} from '@/lib/store/subdomain';

export type SubdomainStatus = 'idle' | 'checking' | 'available' | 'unavailable';

interface SubdomainFieldProps {
  value: string;
  onChange: (value: string) => void;
  onStatusChange?: (status: SubdomainStatus) => void;
  /** The store's current subdomain (always "available" to itself). */
  current?: string | null;
  id?: string;
}

/** Like normalizeSubdomain but keeps a trailing "-" so the user can keep typing. */
function typingSubdomain(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, 30);
}

/** "____.juula.store" input with live availability check (debounced). */
export const SubdomainField: React.FC<SubdomainFieldProps> = ({
  value,
  onChange,
  onStatusChange,
  current,
  id,
}) => {
  const [status, setStatus] = useState<SubdomainStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  useEffect(() => {
    const sub = normalizeSubdomain(value);
    if (!sub) {
      setStatus('idle');
      setMessage(null);
      return;
    }
    const problem = subdomainProblem(sub);
    if (problem) {
      setStatus('unavailable');
      setMessage(SUBDOMAIN_MESSAGES[problem]);
      return;
    }
    if (current && sub === current) {
      setStatus('available');
      setMessage('C’est votre adresse actuelle.');
      return;
    }
    setStatus('checking');
    setMessage(null);
    let cancelled = false;
    const t = setTimeout(() => {
      api<{ available: boolean; message?: string }>(
        `/api/store/subdomain?value=${encodeURIComponent(sub)}`,
      )
        .then((r) => {
          if (cancelled) return;
          setStatus(r.available ? 'available' : 'unavailable');
          setMessage(
            r.available ? 'Cette adresse est disponible !' : (r.message ?? 'Adresse indisponible.'),
          );
        })
        .catch(() => {
          if (cancelled) return;
          setStatus('idle');
          setMessage('Vérification impossible, réessayez.');
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, current]);

  const border =
    status === 'available'
      ? 'border-[#16A34A] focus-within:ring-[#16A34A]/20'
      : status === 'unavailable'
        ? 'border-[#DC2626] focus-within:ring-[#DC2626]/20'
        : 'border-[#E2E8F0] focus-within:border-[#235BF7] focus-within:ring-[#235BF7]/20';

  return (
    <div>
      <div
        className={`flex items-stretch rounded-2xl bg-white border-2 focus-within:ring-4 transition-all overflow-hidden ${border}`}
      >
        <input
          id={id}
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(typingSubdomain(e.target.value))}
          placeholder="ma-boutique"
          className="flex-1 min-w-0 px-4 py-3.5 text-[15px] font-bold text-[#201D1D] bg-transparent focus:outline-none"
          aria-describedby={id ? `${id}-help` : undefined}
        />
        <span className="flex items-center px-3 sm:px-4 bg-[#F4F6FB] text-[15px] font-bold text-[#6B7280] border-l border-[#E6EAF2] whitespace-nowrap">
          .{ROOT_DOMAIN}
        </span>
      </div>
      <p
        id={id ? `${id}-help` : undefined}
        aria-live="polite"
        className={`mt-2 min-h-5 text-[13px] font-semibold flex items-center gap-1.5 ${
          status === 'available'
            ? 'text-[#16A34A]'
            : status === 'unavailable'
              ? 'text-[#DC2626]'
              : 'text-[#6B7280]'
        }`}
      >
        {status === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {status === 'available' && <CheckCircle2 className="w-3.5 h-3.5" />}
        {status === 'unavailable' && <XCircle className="w-3.5 h-3.5" />}
        {status === 'checking' ? 'Vérification…' : message}
      </p>
    </div>
  );
};
