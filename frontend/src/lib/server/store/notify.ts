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
import type { Withdrawal } from '@prisma/client';
import { createMailer, type Mailer } from '@/lib/server/email';
import { log } from '@/lib/server/observability/log';
import { prisma } from '@/lib/server/prisma';
import { LEGAL } from '@/lib/legal';
import { formatNumber } from '@/lib/orderUtils';

// Assets and links always point at the production site: emails are read
// outside the app, possibly long after they were sent.
const SITE = LEGAL.siteUrl;
const LOGO_URL = `${SITE}/email/juula-icon.png`;
const DASHBOARD_URL = `${SITE}/dashboard`;

let mailer: Mailer | null | undefined;

function getMailer(): Mailer | null {
  if (mailer !== undefined) return mailer;
  const apiKey = process.env.RESEND_API_KEY ?? '';
  const from = process.env.EMAIL_FROM ?? '';
  mailer = apiKey && from ? createMailer({ RESEND_API_KEY: apiKey, EMAIL_FROM: from }) : null;
  if (!mailer) log.warn('notify: emails disabled (RESEND_API_KEY / EMAIL_FROM missing)');
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

const fcfa = (n: number) => `${formatNumber(n)} FCFA`;

/** +221 77 ••• 45 67 — enough to recognise the number, not to reuse it. */
function maskPhone(phone: string): string {
  const d = phone.replace(/[^\d]/g, '').replace(/^221/, '');
  return d.length === 9 ? `+221 ${d.slice(0, 2)} ••• ${d.slice(5, 7)} ${d.slice(7)}` : phone;
}

interface Row {
  label: string;
  value: string; // already-escaped HTML
}

interface LayoutInput {
  preheader: string;
  title: string;
  intro: string; // already-escaped HTML
  rows?: Row[];
  cta?: { label: string; url: string };
  outro?: string; // already-escaped HTML
  accent?: string;
}

/** Table-based layout: renders in Gmail, Outlook, Apple Mail and on mobile. */
export function renderEmail(input: LayoutInput): string {
  const accent = input.accent ?? '#1E60F8';
  const rows = (input.rows ?? [])
    .map(
      (r) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;color:#64748B;font-size:13px;width:42%;vertical-align:top;">${r.label}</td>
        <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;color:#0F172A;font-size:14px;font-weight:600;vertical-align:top;">${r.value}</td>
      </tr>`,
    )
    .join('');
  const cta = input.cta
    ? `<tr><td style="padding:24px 0 4px;">
        <a href="${input.cta.url}" style="display:inline-block;background:${accent};color:#FFFFFF;text-decoration:none;font-weight:800;font-size:14px;padding:14px 26px;border-radius:14px;">${input.cta.label}</a>
      </td></tr>`
    : '';

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:#F2F4F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F4F7;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 4px 18px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td><img src="${LOGO_URL}" width="40" height="40" alt="Juula" style="display:block;border-radius:10px;border:0;"></td>
          <td style="padding-left:10px;font-size:20px;font-weight:900;color:#0F172A;letter-spacing:-0.3px;">Juula</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#FFFFFF;border:1px solid #E5E9F0;border-radius:24px;padding:28px 26px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:22px;line-height:1.25;font-weight:900;color:#0F172A;padding-bottom:10px;">${escapeHtml(input.title)}</td></tr>
          <tr><td style="font-size:15px;line-height:1.6;color:#334155;">${input.intro}</td></tr>
          ${rows ? `<tr><td style="padding-top:14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>` : ''}
          ${cta}
          ${input.outro ? `<tr><td style="padding-top:18px;font-size:13px;line-height:1.6;color:#64748B;">${input.outro}</td></tr>` : ''}
        </table>
      </td></tr>
      <tr><td style="padding:18px 6px;font-size:12px;line-height:1.6;color:#94A3B8;text-align:center;">
        Juula Store · Dakar, ${LEGAL.country}<br>
        Besoin d'aide ? <a href="${LEGAL.whatsappLink}" style="color:#64748B;">Support WhatsApp ${LEGAL.whatsapp}</a>
        · <a href="${SITE}/confidentialite" style="color:#64748B;">Confidentialité</a>
      </td></tr>
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
): Promise<void> {
  const m = getMailer();
  if (!m) return;
  try {
    const { id } = await m.send({ to, subject, html, text });
    log.info('notify.sent', { kind, id });
  } catch (err) {
    log.error('notify.failed', { kind, error: err instanceof Error ? err.message : String(err) });
  }
}

// ─────────────────────────────────────────────────────────────────────────

/**
 * Welcome email, sent exactly once per merchant: the Store row's
 * `welcomeEmailSentAt` is claimed with a conditional update, so concurrent
 * dashboard loads can't send it twice.
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
  if (!user) return;
  const firstName = escapeHtml((user.name ?? '').split(' ')[0] || 'et bienvenue');

  const html = renderEmail({
    preheader: 'Votre boutique Juula est prête : créez et partagez votre première page produit.',
    title: `Bienvenue sur Juula, ${firstName} !`,
    intro:
      'Votre boutique est créée. Voici comment recevoir vos premières commandes en quelques minutes :',
    rows: [
      {
        label: '1. Créez',
        value: 'Ajoutez photos, prix et avantages de votre produit dans l’éditeur.',
      },
      { label: '2. Publiez', value: 'Cliquez sur « Publier » : votre page reçoit un lien unique.' },
      {
        label: '3. Partagez',
        value: 'Copiez le lien sur Facebook, TikTok, Instagram ou WhatsApp.',
      },
      { label: '4. Encaissez', value: 'Paiement à la livraison, Wave ou Orange Money.' },
    ],
    cta: { label: 'Créer ma première page', url: DASHBOARD_URL },
    outro:
      'Astuce : ajoutez vos Pixels Facebook et TikTok dans Paramètres pour mesurer vos publicités.',
  });
  const text = `Bienvenue sur Juula !\n\n1. Créez votre page produit\n2. Publiez-la\n3. Partagez son lien\n4. Encaissez\n\nVotre tableau de bord : ${DASHBOARD_URL}`;
  await send(user.email, 'Bienvenue sur Juula — votre boutique est prête', html, text, 'welcome');
}

const PAYMENT_LABEL: Record<string, string> = {
  cod: 'Paiement à la livraison',
  online_wave: 'Wave (paiement en ligne en cours)',
  online_orange: 'Orange Money (paiement en ligne en cours)',
};

export async function sendNewOrderEmail(orderId: string): Promise<void> {
  if (!getMailer()) return;
  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    include: { merchant: { select: { email: true } } },
  });
  if (!order) return;

  const rows: Row[] = [
    { label: 'Produit', value: escapeHtml(order.productName) },
    ...(order.selectedColor ? [{ label: 'Couleur', value: escapeHtml(order.selectedColor) }] : []),
    { label: 'Client', value: escapeHtml(order.customerName) },
    {
      label: 'WhatsApp',
      value: `<a href="https://wa.me/${escapeHtml(order.whatsappNumber)}" style="color:#1E60F8;">${escapeHtml(order.phone)}</a>`,
    },
    {
      label: 'Livraison',
      value: escapeHtml(
        [order.neighborhood, order.deliveryAddress].filter(Boolean).join(' — ') || '—',
      ),
    },
    { label: 'Paiement', value: escapeHtml(PAYMENT_LABEL[order.paymentType] ?? order.paymentType) },
    {
      label: 'Total',
      value: `<span style="font-size:16px;font-weight:900;">${fcfa(order.totalAmount)}</span>`,
    },
  ];
  const html = renderEmail({
    preheader: `${order.customerName} a commandé ${order.productName} (${fcfa(order.totalAmount)}).`,
    title: 'Nouvelle commande !',
    intro: `Vous avez reçu la commande <strong>${escapeHtml(order.reference)}</strong>. Confirmez-la vite avec votre client sur WhatsApp pour sécuriser la livraison.`,
    rows,
    cta: { label: 'Voir la commande', url: DASHBOARD_URL },
    accent: '#10B981',
  });
  const text = `Nouvelle commande ${order.reference}\nProduit : ${order.productName}\nClient : ${order.customerName} (${order.phone})\nTotal : ${fcfa(order.totalAmount)}\n\n${DASHBOARD_URL}`;
  await send(
    order.merchant.email,
    `Nouvelle commande ${order.reference} — ${fcfa(order.totalAmount)}`,
    html,
    text,
    'new_order',
  );
}

function destinationOf(w: Withdrawal): { method: string; phone: string } {
  const d = (w.destination ?? {}) as { method?: string; phone?: string };
  return {
    method: d.method === 'ORANGE_MONEY' ? 'Orange Money' : 'Wave',
    phone: maskPhone(d.phone ?? ''),
  };
}

export async function sendWithdrawalSentEmail(withdrawalId: string): Promise<void> {
  if (!getMailer()) return;
  const w = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { user: { select: { email: true } } },
  });
  if (!w) return;
  const dest = destinationOf(w);
  const html = renderEmail({
    preheader: `${fcfa(w.amount)} en route vers votre compte ${dest.method}.`,
    title: 'Retrait envoyé',
    intro: `Votre retrait de <strong>${fcfa(w.amount)}</strong> a été transmis. Les fonds arrivent en général en quelques minutes.`,
    rows: [
      { label: 'Montant', value: fcfa(w.amount) },
      { label: 'Vers', value: `${dest.method} · ${escapeHtml(dest.phone)}` },
      { label: 'Référence', value: escapeHtml(w.providerPayoutId ?? w.id) },
    ],
    cta: { label: 'Voir mon portefeuille', url: DASHBOARD_URL },
    outro:
      'Vous n’êtes pas à l’origine de ce retrait ? Contactez immédiatement le support WhatsApp.',
  });
  const text = `Retrait envoyé : ${fcfa(w.amount)} vers ${dest.method} ${dest.phone}.\n${DASHBOARD_URL}`;
  await send(w.user.email, `Retrait de ${fcfa(w.amount)} envoyé`, html, text, 'withdrawal_sent');
}

export async function sendWithdrawalFailedEmail(withdrawalId: string): Promise<void> {
  if (!getMailer()) return;
  const w = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { user: { select: { email: true } } },
  });
  if (!w) return;
  const dest = destinationOf(w);
  const html = renderEmail({
    preheader: `Votre retrait de ${fcfa(w.amount)} n’a pas abouti — le montant est recrédité.`,
    title: 'Retrait non effectué',
    intro: `Votre retrait de <strong>${fcfa(w.amount)}</strong> vers ${dest.method} (${escapeHtml(dest.phone)}) a été refusé par l’opérateur. <strong>Le montant a été recrédité</strong> sur votre portefeuille.`,
    rows: [
      { label: 'Montant', value: fcfa(w.amount) },
      { label: 'Raison', value: escapeHtml(w.failureReason ?? 'Refus de l’opérateur') },
    ],
    cta: { label: 'Réessayer le retrait', url: DASHBOARD_URL },
    outro:
      'Vérifiez que le numéro est bien un compte actif, puis réessayez. Le support WhatsApp peut vous aider.',
    accent: '#0F172A',
  });
  const text = `Retrait non effectué : ${fcfa(w.amount)} recrédité sur votre portefeuille.\n${DASHBOARD_URL}`;
  await send(
    w.user.email,
    `Retrait de ${fcfa(w.amount)} non effectué`,
    html,
    text,
    'withdrawal_failed',
  );
}
