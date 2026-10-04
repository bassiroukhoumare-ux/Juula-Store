'use client';

import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Link2, Rocket, Share2 } from 'lucide-react';
import type { FunnelPageStatus } from '@/types/juula';

interface ShareLinkBarProps {
  slug: string;
  status: FunnelPageStatus;
  productTitle: string;
  onPublish: () => void;
}

/** Public link of the product being edited: copy, open, share, publish. */
export const ShareLinkBar: React.FC<ShareLinkBarProps> = ({
  slug,
  status,
  productTitle,
  onPublish,
}) => {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === 'function');
  }, []);

  const url = `${origin}/p/${slug}`;
  const isPublished = status === 'published';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for browsers without async clipboard (old WebViews).
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    navigator.share?.({ title: productTitle, url }).catch(() => undefined);
  };

  return (
    <div className="mb-5 p-4 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-[#EFF4FF] text-[#1E60F8] flex items-center justify-center shrink-0">
          <Link2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-[#64748B] flex items-center gap-1.5">
            Lien de la page produit
            {isPublished ? (
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                EN LIGNE
              </span>
            ) : (
              <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">
                {status === 'inactive' ? 'DÉSACTIVÉE' : 'BROUILLON'}
              </span>
            )}
          </p>
          <p className="text-xs font-mono font-semibold text-[#0F172A] truncate" title={url}>
            {origin ? url : `/p/${slug}`}
          </p>
          {!isPublished && (
            <p className="text-[10px] text-[#94A3B8]">
              Publiez la page pour que vos clients puissent l&apos;ouvrir.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {!isPublished && (
          <button
            onClick={onPublish}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors cursor-pointer"
          >
            <Rocket className="w-3.5 h-3.5" />
            Publier
          </button>
        )}
        <button
          onClick={handleCopy}
          disabled={!origin}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1E60F8] hover:bg-[#164ED0] text-white text-xs font-black transition-colors cursor-pointer disabled:opacity-60"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Lien copié !' : 'Copier le lien'}
        </button>
        {canShare && (
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-bold transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            Partager
          </button>
        )}
        <a
          href={`/p/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-bold transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ouvrir
        </a>
      </div>
    </div>
  );
};
