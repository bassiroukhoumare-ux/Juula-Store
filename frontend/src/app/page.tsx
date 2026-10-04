// Public landing page (/). The merchant dashboard lives at /dashboard.
// Visual direction: airy light canvas, floating pill nav, big centred
// headlines, white rounded cards with soft shadows, bento grid, tools fan,
// oversized brand wordmark in the footer.
import type { Metadata } from 'next';
import Link from 'next/link';
import { Urbanist } from 'next/font/google';
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Copy,
  Globe,
  Plug,
  Rocket,
  Share2,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { SiteHeader } from '@/components/site/SiteHeader';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import { HeroNetwork } from '@/components/landing/HeroNetwork';
import { IntegrationsFan } from '@/components/landing/IntegrationsFan';
import {
  FacebookIcon,
  MastercardIcon,
  OrangeMoneyTile,
  TikTokIcon,
  VisaWordmark,
  WaveTile,
  WhatsAppIcon,
} from '@/components/landing/BrandIcons';
import { JUULA_PLANS } from '@/lib/store/plans';
import { formatNumber } from '@/lib/orderUtils';
import { LEGAL } from '@/lib/legal';

const display = Urbanist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Juula — Votre boutique pro en un seul lien',
  description:
    'Créez votre page de vente pro, partagez-la et encaissez par Wave, Orange Money, carte bancaire ou à la livraison. Pixels Facebook & TikTok inclus.',
  ...(process.env.APP_URL ? { metadataBase: new URL(process.env.APP_URL) } : {}),
  openGraph: {
    type: 'website',
    title: 'Juula — Votre boutique pro en un seul lien',
    description:
      'Page de vente pro, paiement Wave, Orange Money, carte ou à la livraison, pixels Facebook & TikTok.',
    images: [{ url: '/email/juula-logo.png' }],
  },
};

const FAQ = [
  {
    q: 'Combien ça coûte ?',
    a: `Le Plan Gratuit ne coûte rien : vous ne payez des frais que sur vos ventes en ligne. Le Plan Juula Pro est à ${formatNumber(JUULA_PLANS.PRO.priceMonthly)} FCFA par mois, sans commission Juula.`,
  },
  {
    q: 'Comment mes clients paient-ils ?',
    a: 'Par Wave, Orange Money ou carte Visa / Mastercard, en un clic. Avec le Plan Pro, ils peuvent aussi payer en espèces à la livraison.',
  },
  {
    q: 'Quand est-ce que je reçois mon argent ?',
    a: 'Les paiements en ligne deviennent retirables 72 h après chaque paiement, directement vers votre compte Wave ou Orange Money.',
  },
  {
    q: 'Ai-je besoin d’un site ou d’un développeur ?',
    a: 'Non. Connectez-vous avec Google, créez votre page en 2 minutes et partagez le lien.',
  },
];

function Eyebrow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <span className="w-12 h-12 rounded-2xl bg-white border border-[#ECEFF4] shadow-[0_10px_24px_-14px_rgba(32,29,29,0.35)] flex items-center justify-center text-[#235BF7]">
        {icon}
      </span>
      <span className="sr-only">{children}</span>
    </div>
  );
}

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-[28px] bg-white border border-[#ECEFF4] shadow-[0_1px_2px_rgba(16,24,40,0.03)] overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

function CardText({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-6 pb-6 pt-2">
      <h3 className="text-xl font-bold tracking-tight text-[#201D1D]">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-[#7A808C]">{text}</p>
    </div>
  );
}

export default function LandingPage() {
  const free = JUULA_PLANS.FREE;
  const pro = JUULA_PLANS.PRO;
  const year = new Date().getFullYear();

  return (
    <div
      className={`${display.className} min-h-screen bg-[#EDEFF3] text-[#201D1D] overflow-x-hidden`}
    >
      <SiteHeader />

      <main className="px-3 sm:px-5 pb-5 space-y-5">
        {/* ─────────────────────────── HERO ─────────────────────────── */}
        <section className="relative rounded-[36px] bg-[#F6F7F9] border border-white pt-10 sm:pt-14 pb-16 sm:pb-24 px-4 overflow-hidden">
          <div className="hidden md:block">
            <HeroNetwork />
          </div>
          {/* Mobile: compact tool row */}
          <div
            className="md:hidden flex items-center justify-center gap-3 pt-2 pb-6"
            aria-hidden="true"
          >
            <WaveTile size="sm" />
            <OrangeMoneyTile size="sm" />
            <span className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-[#4D7DFF] to-[#1F4FE0] flex items-center justify-center shadow-[0_18px_36px_-16px_rgba(35,91,247,0.7)]">
              <ShoppingBag className="w-7 h-7 text-white" />
            </span>
            <span className="w-10 h-10 rounded-2xl bg-white border border-[#ECEFF4] flex items-center justify-center">
              <FacebookIcon className="w-6 h-6" />
            </span>
            <span className="w-10 h-10 rounded-2xl bg-white border border-[#ECEFF4] flex items-center justify-center">
              <TikTokIcon className="w-5 h-5" />
            </span>
          </div>

          <div className="relative text-center max-w-3xl mx-auto md:-mt-4">
            <h1 className="text-[44px] leading-[1.02] sm:text-6xl lg:text-[76px] font-extrabold tracking-[-0.035em]">
              Votre boutique pro,
              <br />
              en un seul lien.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-[#7A808C] max-w-xl mx-auto leading-relaxed">
              Une page de vente qui inspire confiance. Vos clients paient par Wave, Orange Money,
              carte bancaire — ou à la livraison.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-gradient-to-b from-[#3D6CFF] to-[#235BF7] text-white font-bold shadow-[0_14px_30px_-12px_rgba(35,91,247,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-110 transition"
              >
                Créer ma boutique gratuitement <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#tarifs"
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 rounded-2xl bg-white border border-[#E3E7EE] font-bold hover:bg-[#FAFBFC] transition"
              >
                Voir les tarifs
              </Link>
            </div>
          </div>
        </section>

        {/* ─────────────────────── 3 STEPS ─────────────────────── */}
        <section
          id="comment-ca-marche"
          className="scroll-mt-28 rounded-[36px] bg-white px-4 py-16 sm:py-20"
        >
          <div className="max-w-5xl mx-auto">
            <Eyebrow icon={<Rocket className="w-5 h-5" />}>Comment ça marche</Eyebrow>
            <h2 className="mt-5 text-center text-4xl sm:text-5xl font-extrabold tracking-[-0.03em]">
              Créez. Partagez. Encaissez.
            </h2>
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: <Sparkles className="w-5 h-5" />,
                  t: 'Créez votre page',
                  d: 'Photos, vidéo, prix et avis clients — en 2 minutes.',
                },
                {
                  icon: <Share2 className="w-5 h-5" />,
                  t: 'Partagez le lien',
                  d: 'Sur Facebook, TikTok, Instagram et WhatsApp.',
                },
                {
                  icon: <Wallet className="w-5 h-5" />,
                  t: 'Encaissez',
                  d: 'Paiement en un clic ou à la livraison.',
                },
              ].map((s, i) => (
                <li key={s.t} className="relative p-6 rounded-[24px] bg-[#F6F7F9]">
                  <span className="absolute top-5 right-6 text-6xl font-extrabold text-[#E7EAF0] select-none">
                    {i + 1}
                  </span>
                  <span className="w-11 h-11 rounded-2xl bg-white text-[#235BF7] flex items-center justify-center shadow-[0_8px_18px_-12px_rgba(32,29,29,0.4)]">
                    {s.icon}
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{s.t}</h3>
                  <p className="mt-1 text-[15px] text-[#7A808C]">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─────────────────────── BENTO ─────────────────────── */}
        <section
          id="fonctionnalites"
          className="scroll-mt-28 rounded-[36px] bg-[#F6F7F9] px-4 py-16 sm:py-20"
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-center text-4xl sm:text-6xl font-extrabold tracking-[-0.035em]">
              Pensé pour vendre
            </h2>
            <p className="mt-3 text-center text-[#7A808C] text-base sm:text-lg max-w-xl mx-auto">
              Tout ce qu’il faut pour vendre en ligne en Afrique — rien de compliqué.
            </p>

            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {/* Page pro */}
              <Card>
                <div className="h-60 relative flex items-end justify-center bg-gradient-to-b from-[#F6F7F9] to-white">
                  <div className="w-44 h-52 rounded-t-[26px] border-[6px] border-b-0 border-[#201D1D] bg-white overflow-hidden translate-y-1">
                    <div className="h-20 bg-gradient-to-br from-[#4D7DFF] to-[#9DB6FF]" />
                    <div className="p-3 space-y-1.5">
                      <div className="h-2.5 w-28 rounded-full bg-[#201D1D]" />
                      <div className="h-2 w-16 rounded-full bg-[#235BF7]" />
                      <div className="h-2 w-24 rounded-full bg-[#E6E9EF]" />
                      <div className="mt-2 h-7 rounded-lg bg-[#201D1D]" />
                    </div>
                  </div>
                </div>
                <CardText
                  title="Une page pro"
                  text="Photos, vidéo, avis et offres. Prête à partager en 2 minutes."
                />
              </Card>

              {/* Paiements */}
              <Card>
                <div className="h-60 relative flex items-center justify-center">
                  <div className="absolute w-56 h-56 rounded-full border border-[#EEF0F4]" />
                  <div className="absolute w-36 h-36 rounded-full border border-[#EEF0F4]" />
                  <div className="relative w-64 p-3 rounded-2xl bg-white border border-[#ECEFF4] shadow-[0_18px_40px_-22px_rgba(32,29,29,0.35)] space-y-2">
                    {[
                      { el: <WaveTile size="sm" />, t: 'Wave' },
                      { el: <OrangeMoneyTile size="sm" />, t: 'Orange Money' },
                      {
                        el: (
                          <span className="w-10 h-10 rounded-2xl bg-[#F6F7F9] flex items-center justify-center">
                            <MastercardIcon className="w-7 h-5" />
                          </span>
                        ),
                        t: 'Carte bancaire',
                      },
                    ].map((m, i) => (
                      <div
                        key={m.t}
                        className={`flex items-center gap-3 p-1.5 rounded-xl ${i === 0 ? 'bg-[#EEF3FF]' : ''}`}
                      >
                        {m.el}
                        <span className="text-sm font-bold flex-1">{m.t}</span>
                        {i === 0 && (
                          <span className="w-5 h-5 rounded-full bg-[#235BF7] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <CardText
                  title="Paiement en un clic"
                  text="Wave, Orange Money, Visa, Mastercard — ou en espèces à la livraison."
                />
              </Card>

              {/* Pixels */}
              <Card>
                <div className="h-60 relative flex items-center justify-center gap-4">
                  {[
                    { icon: <FacebookIcon className="w-8 h-8" />, e: 'Purchase' },
                    { icon: <TikTokIcon className="w-7 h-7" />, e: 'PlaceAnOrder' },
                  ].map((p, i) => (
                    <div
                      key={p.e}
                      className={`w-32 rounded-2xl bg-white border border-[#ECEFF4] p-3 shadow-[0_16px_34px_-22px_rgba(32,29,29,0.4)] ${i ? 'translate-y-6' : '-translate-y-2'}`}
                    >
                      <span className="w-12 h-12 rounded-2xl bg-[#F6F7F9] flex items-center justify-center">
                        {p.icon}
                      </span>
                      <p className="mt-3 text-[11px] font-bold text-[#16A34A] flex items-center gap-1">
                        <Check className="w-3 h-3" /> {p.e}
                      </p>
                      <div className="mt-1.5 h-1.5 w-16 rounded-full bg-[#E6E9EF]" />
                    </div>
                  ))}
                </div>
                <CardText
                  title="Pixels Facebook & TikTok"
                  text="Collez votre identifiant : vos pubs mesurent visites et ventes."
                />
              </Card>

              {/* Ventes (wide) */}
              <Card className="lg:col-span-2">
                <div className="h-64 relative px-6 pt-8 flex items-end gap-3 sm:gap-4 bg-gradient-to-b from-[#F6F7F9] to-white">
                  {[38, 54, 46, 72, 60, 88, 66, 94].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                      {i === 7 && (
                        <span className="mb-2 text-[11px] font-bold text-white bg-[#201D1D] px-2 py-1 rounded-lg whitespace-nowrap">
                          +12 commandes
                        </span>
                      )}
                      <div
                        className={`w-full max-w-[44px] rounded-t-xl ${i === 7 ? 'bg-gradient-to-t from-[#235BF7] to-[#7FA2FF]' : 'bg-[#E3E8F1]'}`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-4 px-6 pb-6 pt-4">
                  <span className="w-11 h-11 rounded-2xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">Vos ventes en temps réel</h3>
                    <p className="mt-1.5 text-[15px] text-[#7A808C]">
                      Chaque commande arrive dans votre tableau de bord et par e-mail. Retraits vers
                      Wave ou Orange Money.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Lien boutique */}
              <Card>
                <div className="h-64 relative flex items-center justify-center">
                  <div className="absolute w-52 h-52 rounded-full border border-dashed border-[#DCE2EC]" />
                  <div className="relative w-64 p-3 rounded-2xl bg-white border border-[#ECEFF4] shadow-[0_18px_40px_-22px_rgba(32,29,29,0.35)]">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F6F7F9]">
                      <Globe className="w-4 h-4 text-[#235BF7] shrink-0" />
                      <span className="text-sm font-bold truncate">
                        awa-shop<span className="text-[#235BF7]">.juula.store</span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#201D1D] text-white text-sm font-bold">
                      <Copy className="w-4 h-4" /> Lien copié
                    </div>
                  </div>
                </div>
                <CardText
                  title="Votre adresse à vous"
                  text="Une boutique à votre nom, prête pour vos bios et vos publicités."
                />
              </Card>
            </div>
          </div>
        </section>

        {/* ─────────────────────── TOOLS ─────────────────────── */}
        <section className="rounded-[36px] bg-[#F6F7F9] px-3 sm:px-6 py-6 sm:py-10">
          <div className="max-w-5xl mx-auto rounded-[32px] bg-white border border-[#ECEFF4] px-4 py-14 sm:py-16 overflow-hidden">
            <Eyebrow icon={<Plug className="w-5 h-5" />}>Intégrations</Eyebrow>
            <h2 className="mt-5 text-center text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] max-w-2xl mx-auto">
              Connecté à vos outils en quelques secondes
            </h2>
            <div className="mt-10">
              <IntegrationsFan />
            </div>
          </div>
        </section>

        {/* ─────────────────────── PRICING ─────────────────────── */}
        <section id="tarifs" className="scroll-mt-28 rounded-[36px] bg-white px-4 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-center text-4xl sm:text-6xl font-extrabold tracking-[-0.035em]">
              Simple et transparent
            </h2>
            <p className="mt-3 text-center text-[#7A808C] text-base sm:text-lg">
              Commencez gratuitement. Passez Pro quand vous êtes prêt.
            </p>

            <div className="mt-12 grid gap-4 md:grid-cols-2 items-stretch">
              {[free, pro].map((plan) => {
                const isPro = plan.id === 'PRO';
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-[28px] p-7 flex flex-col ${
                      isPro
                        ? 'bg-[#201D1D] text-white shadow-[0_30px_60px_-30px_rgba(35,91,247,0.6)]'
                        : 'bg-[#F6F7F9] border border-[#ECEFF4]'
                    }`}
                  >
                    {isPro && (
                      <span className="absolute top-6 right-6 text-[11px] font-bold uppercase tracking-wider bg-[#235BF7] text-white px-3 py-1 rounded-full">
                        Recommandé
                      </span>
                    )}
                    <p className="text-lg font-bold">{plan.name}</p>
                    <p className={`mt-1 text-sm ${isPro ? 'text-white/65' : 'text-[#7A808C]'}`}>
                      {plan.tagline}
                    </p>
                    <p className="mt-6 text-5xl font-extrabold tracking-tight">
                      {formatNumber(plan.priceMonthly)}
                      <span
                        className={`text-base font-semibold ${isPro ? 'text-white/65' : 'text-[#7A808C]'}`}
                      >
                        {' '}
                        FCFA / mois
                      </span>
                    </p>
                    <ul
                      className={`mt-6 space-y-2.5 text-[15px] flex-1 ${isPro ? 'text-white/90' : 'text-[#3F4654]'}`}
                    >
                      {plan.features.slice(0, 5).map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              isPro
                                ? 'bg-[#235BF7] text-white'
                                : 'bg-white text-[#235BF7] border border-[#E3E7EE]'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/signup"
                      className={`mt-8 py-3.5 rounded-2xl text-center font-bold transition ${
                        isPro
                          ? 'bg-gradient-to-b from-[#3D6CFF] to-[#235BF7] text-white hover:brightness-110'
                          : 'bg-white border border-[#E3E7EE] hover:bg-[#FAFBFC]'
                      }`}
                    >
                      {isPro ? 'Passer à Juula Pro' : 'Commencer gratuitement'}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─────────────────────── FAQ ─────────────────────── */}
        <section id="faq" className="scroll-mt-28 rounded-[36px] bg-[#F6F7F9] px-4 py-16 sm:py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-center text-4xl sm:text-5xl font-extrabold tracking-[-0.03em]">
              Questions fréquentes
            </h2>
            <div className="mt-10 space-y-3">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl bg-white border border-[#ECEFF4] p-5"
                >
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-bold text-lg [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="w-5 h-5 text-[#7A808C] shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#7A808C]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────── FOOTER ─────────────────────── */}
        <footer className="rounded-[36px] bg-[#F6F7F9] px-3 sm:px-6 pt-6 sm:pt-10 pb-3 sm:pb-6">
          <div className="max-w-6xl mx-auto rounded-[32px] bg-white border border-[#ECEFF4] overflow-hidden">
            <div className="px-6 sm:px-12 pt-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_auto]">
              <div className="space-y-5">
                <p className="text-xl font-bold tracking-tight max-w-xs leading-snug">
                  Juula transforme un simple lien en boutique pro — paiements inclus.
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#201D1D] text-white text-sm font-bold hover:bg-black transition"
                >
                  Créer ma boutique <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <nav aria-label="Produit" className="space-y-2.5 text-[15px]">
                <p className="font-bold">Produit</p>
                <Link href="#fonctionnalites" className="block text-[#7A808C] hover:text-[#201D1D]">
                  Fonctionnalités
                </Link>
                <Link href="#tarifs" className="block text-[#7A808C] hover:text-[#201D1D]">
                  Tarifs
                </Link>
                <Link href="#faq" className="block text-[#7A808C] hover:text-[#201D1D]">
                  FAQ
                </Link>
                <Link href="/login" className="block text-[#7A808C] hover:text-[#201D1D]">
                  Se connecter
                </Link>
              </nav>
              <nav aria-label="Légal" className="space-y-2.5 text-[15px]">
                <p className="font-bold">Légal</p>
                <Link href="/conditions" className="block text-[#7A808C] hover:text-[#201D1D]">
                  Conditions d’utilisation
                </Link>
                <Link href="/confidentialite" className="block text-[#7A808C] hover:text-[#201D1D]">
                  Confidentialité
                </Link>
              </nav>
              <div className="space-y-3">
                <p className="font-bold text-[15px]">Une question ?</p>
                <a
                  href={LEGAL.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Support WhatsApp"
                  className="w-12 h-12 rounded-2xl bg-[#F6F7F9] hover:bg-[#ECEFF4] flex items-center justify-center transition"
                >
                  <WhatsAppIcon className="w-6 h-6" />
                </a>
              </div>
            </div>

            {/* Oversized wordmark, blurred towards the right */}
            <div className="relative mt-10 sm:mt-14 select-none" aria-hidden="true">
              <p className="px-4 text-[30vw] md:text-[19rem] leading-[0.78] font-extrabold tracking-[-0.06em] bg-gradient-to-r from-[#235BF7] via-[#4D7DFF] to-[#9DB6FF] bg-clip-text text-transparent translate-y-[12%]">
                Juula
              </p>
              <div
                className="absolute inset-0 backdrop-blur-[10px]"
                style={{
                  maskImage: 'linear-gradient(to right, transparent 45%, black 85%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 45%, black 85%)',
                }}
              />
            </div>
          </div>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 px-4 pt-5 text-xs text-[#7A808C]">
            <span className="flex items-center gap-2">
              <JuulaLogo height={18} /> © {year} {LEGAL.companyName || 'Juula Store'}
            </span>
            <span className="flex items-center gap-3">
              <VisaWordmark className="text-sm" />
              <MastercardIcon className="w-7 h-5" />
              <span className="font-semibold">Wave · Orange Money</span>
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
