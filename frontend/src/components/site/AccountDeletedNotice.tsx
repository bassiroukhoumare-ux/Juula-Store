'use client';

// Homepage toast after a self-service account deletion (/?compte=supprime).
import { useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';

export function AccountDeletedNotice() {
  const { toast } = useToast();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('compte') !== 'supprime') return;
    toast('Votre compte a été supprimé définitivement. Merci d’avoir utilisé Juula.', 'success');
    window.history.replaceState(null, '', window.location.pathname);
  }, [toast]);
  return null;
}
