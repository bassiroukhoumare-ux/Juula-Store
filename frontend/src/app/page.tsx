// Public landing page (/). The merchant dashboard lives at /dashboard.
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Check,
  ChevronDown,
  Clock,
  Link2,
  MessageCircle,
  Mic,
  PackageCheck,
  Radar,
  Rocket,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Truck,
  Wallet,
  Zap,
} from 'lucide-react';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { LEAD_PACKS, WELCOME_CREDITS } from '@/lib/store/plans';
import { formatNumber } from '@/lib/orderUtils';

export const metadata: Metadata = {
  title: 'Juula Store — Vendez en ligne avec paiement à la livraison et Mobile Money',
  description:
    'Créez une page produit qui convertit, partagez son lien sur Facebook, TikTok et WhatsApp, recevez vos commandes et encaissez par Wave, Orange Money ou à la livraison.',
  ...(process.env.APP_URL ? { metadataBase: new URL(process.env.APP_URL) } : {}),
  openGraph: {
    type: 'website',
    title: 'Juula Store — La boutique en ligne des marchands africains',
    description:
      'Pages produits, commandes WhatsApp, paiement à la livraison, Wave et Orange Money. Lancez votre boutique en 2 minutes.',
    images: [{ url: '/logo-juula.svg' }],
  },
};

const PAYMENT_BADGES = [
  'Paiement à la livraison',
  'Wave',
  'Orange Money',
  'Carte bancaire',
  'Pixel Meta',
  'Pixel TikTok',
];

const STEPS = [
  {
    icon: Rocket,
    title: 'Créez votre page produit',
    text: 'Photos, prix, avantages, avis clients et offres par quantité : votre page de vente est prête en 2 minutes, sans compétence technique.',
  },
  {
    icon: Share2,
    title: 'Partagez votre lien',
    text: 'Chaque produit a son lien unique, avec un bel aperçu sur Facebook, TikTok, Instagram et WhatsApp. Copiez, collez, vendez.',
  },
  {
    icon: PackageCheck,
    title: 'Recevez et encaissez',
    text: 'Les commandes arrivent dans votre tableau de bord. Vos clients paient à la livraison ou en ligne par Wave et Orange Money.',
  },
];

const FEATURES = [
  {
    icon: Smartphone,
    title: 'Pages produits qui convertissent',
    text: 'Galerie photo et vidéo, badges d’urgence, preuves clients en photo, vidéo ou note vocale, avis vérifiés.',
  },
  {
    icon: Truck,
    title: 'Paiement à la livraison',
    text: 'Le mode préféré de vos clients. Ils commandent en un formulaire, vous confirmez sur WhatsApp et vous livrez.',
  },
  {
    icon: Wallet,
    title: 'Wave & Orange Money intégrés',
    text: 'Paiement en ligne sécurisé, portefeuille marchand et retraits vers votre compte Mobile Money protégés par code PIN.',
  },
  {
    icon: BarChart3,
    title: 'Toutes vos commandes au même endroit',
    text: 'Tableau Kanban — nouvelles, confirmées, livrées — chiffre d’affaires et statistiques mis à jour en temps réel.',
  },
  {
    icon: Radar,
    title: 'Pixels Meta & TikTok',
    text: 'Collez vos identifiants de pixel : visites, ajouts et achats remontent automatiquement pour optimiser vos pubs.',
  },
  {
    icon: Mic,
    title: 'Adresse par note vocale',
    text: 'Vos clients qui préfèrent parler peuvent décrire leur adresse de livraison par message vocal, directement sur la page.',
  },
  {
    icon: Sparkles,
    title: 'Offres par quantité',
    text: 'Pack Duo, Pack Famille : augmentez votre panier moyen avec des remises automatiques par palier.',
  },
  {
    icon: Link2,
    title: 'Un lien pour chaque produit',
    text: 'Des liens permanents et propres, prêts pour vos bios, vos stories et vos campagnes sponsorisées.',
  },
];

const FAQ = [
  {
    q: 'Combien coûte Juula Store ?',
    a: `L’inscription est gratuite et vous recevez ${WELCOME_CREDITS} crédits leads offerts. Vous rechargez ensuite selon vos besoins, sans abonnement : un crédit correspond à une commande reçue.`,
  },
  {
    q: 'Comment mes clients paient-ils ?',
    a: 'À la livraison en espèces, ou en ligne par Wave, Orange Money ou carte bancaire. Vous choisissez les modes de paiement proposés sur chaque page.',
  },
  {
    q: 'Quand puis-je retirer l’argent des paiements en ligne ?',
    a: 'Notre partenaire de paiement règle les fonds 72 heures après chaque paiement. Le montant devient alors retirable vers votre compte Wave ou Orange Money, à partir de 1 000 FCFA, avec votre code PIN.',
  },
  {
    q: 'Ai-je besoin d’un site web ou d’un développeur ?',
    a: 'Non. Vous vous connectez avec Google, vous créez votre page produit dans l’éditeur et vous partagez le lien. C’est tout.',
  },
  {
    q: 'Puis-je suivre mes publicités Facebook et TikTok ?',
    a: 'Oui. Ajoutez l’identifiant de votre Pixel Meta et de votre Pixel TikTok dans les Paramètres : les événements de visite, de formulaire et de commande sont envoyés automatiquement.',
  },
  {
    q: 'Mes données et celles de mes clients sont-elles protégées ?',
    a: 'Les échanges sont chiffrés, chaque paiement est vérifié auprès du prestataire avant d’être crédité et votre code PIN est stocké de façon chiffrée. Les détails sont dans notre politique de confidentialité.',
  },
  {
    q: 'Puis-je vendre plusieurs produits ?',
    a: 'Oui, vous créez autant de pages produits que nécessaire, chacune avec son propre lien, et vous les publiez ou désactivez quand vous voulez.',
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1E60F8] bg-[#EFF4FF] px-3 py-1 rounded-full">
      {children}
    </span>
  );
}

/** Stylised product page + dashboard notifications (pure HTML, no images). */
function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]" aria-hidden="true">
      <div className="absolute -inset-8 bg-gradient-to-tr from-[#1E60F8]/20 via-[#60A5FA]/10 to-transparent blur-3xl rounded-full" />

      <div className="relative mx-auto w-[290px] sm:w-[310px] rounded-[2.6rem] border-[9px] border-[#0F172A] bg-white shadow-[0_30px_60px_-20px_rgba(15,23,42,0.45)] overflow-hidden">
        <div className="h-44 bg-gradient-to-br from-[#1E60F8] via-[#3B82F6] to-[#93C5FD] relative">
          <span className="absolute top-3 left-3 text-[10px] font-black text-white bg-[#EF4444] px-2 py-0.5 rounded-full">
            -38% aujourd&apos;hui
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-3xl bg-white/25 backdrop-blur-sm border border-white/40 flex items-center justify-center">
              <PackageCheck className="w-11 h-11 text-white" />
            </div>
          </div>
        </div>
        <div className="p-4 space-y-2.5">
          <div className="flex items-center gap-1 text-[#F59E0B]">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="w-3 h-3 fill-current" />
            ))}
            <span className="text-[10px] text-[#64748B] font-semibold ml-1">
              Avis clients vérifiés
            </span>
          </div>
          <p className="text-sm font-black text-[#0F172A] leading-tight">
            Montre Élégance — Édition Dakar
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-[#1E60F8]">15 000 F</span>
            <span className="text-xs text-[#94A3B8] line-through">24 000 F</span>
          </div>
          <div className="space-y-1">
            {['Livraison express à Dakar', 'Garantie satisfait ou remboursé'].map((t) => (
              <p key={t} className="flex items-center gap-1.5 text-[11px] text-[#334155]">
                <Check className="w-3 h-3 text-[#10B981]" /> {t}
              </p>
            ))}
          </div>
          <div className="w-full py-2.5 rounded-xl bg-[#1E60F8] text-white text-xs font-black text-center">
            Commander — paiement à la livraison
          </div>
          <div className="w-full py-2 rounded-xl bg-[#F1F5F9] text-[#0F172A] text-[11px] font-bold text-center">
            Payer avec Wave · Orange Money
          </div>
        </div>
      </div>

      <div className="absolute -left-2 sm:-left-10 top-16 w-52 p-3 rounded-2xl bg-white border border-[#E5E9F0] shadow-xl motion-safe:animate-[float_6s_ease-in-out_infinite]">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center">
            <BadgeCheck className="w-4 h-4" />
          </span>
          <div>
            <p className="text-[11px] font-black text-[#0F172A]">Nouvelle commande</p>
            <p className="text-[10px] text-[#64748B] font-mono">CMD-JLA-000124 · 32 000 F</p>
          </div>
        </div>
      </div>

      <div className="absolute -right-2 sm:-right-8 -bottom-4 w-48 p-3 rounded-2xl bg-white border border-[#E5E9F0] shadow-xl motion-safe:animate-[float_7s_ease-in-out_infinite_1s]">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-[#EFF4FF] text-[#1E60F8] flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </span>
          <div>
            <p className="text-[11px] font-black text-[#0F172A]">Retrait Wave envoyé</p>
            <p className="text-[10px] text-[#64748B]">50 000 FCFA</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [discovery, growth, scaler] = LEAD_PACKS;

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#0F172A] overflow-x-hidden">
      <SiteHeader />

      <main>
        {/* ───────────────────────── HERO ───────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 pt-12 sm:pt-20 pb-16 grid gap-14 lg:grid-cols-2 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <Eyebrow>
              <Zap className="w-3.5 h-3.5" /> Pour les marchands du Sénégal et d&apos;Afrique de
              l&apos;Ouest
            </Eyebrow>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-black tracking-tight leading-[1.05]">
              Vendez plus avec une page produit{' '}
              <span className="text-[#1E60F8]">qui convertit.</span>
            </h1>
            <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-xl mx-auto lg:mx-0">
              Créez votre page de vente, partagez son lien sur Facebook, TikTok et WhatsApp, et
              encaissez vos commandes à la livraison ou par Wave et Orange Money. Tout depuis un
              seul tableau de bord.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#1E60F8] hover:bg-[#164ED0] text-white text-sm font-black shadow-[0_6px_20px_rgba(30,96,248,0.35)] transition-colors"
              >
                Créer ma boutique gratuitement <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#tarifs"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-sm font-bold text-[#0F172A] transition-colors"
              >
                Voir les tarifs
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start text-sm text-[#475569]">
              {[
                `${WELCOME_CREDITS} crédits offerts`,
                'Sans abonnement',
                'Connexion avec Google',
              ].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-[#10B981]" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <HeroMockup />
        </section>

        {/* ───────────────────── PAYMENT BADGES ───────────────────── */}
        <section
          aria-label="Moyens de paiement et intégrations"
          className="border-y border-[#E5E9F0] bg-white"
        >
          <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-center justify-center gap-2.5">
            {PAYMENT_BADGES.map((b) => (
              <span
                key={b}
                className="px-3.5 py-1.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold text-[#334155]"
              >
                {b}
              </span>
            ))}
          </div>
        </section>

        {/* ───────────────────── HOW IT WORKS ───────────────────── */}
        <section id="comment-ca-marche" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-20">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Eyebrow>Comment ça marche</Eyebrow>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              De l&apos;idée à la vente en 3 étapes
            </h2>
            <p className="text-[#475569]">
              Pas de site à construire, pas de développeur à payer. Juula Store s&apos;occupe de la
              technique, vous vous occupez de vendre.
            </p>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="relative p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-xs"
              >
                <span className="absolute top-5 right-6 text-5xl font-black text-[#EFF4FF] select-none">
                  {i + 1}
                </span>
                <span className="w-12 h-12 rounded-2xl bg-[#1E60F8] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(30,96,248,0.3)]">
                  <step.icon className="w-6 h-6" />
                </span>
                <h3 className="mt-5 text-lg font-black">{step.title}</h3>
                <p className="mt-2 text-sm text-[#475569] leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 text-sm font-black text-[#1E60F8] hover:underline"
            >
              Créer ma première page produit <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ───────────────────── FEATURES ───────────────────── */}
        <section id="fonctionnalites" className="scroll-mt-24 bg-white border-y border-[#E5E9F0]">
          <div className="max-w-6xl mx-auto px-4 py-20">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <Eyebrow>Fonctionnalités</Eyebrow>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                Tout ce qu&apos;il faut pour vendre en Afrique
              </h2>
              <p className="text-[#475569]">
                Pensé pour le paiement à la livraison, le Mobile Money et la vente sur les réseaux
                sociaux.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="p-5 rounded-3xl bg-[#F8FAFC] border border-[#E5E9F0] hover:border-[#1E60F8]/40 hover:bg-white transition-colors"
                >
                  <span className="w-10 h-10 rounded-xl bg-[#EFF4FF] text-[#1E60F8] flex items-center justify-center">
                    <f.icon className="w-5 h-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-black">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-[#475569] leading-relaxed">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────── DASHBOARD / WALLET ───────────────────── */}
        <section className="max-w-6xl mx-auto px-4 py-20 grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-5">
            <Eyebrow>Votre argent, en sécurité</Eyebrow>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Un portefeuille clair, des retraits vers Wave et Orange Money
            </h2>
            <p className="text-[#475569] leading-relaxed">
              Chaque paiement en ligne est vérifié auprès de notre partenaire de paiement avant
              d&apos;être crédité. Vous voyez ce qui est disponible, ce qui est en attente, et vous
              retirez quand vous voulez.
            </p>
            <ul className="space-y-3">
              {[
                {
                  icon: Clock,
                  t: 'Fonds disponibles 72 h après chaque paiement, date de déblocage affichée',
                },
                { icon: ShieldCheck, t: 'Retraits protégés par votre code PIN à 6 chiffres' },
                {
                  icon: Banknote,
                  t: 'Paiement à la livraison suivi séparément de vos encaissements en ligne',
                },
              ].map(({ icon: Icon, t }) => (
                <li key={t} className="flex items-start gap-3 text-sm text-[#334155]">
                  <span className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="pt-1.5">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E5E9F0] shadow-[0_20px_50px_-25px_rgba(15,23,42,0.35)] space-y-4"
            aria-hidden="true"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-black">Portefeuille</p>
              <span className="text-[10px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded-lg">
                Exemple
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl border border-[#E5E9F0] border-t-4 border-t-[#10B981]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Disponible
                </p>
                <p className="text-xl font-black mt-1">185 000 F</p>
              </div>
              <div className="p-4 rounded-2xl border border-[#E5E9F0] border-t-4 border-t-[#F59E0B]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  En attente 72 h
                </p>
                <p className="text-xl font-black mt-1">64 000 F</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                {
                  ref: 'CMD-JLA-000124',
                  who: 'Awa · Mermoz',
                  amt: '32 000 F',
                  s: 'Payé · Wave',
                  c: 'text-[#059669] bg-[#ECFDF5]',
                },
                {
                  ref: 'CMD-JLA-000123',
                  who: 'Moussa · Yoff',
                  amt: '15 000 F',
                  s: 'À la livraison',
                  c: 'text-[#0284C7] bg-[#F0F9FF]',
                },
                {
                  ref: 'CMD-JLA-000122',
                  who: 'Fatou · Plateau',
                  amt: '28 500 F',
                  s: 'Payé · OM',
                  c: 'text-[#059669] bg-[#ECFDF5]',
                },
              ].map((o) => (
                <div
                  key={o.ref}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#F8FAFC] border border-[#F1F5F9]"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono font-bold text-[#0F172A]">{o.ref}</p>
                    <p className="text-[11px] text-[#64748B] truncate">{o.who}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black">{o.amt}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.c}`}>
                      {o.s}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────── PRICING ───────────────────── */}
        <section id="tarifs" className="scroll-mt-24 bg-white border-y border-[#E5E9F0]">
          <div className="max-w-6xl mx-auto px-4 py-20">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <Eyebrow>Tarifs</Eyebrow>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                Payez seulement quand vous vendez
              </h2>
              <p className="text-[#475569]">
                Pas d&apos;abonnement. Un crédit lead = une commande reçue. Rechargez par Wave ou
                Orange Money quand vous en avez besoin.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-stretch">
              <div className="p-6 rounded-3xl bg-[#F8FAFC] border border-[#E5E9F0] flex flex-col">
                <p className="text-sm font-black">Démarrage</p>
                <p className="text-xs text-[#64748B] mt-1">Pour lancer votre boutique</p>
                <p className="mt-5 text-4xl font-black">0 F</p>
                <p className="text-sm text-[#475569] mt-1">
                  {WELCOME_CREDITS} crédits leads offerts
                </p>
                <ul className="mt-5 space-y-2 text-sm text-[#334155] flex-1">
                  {[
                    'Pages produits illimitées',
                    'Paiement à la livraison',
                    'Wave & Orange Money',
                    'Pixels Meta & TikTok',
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#10B981] shrink-0" /> {t}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-6 py-3 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#1E60F8] text-sm font-black text-center transition-colors"
                >
                  Commencer gratuitement
                </Link>
              </div>

              {[discovery, growth, scaler].filter(Boolean).map((pack) => {
                const p = pack!;
                return (
                  <div
                    key={p.label}
                    className={`relative p-6 rounded-3xl flex flex-col ${
                      p.popular
                        ? 'bg-[#0F172A] text-white shadow-[0_25px_50px_-20px_rgba(30,96,248,0.55)] ring-2 ring-[#1E60F8]'
                        : 'bg-white border border-[#E5E9F0]'
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-wider bg-[#1E60F8] text-white px-3 py-1 rounded-full">
                        Le plus choisi
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black">{p.label}</p>
                      {p.discount && (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${p.popular ? 'bg-[#10B981] text-white' : 'bg-[#ECFDF5] text-[#059669]'}`}
                        >
                          {p.discount}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${p.popular ? 'text-white/70' : 'text-[#64748B]'}`}>
                      {p.tagline}
                    </p>
                    <p className="mt-5 text-4xl font-black">
                      {formatNumber(p.price)} <span className="text-lg">F</span>
                    </p>
                    <p className={`text-sm mt-1 ${p.popular ? 'text-white/80' : 'text-[#475569]'}`}>
                      {p.credits} crédits leads · {p.costPerLead}
                    </p>
                    <ul
                      className={`mt-5 space-y-2 text-sm flex-1 ${p.popular ? 'text-white/90' : 'text-[#334155]'}`}
                    >
                      {[
                        `${p.credits} commandes reçues`,
                        'Crédits sans date d’expiration',
                        'Paiement Wave ou Orange Money',
                      ].map((t) => (
                        <li key={t} className="flex items-center gap-2">
                          <Check
                            className={`w-4 h-4 shrink-0 ${p.popular ? 'text-[#34D399]' : 'text-[#10B981]'}`}
                          />{' '}
                          {t}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/signup"
                      className={`mt-6 py-3 rounded-2xl text-sm font-black text-center transition-colors ${
                        p.popular
                          ? 'bg-[#1E60F8] hover:bg-[#164ED0] text-white'
                          : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A]'
                      }`}
                    >
                      Choisir ce pack
                    </Link>
                  </div>
                );
              })}
            </div>
            <p className="mt-6 text-center text-xs text-[#64748B]">
              Prix en francs CFA (FCFA). Les paiements en ligne de vos clients sont reversés sur
              votre portefeuille, retirables 72 h après chaque paiement.
            </p>
          </div>
        </section>

        {/* ───────────────────── FAQ ───────────────────── */}
        <section id="faq" className="scroll-mt-24 max-w-3xl mx-auto px-4 py-20">
          <div className="text-center space-y-3">
            <Eyebrow>Questions fréquentes</Eyebrow>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Vous avez des questions ?
            </h2>
          </div>
          <div className="mt-10 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group p-5 rounded-2xl bg-white border border-[#E5E9F0] open:border-[#1E60F8]/40 open:shadow-xs"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-bold text-[#0F172A] [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown className="w-5 h-5 text-[#64748B] shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm text-[#475569] leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-[#475569]">
            Une autre question ?{' '}
            <a
              href="https://wa.me/221774128930"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-[#1E60F8] hover:underline"
            >
              <MessageCircle className="w-4 h-4" /> Écrivez-nous sur WhatsApp
            </a>
          </p>
        </section>

        {/* ───────────────────── FINAL CTA ───────────────────── */}
        <section className="px-4 pb-20">
          <div className="max-w-6xl mx-auto relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0F2B6B] via-[#143E9C] to-[#1E60F8] px-6 py-14 sm:px-14 text-center text-white">
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-2xl"
              aria-hidden="true"
            />
            <h2 className="relative text-3xl sm:text-4xl font-black tracking-tight">
              Votre prochaine vente commence par un lien.
            </h2>
            <p className="relative mt-3 text-white/80 max-w-xl mx-auto">
              Créez votre boutique avec Google en quelques secondes et publiez votre première page
              produit aujourd&apos;hui.
            </p>
            <Link
              href="/signup"
              className="relative mt-8 inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white text-[#1E60F8] text-sm font-black hover:bg-[#EFF4FF] transition-colors"
            >
              Créer ma boutique gratuitement <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
