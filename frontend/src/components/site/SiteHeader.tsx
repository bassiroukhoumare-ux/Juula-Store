import React from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { JuulaLogo } from '@/components/brand/JuulaLogo';

const NAV = [
  { href: '/#fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#comment-ca-marche', label: 'Comment ça marche' },
  { href: '/#tarifs', label: 'Tarifs' },
  { href: '/#faq', label: 'FAQ' },
];

/** Public site header (landing + legal pages). No client JS: the mobile
 *  menu is a native <details> disclosure. */
export const SiteHeader: React.FC = () => (
  <header className="sticky top-0 z-40 px-4 pt-3">
    <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-5 py-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-[#E5E9F0] shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
      <Link href="/" aria-label="Juula Store — accueil" className="shrink-0">
        <JuulaLogo height={30} />
      </Link>

      <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="hidden md:flex items-center gap-2">
        <Link
          href="/login"
          className="px-4 py-2 rounded-xl text-sm font-bold text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
        >
          Se connecter
        </Link>
        <Link
          href="/signup"
          className="px-4 py-2 rounded-xl bg-[#1E60F8] hover:bg-[#164ED0] text-white text-sm font-black shadow-[0_2px_10px_rgba(30,96,248,0.3)] transition-colors"
        >
          Créer ma boutique
        </Link>
      </div>

      <details className="md:hidden relative group">
        <summary
          aria-label="Ouvrir le menu"
          className="list-none w-11 h-11 rounded-xl flex items-center justify-center text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer [&::-webkit-details-marker]:hidden"
        >
          <Menu className="w-5 h-5" />
        </summary>
        <div className="absolute right-0 mt-2 w-64 p-2 rounded-2xl bg-white border border-[#E5E9F0] shadow-xl flex flex-col">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-3 rounded-xl text-sm font-semibold text-[#334155] hover:bg-[#F1F5F9]"
            >
              {item.label}
            </Link>
          ))}
          <div className="h-px bg-[#F1F5F9] my-1" />
          <Link
            href="/login"
            className="px-3 py-3 rounded-xl text-sm font-bold text-[#0F172A] hover:bg-[#F1F5F9]"
          >
            Se connecter
          </Link>
          <Link
            href="/signup"
            className="mt-1 px-3 py-3 rounded-xl bg-[#1E60F8] text-white text-sm font-black text-center"
          >
            Créer ma boutique
          </Link>
        </div>
      </details>
    </div>
  </header>
);
