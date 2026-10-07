// Transactional emails to merchants (Resend): welcome, new order, withdrawal
// sent / failed.
//
// Sent directly (best effort, from `after()` so the HTTP response isn't
// delayed) rather than through the EmailQueue: the queue needs Upstash and
// its drain cron only runs once a day on the Vercel Hobby plan — far too
// late for "you have a new order". A failed send is logged and never breaks
// the business action that triggered it.
//
// Every value coming from a customer or merchant (names, addresses, product
// titles) is HTML-escaped before being placed in a template.
import 'server-only';
import { after } from 'next/server';
import type { StoreOrder, Withdrawal } from '@prisma/client';
import { createMailer, type Mailer } from '@/lib/server/email';
import { log } from '@/lib/server/observability/log';
import { prisma } from '@/lib/server/prisma';
import { LEGAL } from '@/lib/legal';
import { formatNumber } from '@/lib/orderUtils';

/** Safely schedule background work via Next.js after() or microtask in tests. */
export function safeAfter(fn: () => unknown | Promise<unknown>): void {
  try {
    after(fn);
  } catch {
    void Promise.resolve()
      .then(fn)
      .catch(() => {});
  }
}

// Assets and links always point at the production site: emails are read
// outside the app, possibly long after they were sent.
const SITE = LEGAL.siteUrl;
const LOGO_URL = `${SITE}/email/juula-logo.png`;
const DASHBOARD_URL = `${SITE}/dashboard`;

/** Deep link that opens a given order in the dashboard (login first if needed). */
export function orderUrl(reference: string): string {
  return `${DASHBOARD_URL}?commande=${encodeURIComponent(reference)}`;
}

// Brand palette (from the Juula logo).
const C = {
  blue: '#235BF7',
  blueSoft: '#EEF3FF',
  ink: '#201D1D',
  text: '#3F4654',
  muted: '#6B7280',
  line: '#E6EAF2',
  bg: '#F4F6FB',
  green: '#16A34A',
  greenSoft: '#ECFDF3',
  amber: '#B45309',
  amberSoft: '#FFF7E6',
  red: '#DC2626',
  redSoft: '#FEF2F2',
};

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif`;

let mailer: Mailer | null | undefined;

export function getMailer(): Mailer | null {
  if (mailer !== undefined) return mailer;
  // trim(): values pasted into a hosting dashboard often carry a stray
  // newline/space, which Resend rejects.
  const apiKey = (process.env.RESEND_API_KEY ?? '').trim();
  const from = (process.env.EMAIL_FROM ?? 'Juula <notification@juula.store>').trim();
  mailer = apiKey && from ? createMailer({ RESEND_API_KEY: apiKey, EMAIL_FROM: from }) : null;
  if (!mailer) log.error('notify: emails disabled (RESEND_API_KEY / EMAIL_FROM missing)');
  return mailer;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Non-breaking spaces: "32 000 FCFA" never wraps across two lines.
const NBSP = '\u00A0';
const fcfa = (n: number) => `${formatNumber(n)} FCFA`.replace(/[ \u202F]/g, NBSP);

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Dakar',
});

/** +221 77 ••• 45 67 — enough to recognise the number, not to reuse it. */
function maskPhone(phone: string): string {
  const d = phone.replace(/[^\d]/g, '').replace(/^221/, '');
  return d.length === 9
    ? [`+221`, d.slice(0, 2), '•••', d.slice(5, 7), d.slice(7)].join(NBSP)
    : phone;
}

// ─────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────

type Tone = 'blue' | 'green' | 'amber' | 'red';
const TONES: Record<Tone, { fg: string; bg: string }> = {
  blue: { fg: C.blue, bg: C.blueSoft },
  green: { fg: C.green, bg: C.greenSoft },
  amber: { fg: C.amber, bg: C.amberSoft },
  red: { fg: C.red, bg: C.redSoft },
};

export interface EmailRow {
  label: string;
  value: string; // already-escaped HTML
}

export interface EmailSection {
  title: string;
  rows: EmailRow[];
}

export interface EmailButton {
  label: string;
  url: string;
}

export interface EmailLayout {
  preheader: string;
  /** Small label top-right of the header (e.g. "Commande"). */
  label: string;
  badge?: { text: string; tone: Tone };
  title: string;
  intro: string; // already-escaped HTML
  /** Big highlighted amount under the intro. */
  amount?: { value: number; caption: string; tone?: Tone };
  /** Highlighted code box (e.g. auth verification code). */
  codeBlock?: { code: string; caption?: string };
  steps?: { title: string; text: string }[];
  sections?: EmailSection[];
  /** Price breakdown with a bold total line. */
  summary?: { rows: EmailRow[]; total: EmailRow };
  cta?: EmailButton;
  secondary?: EmailButton & { color?: string };
  note?: string; // already-escaped HTML
}

function badgeHtml(b: NonNullable<EmailLayout['badge']>): string {
  const t = TONES[b.tone];
  return `<span style="display:inline-block;background:${t.bg};color:${t.fg};font-size:12px;font-weight:700;letter-spacing:.2px;padding:6px 12px;border-radius:999px;">${escapeHtml(b.text)}</span>`;
}

function rowsHtml(rows: EmailRow[]): string {
  return rows
    .map(
      (r, i) => `<tr>
        <td style="padding:11px 0;${i ? `border-top:1px solid ${C.line};` : ''}color:${C.muted};font-size:13px;width:40%;vertical-align:top;">${r.label}</td>
        <td style="padding:11px 0;${i ? `border-top:1px solid ${C.line};` : ''}color:${C.ink};font-size:14px;font-weight:600;vertical-align:top;text-align:right;">${r.value}</td>
      </tr>`,
    )
    .join('');
}

function sectionHtml(s: EmailSection): string {
  return `<tr><td style="padding-top:16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:16px;">
      <tr><td style="padding:14px 18px 4px;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${C.blue};">${escapeHtml(s.title)}</td></tr>
      <tr><td style="padding:0 18px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml(s.rows)}</table></td></tr>
    </table>
  </td></tr>`;
}

function buttonHtml(b: EmailButton, primary: boolean, color = C.blue): string {
  const style = primary
    ? `background:${color};color:#FFFFFF;border:2px solid ${color};`
    : `background:#FFFFFF;color:${color};border:2px solid ${color};`;
  return `<a class="j-btn" href="${b.url}" style="${style}display:inline-block;text-decoration:none;font-weight:800;font-size:14px;line-height:20px;padding:13px 24px;border-radius:14px;margin:0 6px 8px 0;font-family:${FONT};">${escapeHtml(b.label)}</a>`;
}

/** Table-based layout: renders in Gmail, Outlook, Apple Mail and on mobile. */
export function renderEmail(e: EmailLayout): string {
  let amount = '';
  if (e.amount) {
    const t = TONES[e.amount.tone ?? 'blue'];
    amount = `<tr><td style="padding-top:18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${t.bg};border-radius:16px;">
        <tr><td style="padding:18px 20px;">
          <div style="font-size:12px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.8px;">${escapeHtml(e.amount.caption)}</div>
          <div class="j-amount" style="font-size:30px;font-weight:900;color:${t.fg};letter-spacing:-.5px;padding-top:4px;">${fcfa(e.amount.value)}</div>
        </td></tr>
      </table>
    </td></tr>`;
  }

  const codeBlock = e.codeBlock
    ? `<tr><td align="center" style="padding-top:20px;padding-bottom:6px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;background:${C.blueSoft};border:2px dashed ${C.blue};border-radius:18px;">
          <tr><td style="padding:16px 36px;text-align:center;">
            <div style="font-size:32px;font-weight:900;letter-spacing:6px;color:${C.blue};font-family:${FONT};">${escapeHtml(e.codeBlock.code)}</div>
            ${e.codeBlock.caption ? `<div style="font-size:12px;font-weight:600;color:${C.muted};padding-top:6px;">${escapeHtml(e.codeBlock.caption)}</div>` : ''}
          </td></tr>
        </table>
      </td></tr>`
    : '';

  const steps = e.steps
    ? `<tr><td style="padding-top:18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${e.steps
        .map(
          (s, i) => `<tr>
            <td style="width:44px;vertical-align:top;padding:8px 0;">
              <div style="width:32px;height:32px;line-height:32px;border-radius:10px;background:${C.blue};color:#FFFFFF;font-weight:800;font-size:14px;text-align:center;">${i + 1}</div>
            </td>
            <td style="vertical-align:top;padding:8px 0;">
              <div style="font-size:15px;font-weight:800;color:${C.ink};">${escapeHtml(s.title)}</div>
              <div style="font-size:14px;line-height:1.55;color:${C.text};padding-top:2px;">${escapeHtml(s.text)}</div>
            </td>
          </tr>`,
        )
        .join('')}</table></td></tr>`
    : '';

  const summary = e.summary
    ? `<tr><td style="padding-top:16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};border-radius:16px;">
          <tr><td style="padding:6px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml(e.summary.rows)}
            <tr>
              <td style="padding:14px 0 12px;border-top:2px solid ${C.ink};color:${C.ink};font-size:15px;font-weight:900;">${e.summary.total.label}</td>
              <td style="padding:14px 0 12px;border-top:2px solid ${C.ink};color:${C.blue};font-size:20px;font-weight:900;text-align:right;">${e.summary.total.value}</td>
            </tr>
          </table></td></tr>
        </table>
      </td></tr>`
    : '';

  const buttons =
    e.cta || e.secondary
      ? `<tr><td style="padding-top:24px;">${e.cta ? buttonHtml(e.cta, true) : ''}${
          e.secondary ? buttonHtml(e.secondary, false, e.secondary.color) : ''
        }</td></tr>`
      : '';

  const year = new Date().getFullYear();

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<style>
  @media only screen and (max-width: 520px) {
    .j-outer { padding: 14px 8px 4px !important; }
    .j-head { padding: 18px 20px 14px !important; }
    .j-body { padding: 22px 20px 24px !important; }
    .j-title { font-size: 22px !important; }
    .j-btn { display: block !important; width: 100% !important; box-sizing: border-box; text-align: center; margin: 0 0 10px 0 !important; }
    .j-amount { font-size: 26px !important; }
    .j-label { display: none !important; }
  }
</style>
<title>${escapeHtml(e.title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT};-webkit-font-smoothing:antialiased;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(e.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
  <tr><td class="j-outer" align="center" style="padding:28px 12px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid ${C.line};border-radius:24px;overflow:hidden;">
      <tr><td style="height:6px;background:${C.blue};font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td class="j-head" style="padding:22px 28px 18px;border-bottom:1px solid ${C.line};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td><a href="${SITE}" style="text-decoration:none;"><img src="${LOGO_URL}" width="118" height="45" alt="Juula" style="display:block;border:0;width:118px;height:45px;"></a></td>
          <td class="j-label" align="right" style="font-size:12px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1px;">${escapeHtml(e.label)}</td>
        </tr></table>
      </td></tr>
      <tr><td class="j-body" style="padding:26px 28px 30px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${e.badge ? `<tr><td style="padding-bottom:14px;">${badgeHtml(e.badge)}</td></tr>` : ''}
          <tr><td class="j-title" style="font-size:25px;line-height:1.25;font-weight:900;color:${C.ink};letter-spacing:-.4px;">${escapeHtml(e.title)}</td></tr>
          <tr><td style="padding-top:10px;font-size:15px;line-height:1.65;color:${C.text};">${e.intro}</td></tr>
          ${amount}
          ${codeBlock}
          ${steps}
          ${(e.sections ?? []).map(sectionHtml).join('')}
          ${summary}
          ${buttons}
          ${e.note ? `<tr><td style="padding-top:22px;font-size:13px;line-height:1.6;color:${C.muted};">${e.note}</td></tr>` : ''}
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding:18px 20px 34px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="font-size:12px;line-height:1.7;color:${C.muted};text-align:center;">
        Vous recevez cet e-mail car vous êtes inscrit sur <strong style="color:${C.ink};">Juula Store</strong> et qu'une activité a eu lieu sur votre compte (boutique, commande ou retrait).
      </td></tr>
      <tr><td style="padding-top:12px;font-size:12px;text-align:center;">
        <a href="${SITE}/conditions" style="color:${C.blue};text-decoration:none;font-weight:700;">Conditions d'utilisation</a>
        <span style="color:#C7CDD8;">&nbsp;&nbsp;|&nbsp;&nbsp;</span>
        <a href="${SITE}/confidentialite" style="color:${C.blue};text-decoration:none;font-weight:700;">Politique de confidentialité</a>
      </td></tr>
      <tr><td style="padding-top:12px;font-size:11px;color:#9CA3AF;text-align:center;">© ${year} Juula Store · juula.store</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

async function send(
  to: string,
  subject: string,
  html: string,
  text: string,
  kind: string,
): Promise<boolean> {
  const m = getMailer();
  if (!m) return false;
  try {
    const { id } = await m.send({ to, subject, html, text });
    log.info('notify.sent', { kind, id });
    return true;
  } catch (err) {
    log.error('notify.failed', { kind, error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Templates (pure: data → { subject, html, text }) — previewable and testable
// ─────────────────────────────────────────────────────────────────────────

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function welcomeEmail(name: string | null): RenderedEmail {
  const first = (name ?? '').trim().split(/\s+/)[0] || '';
  const title = first ? `Bienvenue sur Juula, ${first} !` : 'Bienvenue sur Juula !';
  return {
    subject: 'Bienvenue sur Juula — votre boutique est prête',
    html: renderEmail({
      preheader: 'Votre boutique est prête : créez et partagez votre première page produit.',
      label: 'Bienvenue',
      badge: { text: 'Compte créé', tone: 'green' },
      title,
      intro:
        'Votre boutique Juula est prête. Voici comment recevoir vos premières commandes en quelques minutes :',
      steps: [
        {
          title: 'Créez votre page produit',
          text: 'Photos, prix, avantages et avis clients, dans l’éditeur.',
        },
        { title: 'Publiez-la', text: 'Votre produit reçoit un lien unique, prêt à partager.' },
        { title: 'Partagez le lien', text: 'Sur Facebook, TikTok, Instagram et WhatsApp.' },
        { title: 'Encaissez', text: 'À la livraison, ou en ligne par Wave et Orange Money.' },
      ],
      cta: { label: 'Créer ma première page', url: DASHBOARD_URL },
      note: 'Astuce : ajoutez vos Pixels Facebook et TikTok dans <strong>Paramètres</strong> pour mesurer vos publicités.',
    }),
    text: `${title}\n\n1. Créez votre page produit\n2. Publiez-la\n3. Partagez le lien\n4. Encaissez\n\nVotre tableau de bord : ${DASHBOARD_URL}`,
  };
}

const PAYMENT_LABEL: Record<string, string> = {
  cod: 'Paiement à la livraison',
  online_momo: 'Mobile Money — paiement en ligne',
  online_wave: 'Wave — paiement en ligne',
  online_orange: 'Orange Money — paiement en ligne',
  whatsapp: 'Commande sur WhatsApp — paiement à convenir',
  direct: 'Paiement direct — à vérifier',
};

function paymentLabel(order: StoreOrder): string {
  if (order.paymentType === 'direct' && order.paymentMethodName) {
    return `Paiement direct (${order.paymentMethodName}) — à vérifier`;
  }
  return PAYMENT_LABEL[order.paymentType] ?? order.paymentType;
}

export function newOrderEmail(order: StoreOrder): RenderedEmail {
  const isCod = order.paymentType === 'cod' || order.paymentType === 'whatsapp';
  const isDirect = order.paymentType === 'direct';
  const paid = order.paymentStatus === 'paid';
  const sections: EmailSection[] = [
    {
      title: 'Commande',
      rows: [
        { label: 'Référence', value: escapeHtml(order.reference) },
        { label: 'Date', value: escapeHtml(dateFmt.format(order.createdAt)) },
        { label: 'Produit', value: escapeHtml(order.productName) },
        { label: 'Quantité', value: String(order.quantity) },
        ...(order.selectedColor
          ? [{ label: 'Couleur', value: escapeHtml(order.selectedColor) }]
          : []),
      ],
    },
    {
      title: 'Client & livraison',
      rows: [
        { label: 'Nom', value: escapeHtml(order.customerName) },
        {
          label: 'WhatsApp',
          value: `<a href="https://wa.me/${escapeHtml(order.whatsappNumber)}" style="color:${C.blue};text-decoration:none;">${escapeHtml(order.phone)}</a>`,
        },
        ...(order.neighborhood
          ? [{ label: 'Quartier', value: escapeHtml(order.neighborhood) }]
          : []),
        { label: 'Adresse', value: escapeHtml(order.deliveryAddress || '—') },
        ...(order.city ? [{ label: 'Ville', value: escapeHtml(order.city) }] : []),
      ],
    },
  ];
  return {
    subject: `Nouvelle commande ${order.reference} — ${fcfa(order.totalAmount)}`,
    html: renderEmail({
      preheader: `${order.customerName} a commandé ${order.productName} pour ${fcfa(order.totalAmount)}.`,
      label: 'Nouvelle commande',
      badge: isCod
        ? { text: 'À confirmer avec le client', tone: 'amber' }
        : isDirect
          ? { text: 'Paiement à vérifier', tone: 'amber' }
          : paid
            ? { text: 'Payée en ligne', tone: 'green' }
            : { text: 'Paiement en ligne en cours', tone: 'blue' },
      title: `Nouvelle commande de ${fcfa(order.totalAmount)}`,
      intro: `<strong style="color:${C.ink};">${escapeHtml(order.customerName)}</strong> vient de commander sur votre page. Confirmez rapidement avec votre client sur WhatsApp pour sécuriser la livraison.`,
      sections,
      summary: {
        rows: [
          { label: 'Sous-total', value: fcfa(order.amount) },
          { label: 'Livraison', value: order.deliveryFee ? fcfa(order.deliveryFee) : 'Offerte' },
          ...(order.promoCode
            ? [
                {
                  label: `Code promo ${escapeHtml(order.promoCode)}`,
                  value: `-${fcfa(order.discountAmount)}`,
                },
              ]
            : []),
          {
            label: 'Mode de paiement',
            value: escapeHtml(paymentLabel(order)),
          },
        ],
        total: { label: 'Total', value: fcfa(order.totalAmount) },
      },
      cta: { label: 'Voir la commande', url: orderUrl(order.reference) },
    }),
    text: `Nouvelle commande ${order.reference}\nProduit : ${order.productName} (×${order.quantity})\nClient : ${order.customerName} — ${order.phone}\nAdresse : ${order.deliveryAddress ?? '—'}\nTotal : ${fcfa(order.totalAmount)} (${paymentLabel(order)})\n\nVoir la commande : ${orderUrl(order.reference)}`,
  };
}

function destinationOf(w: Withdrawal): { method: string; phone: string } {
  const d = (w.destination ?? {}) as { method?: string; phone?: string };
  return {
    method: d.method === 'ORANGE_MONEY' ? 'Orange Money' : 'Wave',
    phone: maskPhone(d.phone ?? ''),
  };
}

export function withdrawalSentEmail(w: Withdrawal): RenderedEmail {
  const dest = destinationOf(w);
  return {
    subject: `Retrait de ${fcfa(w.amount)} envoyé`,
    html: renderEmail({
      preheader: `${fcfa(w.amount)} en route vers votre compte ${dest.method}.`,
      label: 'Portefeuille',
      badge: { text: 'Virement en cours', tone: 'blue' },
      title: 'Votre retrait est en route',
      intro: `Nous avons transmis votre retrait à ${dest.method}. Les fonds arrivent en général en quelques minutes.`,
      amount: { value: w.amount, caption: 'Montant envoyé', tone: 'blue' },
      sections: [
        {
          title: 'Détails du virement',
          rows: [
            { label: 'Destination', value: `${dest.method} · ${escapeHtml(dest.phone)}` },
            { label: 'Date', value: escapeHtml(dateFmt.format(w.requestedAt)) },
            { label: 'Référence', value: escapeHtml(w.providerPayoutId ?? w.id) },
          ],
        },
      ],
      cta: { label: 'Voir mon portefeuille', url: DASHBOARD_URL },
      note: `<strong style="color:${C.ink};">Vous n’êtes pas à l’origine de ce retrait ?</strong> Changez immédiatement votre code PIN depuis votre <a href="${DASHBOARD_URL}" style="color:${C.blue};">tableau de bord</a> et sécurisez votre compte Google.`,
    }),
    text: `Votre retrait de ${fcfa(w.amount)} vers ${dest.method} ${dest.phone} est en route.\n${DASHBOARD_URL}`,
  };
}

export function withdrawalCompletedEmail(w: Withdrawal): RenderedEmail {
  const dest = destinationOf(w);
  const when = w.completedAt ?? w.processedAt ?? w.requestedAt;
  return {
    subject: `Retrait de ${fcfa(w.amount)} confirmé`,
    html: renderEmail({
      preheader: `${fcfa(w.amount)} ont bien été versés sur votre compte ${dest.method}.`,
      label: 'Portefeuille',
      badge: { text: 'Virement confirmé', tone: 'green' },
      title: 'Votre retrait est confirmé',
      intro: `L’argent est arrivé : ${dest.method} a confirmé le versement sur votre compte ${escapeHtml(dest.phone)}.`,
      amount: { value: w.amount, caption: 'Montant versé', tone: 'green' },
      sections: [
        {
          title: 'Détails du virement',
          rows: [
            { label: 'Destination', value: `${dest.method} · ${escapeHtml(dest.phone)}` },
            { label: 'Confirmé le', value: escapeHtml(dateFmt.format(when)) },
            { label: 'Référence', value: escapeHtml(w.providerPayoutId ?? w.id) },
          ],
        },
      ],
      cta: { label: 'Voir mon portefeuille', url: DASHBOARD_URL },
    }),
    text: `Votre retrait de ${fcfa(w.amount)} vers ${dest.method} ${dest.phone} est confirmé.\n${DASHBOARD_URL}`,
  };
}

/** Provider failure codes → explanation a merchant can act on. */
export function failureReasonText(code: string | null): string {
  const c = (code ?? '').toLowerCase();
  if (/phone|destination|recipient|account|msisdn|number|invalid_param/.test(c)) {
    return 'Le numéro de destination est invalide ou n’est pas un compte actif.';
  }
  if (/limit|ceiling|plafond|max/.test(c))
    return 'Le plafond du compte destinataire a été atteint.';
  if (/insufficient|balance|fund/.test(c)) {
    return 'Le service de paiement n’a pas pu débloquer les fonds pour le moment.';
  }
  if (/kyc|blocked|suspend|frozen|restrict/.test(c))
    return 'Le compte destinataire est bloqué ou restreint par l’opérateur.';
  if (/timeout|unavailable|network|server|5\d\d/.test(c))
    return 'L’opérateur était momentanément indisponible.';
  return 'L’opérateur a refusé le virement.';
}

export function withdrawalFailedEmail(w: Withdrawal): RenderedEmail {
  const dest = destinationOf(w);
  return {
    subject: `Retrait de ${fcfa(w.amount)} non effectué`,
    html: renderEmail({
      preheader: `Votre retrait de ${fcfa(w.amount)} n’a pas abouti — le montant est recrédité.`,
      label: 'Portefeuille',
      badge: { text: 'Retrait refusé', tone: 'red' },
      title: 'Votre retrait n’a pas pu être effectué',
      intro: `${dest.method} a refusé le virement vers ${escapeHtml(dest.phone)}. <strong style="color:${C.ink};">Pas d’inquiétude : le montant a été recrédité</strong> sur votre portefeuille.`,
      amount: { value: w.amount, caption: 'Montant recrédité', tone: 'green' },
      sections: [
        {
          title: 'Détails',
          rows: [
            { label: 'Destination', value: `${dest.method} · ${escapeHtml(dest.phone)}` },
            { label: 'Date', value: escapeHtml(dateFmt.format(w.requestedAt)) },
            { label: 'Motif', value: escapeHtml(failureReasonText(w.failureReason)) },
            ...(w.failureReason ? [{ label: 'Code', value: escapeHtml(w.failureReason) }] : []),
          ],
        },
      ],
      cta: { label: 'Réessayer le retrait', url: DASHBOARD_URL },
      note: 'Vérifiez que le numéro correspond bien à un compte actif, puis réessayez. Notre support WhatsApp peut vous aider.',
    }),
    text: `Votre retrait de ${fcfa(w.amount)} n'a pas pu être effectué. Le montant a été recrédité sur votre portefeuille.\n${DASHBOARD_URL}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Templates: Auth & Online Payment
// ─────────────────────────────────────────────────────────────────────────

export function paymentConfirmedEmail(order: StoreOrder): RenderedEmail {
  const sections: EmailSection[] = [
    {
      title: 'Paiement',
      rows: [
        { label: 'Référence', value: escapeHtml(order.reference) },
        {
          label: 'Mode de paiement',
          value: escapeHtml(PAYMENT_LABEL[order.paymentType] ?? order.paymentType),
        },
        ...(order.providerPaymentId
          ? [{ label: 'Transaction Moneriz', value: escapeHtml(order.providerPaymentId) }]
          : []),
        { label: 'Date', value: escapeHtml(dateFmt.format(order.paidAt ?? new Date())) },
      ],
    },
    {
      title: 'Commande',
      rows: [
        { label: 'Produit', value: escapeHtml(order.productName) },
        { label: 'Quantité', value: String(order.quantity) },
        ...(order.selectedColor
          ? [{ label: 'Couleur', value: escapeHtml(order.selectedColor) }]
          : []),
        { label: 'Montant encaissé', value: fcfa(order.totalAmount) },
        ...(order.netAmount !== null && order.netAmount !== undefined
          ? [{ label: 'Crédité au portefeuille', value: fcfa(order.netAmount) }]
          : []),
      ],
    },
    {
      title: 'Client',
      rows: [
        { label: 'Nom', value: escapeHtml(order.customerName) },
        {
          label: 'WhatsApp',
          value: `<a href="https://wa.me/${escapeHtml(order.whatsappNumber)}" style="color:${C.blue};text-decoration:none;">${escapeHtml(order.phone)}</a>`,
        },
        ...(order.neighborhood
          ? [{ label: 'Quartier', value: escapeHtml(order.neighborhood) }]
          : []),
        { label: 'Adresse', value: escapeHtml(order.deliveryAddress || '—') },
      ],
    },
  ];

  return {
    subject: `Paiement reçu (${fcfa(order.totalAmount)}) — Commande ${order.reference}`,
    html: renderEmail({
      preheader: `Paiement de ${fcfa(order.totalAmount)} validé pour la commande ${order.reference}.`,
      label: 'Paiement validé',
      badge: { text: 'Payée en ligne', tone: 'green' },
      title: `Paiement reçu : ${fcfa(order.totalAmount)}`,
      intro: `Le paiement de <strong style="color:${C.ink};">${escapeHtml(order.customerName)}</strong> a été validé avec succès. Les fonds sont sécurisés et crédités sur votre portefeuille Juula.`,
      amount: { value: order.totalAmount, caption: 'Montant encaissé', tone: 'green' },
      sections,
      cta: { label: 'Voir la commande', url: orderUrl(order.reference) },
    }),
    text: `Paiement reçu pour la commande ${order.reference}\nMontant : ${fcfa(order.totalAmount)}\nClient : ${order.customerName} (${order.phone})\nVoir la commande : ${orderUrl(order.reference)}`,
  };
}

export function verificationEmailTemplate(code: string, expiresAt?: Date | string): RenderedEmail {
  const ttlMin = expiresAt
    ? Math.max(1, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000))
    : 15;
  return {
    subject: `Votre code de validation Juula : ${code}`,
    html: renderEmail({
      preheader: `Votre code de validation pour votre compte Juula est ${code}. Valable ${ttlMin} minutes.`,
      label: 'Sécurité & Accès',
      badge: { text: 'Validation requise', tone: 'blue' },
      title: 'Validez votre adresse e-mail',
      intro: `Bienvenue sur Juula ! Pour finaliser la création de votre compte commerçant et sécuriser votre boutique, voici votre code de confirmation :`,
      codeBlock: { code, caption: `Ce code expire dans ${ttlMin} minutes.` },
      note: `Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.`,
    }),
    text: `Bienvenue sur Juula !\nVotre code de confirmation est : ${code}\nCe code expire dans ${ttlMin} minutes.\nSi vous n'avez pas demandé ce code, ignorez cet e-mail.`,
  };
}

export function passwordResetEmailTemplate(code: string, expiresAt?: Date | string): RenderedEmail {
  const ttlMin = expiresAt
    ? Math.max(1, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000))
    : 15;
  return {
    subject: `Réinitialisation de votre mot de passe Juula : ${code}`,
    html: renderEmail({
      preheader: `Votre code de réinitialisation de mot de passe est ${code}. Valable ${ttlMin} minutes.`,
      label: 'Sécurité du compte',
      badge: { text: 'Mot de passe oublié', tone: 'amber' },
      title: 'Réinitialisez votre mot de passe',
      intro: `Nous avons reçu une demande de réinitialisation du mot de passe associé à votre compte Juula. Voici votre code temporaire :`,
      codeBlock: { code, caption: `Ce code expire dans ${ttlMin} minutes.` },
      note: `Si vous n'avez pas demandé cette réinitialisation, ignorez ce message. Votre mot de passe reste inchangé.`,
    }),
    text: `Réinitialisation de votre mot de passe Juula\nVotre code temporaire est : ${code}\nCe code expire dans ${ttlMin} minutes.\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Senders
// ─────────────────────────────────────────────────────────────────────────

/**
 * Welcome email, sent exactly once per merchant: the Store row's
 * `welcomeEmailSentAt` is claimed with a conditional update, so concurrent
 * dashboard loads or signups can't send it twice.
 */
export async function sendWelcomeEmailOnce(userId: string): Promise<void> {
  if (!getMailer()) return;
  await prisma.store.upsert({ where: { userId }, create: { userId }, update: {} });
  const claim = await prisma.store.updateMany({
    where: { userId, welcomeEmailSentAt: null },
    data: { welcomeEmailSentAt: new Date() },
  });
  if (claim.count === 0) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  const mail = user ? welcomeEmail(user.name) : null;
  const sent =
    user && mail ? await send(user.email, mail.subject, mail.html, mail.text, 'welcome') : false;
  // Not delivered (provider error, bad config): release the claim so the
  // next dashboard visit tries again (see GET /api/store).
  if (!sent) {
    await prisma.store.updateMany({ where: { userId }, data: { welcomeEmailSentAt: null } });
  }
}

export async function sendNewOrderEmail(orderId: string): Promise<void> {
  if (!getMailer()) return;
  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    include: { merchant: { select: { email: true } } },
  });
  if (!order) return;
  const mail = newOrderEmail(order);
  await send(order.merchant.email, mail.subject, mail.html, mail.text, 'new_order');
}

export async function sendPaymentConfirmedEmail(orderId: string): Promise<void> {
  if (!getMailer()) return;
  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    include: { merchant: { select: { email: true } } },
  });
  if (!order) return;
  const mail = paymentConfirmedEmail(order);
  await send(order.merchant.email, mail.subject, mail.html, mail.text, 'payment_confirmed');
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  expiresAt?: Date | string,
): Promise<boolean> {
  if (!getMailer()) return false;
  const mail = verificationEmailTemplate(code, expiresAt);
  return send(to, mail.subject, mail.html, mail.text, 'verification_code');
}

export async function sendPasswordResetEmail(
  to: string,
  code: string,
  expiresAt?: Date | string,
): Promise<boolean> {
  if (!getMailer()) return false;
  const mail = passwordResetEmailTemplate(code, expiresAt);
  return send(to, mail.subject, mail.html, mail.text, 'password_reset');
}

export async function sendDirectEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  kind?: string;
}): Promise<boolean> {
  const m = getMailer();
  if (!m) return false;
  return send(input.to, input.subject, input.html, input.text ?? '', input.kind ?? 'direct');
}

export async function sendWithdrawalSentEmail(withdrawalId: string): Promise<void> {
  if (!getMailer()) return;
  const w = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { user: { select: { email: true } } },
  });
  if (!w) return;
  const mail = withdrawalSentEmail(w);
  await send(w.user.email, mail.subject, mail.html, mail.text, 'withdrawal_sent');
}

export async function sendWithdrawalCompletedEmail(withdrawalId: string): Promise<void> {
  if (!getMailer()) return;
  const w = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { user: { select: { email: true } } },
  });
  if (!w) return;
  const mail = withdrawalCompletedEmail(w);
  await send(w.user.email, mail.subject, mail.html, mail.text, 'withdrawal_completed');
}

export async function sendWithdrawalFailedEmail(withdrawalId: string): Promise<void> {
  if (!getMailer()) return;
  const w = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { user: { select: { email: true } } },
  });
  if (!w) return;
  const mail = withdrawalFailedEmail(w);
  await send(w.user.email, mail.subject, mail.html, mail.text, 'withdrawal_failed');
}

export async function sendProSubscriptionActivatedEmail(
  userId: string,
  expiresAt: Date,
): Promise<void> {
  if (!getMailer()) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, store: { select: { name: true, subdomain: true } } },
  });
  if (!user?.email) return;

  const expiryFmt = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(expiresAt);

  const greeting = user.name ? `Bonjour ${user.name},` : 'Bonjour,';
  const storeLabel = user.store?.name || 'Votre boutique';

  const html = `
    <div style="background-color: ${C.bg}; font-family: ${FONT}; padding: 32px 16px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid ${C.line}; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
        <div style="background: linear-gradient(135deg, #0F172A, #1E3A8A); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">Votre abonnement est actif</h1>
          <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 8px 0 0 0;">${escapeHtml(storeLabel)} peut maintenant être en ligne.</p>
        </div>
        <div style="padding: 28px 24px; color: ${C.text}; font-size: 14px; line-height: 1.6;">
          <p style="margin-top: 0;">${greeting}</p>
          <p>Nous vous confirmons l'activation de votre <strong>abonnement Juula</strong> (3 900 FCFA/mois).</p>
          
          <div style="background: ${C.blueSoft}; border-left: 4px solid ${C.blue}; padding: 14px 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: ${C.blue}; font-weight: bold; font-size: 13px;">Ce que comprend votre abonnement :</p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 13px; color: #1E293B;">
              <li><strong>Votre boutique et vos pages produits en ligne</strong></li>
              <li><strong>Paiement à la livraison et bouton « Commander sur WhatsApp »</strong></li>
              <li><strong>Liens de paiement directs</strong> (Wave Business, Orange Money…)</li>
              <li><strong>Pixels Facebook & TikTok</strong></li>
              <li>Option : paiement en ligne Mobile Money JuulaPay (7,5 % par paiement)</li>
            </ul>
          </div>

          <p style="font-size: 13px; color: ${C.muted};">
            Abonnement actif jusqu'au : <strong>${expiryFmt}</strong>. Sans renouvellement, vos pages passent hors ligne à cette date.
          </p>

          <div style="text-align: center; margin: 28px 0 10px 0;">
            <a href="${DASHBOARD_URL}" style="display: inline-block; background-color: ${C.blue}; color: #ffffff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 12px; font-size: 14px;">
              Ouvrir mon tableau de bord
            </a>
          </div>
        </div>
        <div style="background: #F8FAFC; padding: 16px; text-align: center; border-top: 1px solid ${C.line}; font-size: 11px; color: ${C.muted};">
          Juula Store · Plateforme e-commerce pour l'Afrique · Dakar, Sénégal
        </div>
      </div>
    </div>
  `;

  const text = `
Votre abonnement est actif

${greeting}
Votre abonnement Juula est actif pour ${storeLabel}.
Ce que comprend votre abonnement :
- Votre boutique et vos pages produits en ligne
- Paiement à la livraison et bouton « Commander sur WhatsApp »
- Liens de paiement directs
- Pixels Facebook & TikTok
- Option : paiement en ligne Mobile Money JuulaPay (7,5 % par paiement)

Valable jusqu'au : ${expiryFmt}
Tableau de bord : ${DASHBOARD_URL}
  `.trim();

  await send(user.email, 'Votre abonnement Juula est actif', html, text, 'pro_activated');
}
