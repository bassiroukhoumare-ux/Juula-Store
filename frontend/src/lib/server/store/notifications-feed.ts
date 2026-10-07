import 'server-only';
// Merchant notification feed (cloche du tableau de bord).
//
// Built from the source of truth — orders and withdrawals of the last 90
// days — so every notification is real and points to an existing order or
// withdrawal. NotificationState only remembers what was read / deleted.
import { prisma } from '@/lib/server/prisma';
import type { MerchantNotification } from '@/lib/store/notification-types';

const WINDOW_DAYS = 90;
const MAX_ITEMS = 100;

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Dakar',
});
const money = (n: number) =>
  `${Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;

function paymentLabel(type: string, methodName: string | null): string {
  if (type === 'cod') return 'Paiement à la livraison';
  if (type === 'online_momo') return 'Mobile Money (en ligne)';
  if (type === 'whatsapp') return 'Commande WhatsApp';
  if (type === 'online_wave') return 'Wave (en ligne)';
  if (type === 'online_orange') return 'Orange Money (en ligne)';
  if (type === 'direct') return `Paiement direct · ${methodName ?? 'lien du vendeur'}`;
  return type;
}

export async function buildNotificationFeed(userId: string): Promise<{
  items: MerchantNotification[];
  unread: number;
}> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);
  const [orders, withdrawals, disputes] = await Promise.all([
    prisma.storeOrder.findMany({
      where: { merchantId: userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: MAX_ITEMS,
    }),
    prisma.withdrawal.findMany({
      where: { userId, requestedAt: { gte: since } },
      orderBy: { requestedAt: 'desc' },
      take: 50,
    }),
    // Disputes handled by the administration (any age while open).
    prisma.storeOrder.findMany({
      where: {
        merchantId: userId,
        OR: [{ isFrozen: true }, { disputeClosedAt: { gte: since } }],
      },
      orderBy: { frozenAt: 'desc' },
      take: 50,
    }),
  ]);

  const all: Omit<MerchantNotification, 'read'>[] = [];
  for (const o of orders) {
    const details = [
      `Client : ${o.customerName} · ${o.phone}`,
      `Produit : ${o.productName}`,
      `Montant : ${money(o.totalAmount)}`,
      `Paiement : ${paymentLabel(o.paymentType, o.paymentMethodName)}`,
      ...(o.deliveryAddress || o.neighborhood
        ? [`Adresse : ${o.deliveryAddress || o.neighborhood}`]
        : []),
    ];
    all.push({
      key: `order:${o.id}`,
      kind: 'order',
      title: `Nouvelle commande ${o.reference}`,
      summary: `${o.customerName} · ${money(o.totalAmount)}`,
      details,
      at: o.createdAt.toISOString(),
      when: dateFmt.format(o.createdAt),
      target: { tab: 'kanban', order: o.reference },
    });
    if (o.paymentStatus === 'paid' && o.paidAt) {
      all.push({
        key: `paid:${o.id}`,
        kind: 'payment',
        title: `Paiement reçu · ${o.reference}`,
        summary: `${money(o.totalAmount)} payés en ligne par ${o.customerName}`,
        details: [
          `Montant : ${money(o.totalAmount)}`,
          ...(o.netAmount !== null ? [`Crédité sur votre solde : ${money(o.netAmount)}`] : []),
          ...(o.availableAt ? [`Retirable à partir du ${dateFmt.format(o.availableAt)}`] : []),
        ],
        at: o.paidAt.toISOString(),
        when: dateFmt.format(o.paidAt),
        target: { tab: 'kanban', order: o.reference },
      });
    }
    if (o.paymentStatus === 'pending_direct') {
      all.push({
        key: `direct:${o.id}`,
        kind: 'action',
        title: `Paiement à vérifier · ${o.reference}`,
        summary: `${o.customerName} doit vous payer ${money(o.totalAmount)} via ${o.paymentMethodName ?? 'votre lien'}`,
        details: [
          'Vérifiez la réception sur votre compte, puis confirmez le paiement dans la commande.',
        ],
        at: o.createdAt.toISOString(),
        when: dateFmt.format(o.createdAt),
        target: { tab: 'kanban', order: o.reference },
      });
    }
  }
  for (const w of withdrawals) {
    const dest = (w.destination ?? {}) as { method?: string; phone?: string };
    const to = `${dest.method === 'ORANGE_MONEY' ? 'Orange Money' : 'Wave'}${dest.phone ? ` (${dest.phone})` : ''}`;
    const at = w.completedAt ?? w.processedAt ?? w.requestedAt;
    const status =
      w.status === 'COMPLETED'
        ? { title: 'Retrait effectué', kind: 'payment' as const }
        : w.status === 'FAILED' || w.status === 'CANCELLED'
          ? { title: 'Retrait non effectué', kind: 'alert' as const }
          : { title: 'Retrait en cours', kind: 'info' as const };
    all.push({
      key: `withdrawal:${w.id}:${w.status}`,
      kind: status.kind,
      title: status.title,
      summary: `${money(w.amount)} vers ${to}`,
      details: [
        `Montant : ${money(w.amount)}`,
        `Destination : ${to}`,
        ...(w.status === 'FAILED' || w.status === 'CANCELLED'
          ? ['Le montant a été recrédité sur votre solde.']
          : []),
      ],
      at: at.toISOString(),
      when: dateFmt.format(at),
      target: { tab: 'wallet' },
    });
  }

  for (const o of disputes) {
    const at = (o.isFrozen ? o.frozenAt : o.disputeClosedAt) ?? o.updatedAt;
    const kind = o.isFrozen ? 'frozen' : o.disputeStatus === 'refunded' ? 'refunded' : 'released';
    const content = {
      frozen: {
        kind: 'alert' as const,
        title: `Paiement suspendu · ${o.reference}`,
        summary: `Paiement de la commande #${o.reference} suspendu par l’administration suite à un litige en cours.`,
      },
      released: {
        kind: 'payment' as const,
        title: `Litige clos · ${o.reference}`,
        summary: `Les fonds de la commande #${o.reference} sont de nouveau disponibles sur votre solde.`,
      },
      refunded: {
        kind: 'alert' as const,
        title: `Client remboursé · ${o.reference}`,
        summary: `La commande #${o.reference} a été remboursée au client à l’issue du litige.`,
      },
    }[kind];
    all.push({
      key: `dispute:${o.id}:${kind}`,
      ...content,
      details: [
        `Montant : ${money(o.netAmount ?? o.totalAmount)}`,
        ...(o.frozenReason ? [`Motif : ${o.frozenReason}`] : []),
        ...(kind === 'frozen'
          ? ['Ce montant ne peut pas être retiré tant que le litige n’est pas résolu.']
          : []),
      ],
      at: at.toISOString(),
      when: dateFmt.format(at),
      target: { tab: 'wallet' },
    });
  }

  // Read / dismissed flags of the items shown only (the whole history grows
  // with every notification ever opened; the feed is polled every minute).
  const states = await prisma.notificationState.findMany({
    where: { userId, key: { in: all.map((n) => n.key) } },
  });
  const state = new Map(states.map((s) => [s.key, s]));
  const items = all
    .filter((n) => !state.get(n.key)?.deletedAt)
    .map((n) => ({ ...n, read: Boolean(state.get(n.key)?.readAt) }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_ITEMS);
  return { items, unread: items.filter((n) => !n.read).length };
}

/** Mark notifications read / unread / deleted. Keys are the feed's own keys. */
export async function updateNotificationState(
  userId: string,
  keys: string[],
  action: 'read' | 'unread' | 'delete',
): Promise<void> {
  const now = new Date();
  const data =
    action === 'read'
      ? { readAt: now }
      : action === 'unread'
        ? { readAt: null }
        : { deletedAt: now, readAt: now };
  await prisma.$transaction(
    keys.map((key) =>
      prisma.notificationState.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key, ...data },
        update: data,
      }),
    ),
  );
}
