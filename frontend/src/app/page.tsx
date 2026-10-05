// Public landing page (/). The merchant dashboard lives at /dashboard.
// Visual direction: airy light canvas, floating pill nav, big centred
// headlines, white rounded cards with soft shadows, bento grid, tools fan,
// oversized faded Juula logo in the footer. Motion: staggered scroll
// reveals, self-drawing hero network, live sales chart.
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Copy,
  Globe,
  LayoutTemplate,
  Plug,
  Send,
  Wallet,
  Workflow,
} from 'lucide-react';
import { displayFont as display } from '@/app/fonts';
import { SiteHeader } from '@/components/site/SiteHeader';
import { JuulaLogo } from '@/components/brand/JuulaLogo';
import { HeroNetwork, JuulaMark } from '@/components/landing/HeroNetwork';
import { IntegrationsFan } from '@/components/landing/IntegrationsFan';
import { Reveal } from '@/components/landing/Reveal';
import { SalesChart } from '@/components/landing/SalesChart';
import {
  FacebookIcon,
  MastercardIcon,
  OrangeMoneyTile,
  TikTokIcon,
  VisaWordmark,
  WaveTile,
} from '@/components/landing/BrandIcons';
import { JUULA_PLANS } from '@/lib/store/plans';
import { formatNumber } from '@/lib/orderUtils';
import { LEGAL } from '@/lib/legal';

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

const STEPS = [
  {
    icon: LayoutTemplate,
    t: 'Créez votre page',
    d: 'Photos, vidéo, prix et avis clients — en 2 minutes.',
  },
  { icon: Send, t: 'Partagez le lien', d: 'Sur Facebook, TikTok, Instagram et WhatsApp.' },
  { icon: Wallet, t: 'Encaissez', d: 'Paiement en un clic, ou à la livraison.' },
];

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center">
      <span className="w-12 h-12 rounded-2xl bg-white border border-[#ECEFF4] shadow-[0_10px_24px_-14px_rgba(32,29,29,0.35)] flex items-center justify-center text-[#235BF7]">
        {children}
      </span>
    </div>
  );
}

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`group h-full rounded-[28px] bg-white border border-[#ECEFF4] shadow-[0_1px_2px_rgba(16,24,40,0.03)] overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_-30px_rgba(32,29,29,0.28)] ${className}`}
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

const PRIMARY_CTA =
  'inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-gradient-to-b from-[#3D6CFF] to-[#235BF7] text-white font-bold shadow-[0_14px_30px_-12px_rgba(35,91,247,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300';

export default function LandingPage() {
  const free = JUULA_PLANS.FREE;
  const pro = JUULA_PLANS.PRO;
  const year = new Date().getFullYear();

  return (
    <div
      className={`${display.className} min-h-screen bg-[#EDEFF3] text-[#201D1D] overflow-x-hidden`}
    >
      {/* Without JS, never leave revealed content invisible. */}
      <noscript>
        <style>
          {'.reveal{opacity:1!important;transform:none!important;filter:none!important}'}
        </style>
      </noscript>

      <SiteHeader />

      <main className="px-3 sm:px-5 pb-5 space-y-5">
        {/* ─────────────────────────── HERO ─────────────────────────── */}
        <section className="relative rounded-[36px] bg-[#F6F7F9] border border-white pt-10 sm:pt-14 pb-16 sm:pb-24 px-4 overflow-hidden">
          <div className="hidden md:block">
            <HeroNetwork />
          </div>

          {/* Mobile: Juula hub flanked by the payment logos */}
          <div
            className="md:hidden flex items-center justify-center gap-3 pt-2 pb-8"
            aria-hidden="true"
          >
            <span
              className="opacity-0 motion-reduce:opacity-100"
              style={{ animation: 'rise 800ms cubic-bezier(.2,.75,.2,1) .35s forwards' }}
            >
              <WaveTile size="sm" />
            </span>
            <span
              className="opacity-0 motion-reduce:opacity-100"
              style={{ animation: 'rise 800ms cubic-bezier(.2,.75,.2,1) .25s forwards' }}
            >
              <OrangeMoneyTile size="sm" />
            </span>
            <span className="w-[76px] h-[76px] rounded-[24px] bg-gradient-to-br from-[#4D7DFF] to-[#1F4FE0] flex items-center justify-center motion-safe:animate-[glow_3.2s_ease-in-out_infinite]">
              <span className="w-14 h-14 rounded-full border-[2.5px] border-white/85 flex items-center justify-center">
                <JuulaMark className="w-9 h-9" />
              </span>
            </span>
            <span
              className="opacity-0 motion-reduce:opacity-100"
              style={{ animation: 'rise 800ms cubic-bezier(.2,.75,.2,1) .25s forwards' }}
            >
              <span className="w-10 h-10 rounded-2xl bg-white border border-[#ECEFF4] flex items-center justify-center">
                <FacebookIcon className="w-6 h-6" />
              </span>
            </span>
            <span
              className="opacity-0 motion-reduce:opacity-100"
              style={{ animation: 'rise 800ms cubic-bezier(.2,.75,.2,1) .35s forwards' }}
            >
              <span className="w-10 h-10 rounded-2xl bg-white border border-[#ECEFF4] flex items-center justify-center">
                <TikTokIcon className="w-5 h-5" />
              </span>
            </span>
          </div>

          <div className="relative text-center max-w-3xl mx-auto md:-mt-4">
            <h1 className="text-[42px] leading-[1.02] sm:text-6xl lg:text-[76px] font-extrabold tracking-[-0.035em]">
              <span
                className="block opacity-0 motion-reduce:opacity-100"
                style={{ animation: 'rise 1s cubic-bezier(.2,.75,.2,1) .15s forwards' }}
              >
                Votre boutique pro,
              </span>
              <span
                className="block opacity-0 motion-reduce:opacity-100"
                style={{ animation: 'rise 1s cubic-bezier(.2,.75,.2,1) .3s forwards' }}
              >
                en un seul <span className="text-[#235BF7]">lien.</span>
              </span>
            </h1>
            <p
              className="mt-5 text-base sm:text-lg text-[#7A808C] max-w-xl mx-auto leading-relaxed opacity-0 motion-reduce:opacity-100"
              style={{ animation: 'rise 1s cubic-bezier(.2,.75,.2,1) .45s forwards' }}
            >
              Une page de vente qui inspire confiance. Vos clients paient par Wave, Orange Money,
              carte bancaire — ou à la livraison.
            </p>
            <div
              className="mt-8 flex justify-center opacity-0 motion-reduce:opacity-100"
              style={{ animation: 'rise 1s cubic-bezier(.2,.75,.2,1) .6s forwards' }}
            >
              <Link href="/signup" className={PRIMARY_CTA}>
                Créer ma boutique gratuitement <ArrowRight className="w-4 h-4" />
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
            <Reveal>
              <SectionIcon>
                <Workflow className="w-5 h-5" />
              </SectionIcon>
              <h2 className="mt-5 text-center text-4xl sm:text-5xl font-extrabold tracking-[-0.03em]">
                Créez. Partagez. <span className="text-[#235BF7]">Encaissez.</span>
              </h2>
            </Reveal>
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.t}>
                  <Reveal delay={i * 140} className="h-full">
                    <div className="relative h-full p-6 rounded-[24px] bg-[#F6F7F9] transition-all duration-500 hover:bg-white hover:shadow-[0_24px_48px_-28px_rgba(32,29,29,0.3)] hover:-translate-y-1">
                      <span className="absolute top-5 right-6 text-6xl font-extrabold text-[#E7EAF0] select-none">
                        {i + 1}
                      </span>
                      <span
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-[0_8px_18px_-12px_rgba(32,29,29,0.4)] ${
                          i === 2 ? 'bg-[#235BF7] text-white' : 'bg-white text-[#235BF7]'
                        }`}
                      >
                        <s.icon className="w-5 h-5" strokeWidth={2} />
                      </span>
                      <h3 className="mt-5 text-lg font-bold">{s.t}</h3>
                      <p className="mt-1 text-[15px] text-[#7A808C]">{s.d}</p>
                    </div>
                  </Reveal>
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
            <Reveal>
              <h2 className="text-center text-4xl sm:text-6xl font-extrabold tracking-[-0.035em]">
                Pensé pour <span className="text-[#235BF7]">vendre</span>
              </h2>
              <p className="mt-3 text-center text-[#7A808C] text-base sm:text-lg max-w-xl mx-auto">
                Tout ce qu’il faut pour vendre en ligne en Afrique — rien de compliqué.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {/* Page pro */}
              <Reveal delay={0} className="h-full">
                <Card>
                  <div className="h-60 relative flex items-end justify-center bg-gradient-to-b from-[#F6F7F9] to-white">
                    <div className="w-44 h-52 rounded-t-[26px] border-[6px] border-b-0 border-[#201D1D] bg-white overflow-hidden translate-y-1 transition-transform duration-500 group-hover:-translate-y-2">
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
              </Reveal>

              {/* Paiements */}
              <Reveal delay={120} className="h-full">
                <Card>
                  <div className="h-60 relative flex items-center justify-center">
                    <div className="absolute w-56 h-56 rounded-full border border-[#EEF0F4] transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute w-36 h-36 rounded-full border border-[#EEF0F4] transition-transform duration-700 group-hover:scale-125" />
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
                      <span className="absolute -top-4 -right-4 px-3 py-1.5 rounded-full bg-[#16A34A] text-white text-[11px] font-bold shadow-lg motion-safe:animate-[toast_4s_ease-in-out_infinite]">
                        Payé ✓ 32 000 F
                      </span>
                    </div>
                  </div>
                  <CardText
                    title="Paiement en un clic"
                    text="Wave, Orange Money, Visa, Mastercard — ou en espèces à la livraison."
                  />
                </Card>
              </Reveal>

              {/* Pixels */}
              <Reveal delay={240} className="h-full">
                <Card>
                  <div className="h-60 relative flex items-center justify-center gap-4">
                    {[
                      { icon: <FacebookIcon className="w-8 h-8" />, e: 'Purchase' },
                      { icon: <TikTokIcon className="w-7 h-7" />, e: 'PlaceAnOrder' },
                    ].map((p, i) => (
                      <div
                        key={p.e}
                        className={`w-32 rounded-2xl bg-white border border-[#ECEFF4] p-3 shadow-[0_16px_34px_-22px_rgba(32,29,29,0.4)] transition-transform duration-500 ${
                          i
                            ? 'translate-y-6 group-hover:translate-y-2'
                            : '-translate-y-2 group-hover:translate-y-2'
                        }`}
                      >
                        <span className="w-12 h-12 rounded-2xl bg-[#F6F7F9] flex items-center justify-center">
                          {p.icon}
                        </span>
                        <p
                          className="mt-3 text-[11px] font-bold text-[#16A34A] flex items-center gap-1 motion-safe:animate-[toast_3.6s_ease-in-out_infinite]"
                          style={{ animationDelay: `${i * 1.2}s` }}
                        >
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
              </Reveal>

              {/* Ventes (wide) */}
              <Reveal delay={0} className="lg:col-span-2 h-full">
                <Card>
                  <div className="h-64 relative px-6 pt-10 bg-gradient-to-b from-[#F6F7F9] to-white">
                    <SalesChart />
                  </div>
                  <div className="flex items-start gap-4 px-6 pb-6 pt-4">
                    <span className="w-11 h-11 rounded-2xl bg-[#EEF3FF] text-[#235BF7] flex items-center justify-center shrink-0">
                      <BarChart3 className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight">Vos ventes en temps réel</h3>
                      <p className="mt-1.5 text-[15px] text-[#7A808C]">
                        Chaque commande arrive dans votre tableau de bord et par e-mail. Retraits
                        vers Wave ou Orange Money.
                      </p>
                    </div>
                  </div>
                </Card>
              </Reveal>

              {/* Lien boutique */}
              <Reveal delay={140} className="h-full">
                <Card>
                  <div className="h-64 relative flex items-center justify-center">
                    <div className="absolute w-52 h-52 rounded-full border border-dashed border-[#DCE2EC] motion-safe:animate-[spin_40s_linear_infinite]" />
                    <div className="relative w-64 p-3 rounded-2xl bg-white border border-[#ECEFF4] shadow-[0_18px_40px_-22px_rgba(32,29,29,0.35)]">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F6F7F9]">
                        <Globe className="w-4 h-4 text-[#235BF7] shrink-0" />
                        <span className="text-sm font-bold truncate">
                          awa-shop<span className="text-[#235BF7]">.juula.store</span>
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#201D1D] text-white text-sm font-bold transition-colors duration-300 group-hover:bg-[#235BF7]">
                        <Copy className="w-4 h-4" /> Lien copié
                      </div>
                    </div>
                  </div>
                  <CardText
                    title="Votre adresse à vous"
                    text="Une boutique à votre nom, prête pour vos bios et vos publicités."
                  />
                </Card>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ─────────────────────── TOOLS ─────────────────────── */}
        <section className="rounded-[36px] bg-[#F6F7F9] px-3 sm:px-6 py-6 sm:py-10">
          <Reveal from="zoom">
            <div className="max-w-5xl mx-auto rounded-[32px] bg-white border border-[#ECEFF4] px-4 py-14 sm:py-16 overflow-hidden">
              <SectionIcon>
                <Plug className="w-5 h-5" />
              </SectionIcon>
              <h2 className="mt-5 text-center text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] max-w-2xl mx-auto">
                Connecté à vos outils en <span className="text-[#235BF7]">quelques secondes</span>
              </h2>
              <div className="mt-10">
                <IntegrationsFan />
              </div>
            </div>
          </Reveal>
        </section>

        {/* ─────────────────────── PRICING ─────────────────────── */}
        <section id="tarifs" className="scroll-mt-28 rounded-[36px] bg-white px-4 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <h2 className="text-center text-4xl sm:text-6xl font-extrabold tracking-[-0.035em]">
                Simple et <span className="text-[#235BF7]">transparent</span>
              </h2>
              <p className="mt-3 text-center text-[#7A808C] text-base sm:text-lg">
                Commencez gratuitement. Passez Pro quand vous êtes prêt.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 md:grid-cols-2 items-stretch">
              {[free, pro].map((plan, idx) => {
                const isPro = plan.id === 'PRO';
                return (
                  <Reveal
                    key={plan.id}
                    delay={idx * 150}
                    from={idx ? 'right' : 'left'}
                    className="h-full"
                  >
                    <div
                      className={`relative h-full rounded-[28px] p-7 flex flex-col transition-all duration-500 hover:-translate-y-1.5 ${
                        isPro
                          ? 'bg-[#201D1D] text-white shadow-[0_30px_60px_-30px_rgba(35,91,247,0.6)] hover:shadow-[0_40px_80px_-30px_rgba(35,91,247,0.75)]'
                          : 'bg-[#F6F7F9] border border-[#ECEFF4] hover:shadow-[0_30px_60px_-34px_rgba(32,29,29,0.3)]'
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
                        className={`mt-8 py-3.5 rounded-2xl text-center font-bold transition-all duration-300 hover:-translate-y-0.5 ${
                          isPro
                            ? 'bg-gradient-to-b from-[#3D6CFF] to-[#235BF7] text-white hover:brightness-110'
                            : 'bg-white border border-[#E3E7EE] hover:bg-[#FAFBFC]'
                        }`}
                      >
                        {isPro ? 'Passer à Juula Pro' : 'Commencer gratuitement'}
                      </Link>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─────────────────────── FAQ ─────────────────────── */}
        <section id="faq" className="scroll-mt-28 rounded-[36px] bg-[#F6F7F9] px-4 py-16 sm:py-20">
          <div className="max-w-2xl mx-auto">
            <Reveal>
              <h2 className="text-center text-4xl sm:text-5xl font-extrabold tracking-[-0.03em]">
                Questions <span className="text-[#235BF7]">fréquentes</span>
              </h2>
            </Reveal>
            <div className="mt-10 space-y-3">
              {FAQ.map((item, i) => (
                <Reveal key={item.q} delay={i * 90}>
                  <details className="group rounded-2xl bg-white border border-[#ECEFF4] p-5 transition-shadow duration-300 hover:shadow-[0_18px_40px_-30px_rgba(32,29,29,0.35)] open:shadow-[0_18px_40px_-30px_rgba(32,29,29,0.35)]">
                    <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-bold text-lg [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <ChevronDown className="w-5 h-5 text-[#7A808C] shrink-0 transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <p className="mt-3 text-[15px] leading-relaxed text-[#7A808C] motion-safe:group-open:animate-[rise_500ms_ease]">
                      {item.a}
                    </p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────── FOOTER ─────────────────────── */}
        <footer className="rounded-[36px] bg-[#F6F7F9] px-3 sm:px-6 pt-6 sm:pt-10 pb-3 sm:pb-6">
          <Reveal>
            <div className="max-w-6xl mx-auto rounded-[32px] bg-white border border-[#ECEFF4] overflow-hidden">
              <div className="px-6 sm:px-12 pt-12 sm:pt-14 grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
                <div className="space-y-5">
                  <JuulaLogo height={40} />
                  <p className="text-xl font-bold tracking-tight max-w-xs leading-snug">
                    Juula transforme un simple lien en boutique pro — paiements inclus.
                  </p>
                  <Link href="/signup" className={PRIMARY_CTA}>
                    Créer ma boutique <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <nav aria-label="Produit" className="space-y-2.5 text-[15px]">
                  <p className="font-bold">Produit</p>
                  <Link
                    href="#fonctionnalites"
                    className="block text-[#7A808C] hover:text-[#201D1D] transition-colors"
                  >
                    Fonctionnalités
                  </Link>
                  <Link
                    href="#tarifs"
                    className="block text-[#7A808C] hover:text-[#201D1D] transition-colors"
                  >
                    Tarifs
                  </Link>
                  <Link
                    href="#faq"
                    className="block text-[#7A808C] hover:text-[#201D1D] transition-colors"
                  >
                    FAQ
                  </Link>
                  <Link
                    href="/login"
                    className="block text-[#7A808C] hover:text-[#201D1D] transition-colors"
                  >
                    Se connecter
                  </Link>
                </nav>
                <nav aria-label="Légal" className="space-y-2.5 text-[15px]">
                  <p className="font-bold">Légal</p>
                  <Link
                    href="/conditions"
                    className="block text-[#7A808C] hover:text-[#201D1D] transition-colors"
                  >
                    Conditions d’utilisation
                  </Link>
                  <Link
                    href="/confidentialite"
                    className="block text-[#7A808C] hover:text-[#201D1D] transition-colors"
                  >
                    Confidentialité
                  </Link>
                </nav>
              </div>

              {/* Oversized faded Juula logo */}
              <div
                className="relative mt-12 sm:mt-16 px-4 sm:px-10 select-none pointer-events-none"
                aria-hidden="true"
              >
                <img
                  src="/logo-juula.svg"
                  alt=""
                  className="w-full h-auto opacity-[0.09] translate-y-[18%]"
                  style={{
                    maskImage: 'linear-gradient(to bottom, black 35%, transparent 95%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 35%, transparent 95%)',
                  }}
                />
              </div>
            </div>
          </Reveal>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-4 pt-5 text-xs text-[#7A808C]">
            <span>
              © {year} {LEGAL.companyName || 'Juula Store'} · Dakar, {LEGAL.country}
            </span>
            <span className="flex items-center gap-3">
              <VisaWordmark className="text-sm" />
              <MastercardIcon className="w-7 h-5" />
              <WaveTile size="sm" />
              <OrangeMoneyTile size="sm" />
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
