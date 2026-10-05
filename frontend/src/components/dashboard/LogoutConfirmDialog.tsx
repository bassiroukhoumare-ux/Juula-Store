'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';

interface LogoutConfirmDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

/** « Voulez-vous vraiment vous déconnecter ? » — Annuler / Se déconnecter. */
export const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  open,
  onCancel,
  onConfirm,
}) => {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-[#201D1D]/40 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-[28px] p-6 text-center"
      >
        <span className="mx-auto w-12 h-12 rounded-2xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
          <LogOut className="w-5 h-5" />
        </span>
        <h3 id="logout-title" className="mt-4 text-lg font-extrabold text-[#201D1D]">
          Se déconnecter ?
        </h3>
        <p className="mt-1 text-[14px] text-[#7A808C]">
          Vous devrez vous reconnecter pour accéder à votre boutique.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onCancel}
            className="py-2.5 rounded-xl border border-[#E3E7EE] text-[14px] font-semibold text-[#201D1D] hover:bg-[#F6F7F9] cursor-pointer disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[14px] font-semibold cursor-pointer disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};
