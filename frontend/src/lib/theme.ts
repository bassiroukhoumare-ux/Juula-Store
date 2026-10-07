'use client';

// Light / dark / system theme of the merchant dashboard. The choice lives in
// localStorage (applied before paint by THEME_INIT_SCRIPT) and in the account
// (User.uiTheme) so it follows the merchant on every device.
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

import { DARK_CLASS, THEME_KEY, type ThemePref } from '@/lib/theme-script';

export type { ThemePref };

const isPref = (v: unknown): v is ThemePref => v === 'light' || v === 'dark' || v === 'system';

function readLocal(): ThemePref | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isPref(v) ? v : null;
  } catch {
    return null;
  }
}

const systemDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

function apply(pref: ThemePref, animate: boolean) {
  const root = document.documentElement;
  const dark = pref === 'dark' || (pref === 'system' && systemDark());
  if (animate) {
    root.classList.add('juula-theme-anim');
    window.setTimeout(() => root.classList.remove('juula-theme-anim'), 350);
  }
  root.classList.toggle(DARK_CLASS, dark);
}

export function useDashboardTheme(): {
  pref: ThemePref;
  dark: boolean;
  setPref: (p: ThemePref) => void;
} {
  const [pref, setPrefState] = useState<ThemePref>('system');
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const local = readLocal();
    const initial = local ?? 'system';
    setPrefState(initial);
    apply(initial, false);
    setDark(document.documentElement.classList.contains(DARK_CLASS));
    // First visit on this device: adopt the choice saved on the account.
    if (!local) {
      api<{ theme: ThemePref }>('/api/account/preferences')
        .then(({ theme }) => {
          if (!isPref(theme) || theme === 'system') return;
          try {
            localStorage.setItem(THEME_KEY, theme);
          } catch {
            // ignore
          }
          setPrefState(theme);
          apply(theme, true);
          setDark(document.documentElement.classList.contains(DARK_CLASS));
        })
        .catch(() => undefined);
    }
    // Leaving the dashboard (e.g. to the public site) restores the light theme.
    return () => document.documentElement.classList.remove(DARK_CLASS);
  }, []);

  // « Automatique » follows the device live.
  useEffect(() => {
    if (pref !== 'system') return;
    const q = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      apply('system', true);
      setDark(q.matches);
    };
    q.addEventListener('change', onChange);
    return () => q.removeEventListener('change', onChange);
  }, [pref]);

  const setPref = useCallback((p: ThemePref) => {
    try {
      localStorage.setItem(THEME_KEY, p);
    } catch {
      // ignore
    }
    setPrefState(p);
    apply(p, true);
    setDark(document.documentElement.classList.contains(DARK_CLASS));
    void api('/api/account/preferences', { method: 'PATCH', body: { theme: p } }).catch(
      () => undefined,
    );
  }, []);

  return { pref, dark, setPref };
}
