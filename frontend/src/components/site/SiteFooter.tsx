import React from 'react';
import Link from 'next/link';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import { ShieldAlert } from 'lucide-react';

export const SiteFooter: React.FC = () => (
  <footer className="bg-white border-t border-[#E5E9F0]">
    <div className="max-w-6xl mx-auto px-4 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-3 lg:col-span-2">
        <JuulaLogo height={32} />
        <p className="text-sm text-[#475569] max-w-sm leading-relaxed">
          La plateforme des marchands africains : pages produits qui convertissent, commandes
          WhatsApp, paiement à la livraison et Mobile Money.
        </p>
      </div>

      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A] mb-3">Produit</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/#fonctionnalites" className="text-[#475569] hover:text-[#1E60F8]">
              Fonctionnalités
            </Link>
          </li>
          <li>
            <Link href="/boutiques" className="text-[#475569] hover:text-[#1E60F8]">
              Boutiques
            </Link>
          </li>
          <li>
            <Link href="/#faq" className="text-[#475569] hover:text-[#1E60F8]">
              Questions fréquentes
            </Link>
          </li>
          <li>
            <Link href="/signup" className="text-[#475569] hover:text-[#1E60F8]">
              Créer ma boutique
            </Link>
          </li>
        </ul>
      </div>

      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-[#0F172A] mb-3">
          Légal & aide
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/conditions" className="text-[#475569] hover:text-[#1E60F8]">
              Conditions d&apos;utilisation
            </Link>
          </li>
          <li>
            <Link href="/confidentialite" className="text-[#475569] hover:text-[#1E60F8]">
              Politique de confidentialité
            </Link>
          </li>
        </ul>
      </div>
    </div>
    <div className="border-t border-[#F1F5F9]">
      <p className="max-w-6xl mx-auto px-4 pt-5 text-xs text-[#475569]">
        <ShieldAlert
          className="inline w-3.5 h-3.5 -mt-0.5 mr-1 text-[#B45309]"
          aria-hidden="true"
        />
        Les transactions hors plateforme ne sont couvertes par aucune garantie.{' '}
        <Link href="/conditions#hors-plateforme" className="font-semibold hover:text-[#1E60F8]">
          En savoir plus
        </Link>
      </p>
      <p className="max-w-6xl mx-auto px-4 py-5 text-xs text-[#64748B]">
        © {new Date().getFullYear()} Juula
      </p>
    </div>
  </footer>
);
