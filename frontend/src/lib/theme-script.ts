// Shared by the server layouts and the client theme hook (no 'use client').
export type ThemePref = 'light' | 'dark' | 'system';
export const THEME_KEY = 'juula-theme';
export const DARK_CLASS = 'juula-dark';

/** Inline <script> run before the dashboard paints (no white flash). */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('${DARK_CLASS}');}catch(e){}})();`;
