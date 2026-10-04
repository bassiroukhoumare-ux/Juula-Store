import { NextResponse, type NextRequest } from 'next/server';
import { getMonerizConfig, verifyMonerizSignature } from '@/lib/server/payments/moneriz';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get('x-moneriz-signature') ||
      req.headers.get('x-izipaye-signature') ||
      '';

    const config = getMonerizConfig();
    const webhookSecret = config.webhookSecret;

    // Signature verification (unless in local dev without secret configured)
    if (webhookSecret) {
      const isValid = verifyMonerizSignature(rawBody, webhookSecret, signature);
      if (!isValid) {
        console.error('[Moneriz Webhook] Signature invalide ou horodatage expiré (>5min)');
        return NextResponse.json(
          { error: 'Signature Moneriz invalide' },
          { status: 401 }
        );
      }
    } else {
      console.warn(
        '[Moneriz Webhook] MONERIZ_WEBHOOK_SECRET non configuré — signature ignorée en mode développement'
      );
    }

    const event = JSON.parse(rawBody);
    const { id: eventId, type: eventType, data } = event;

    if (!eventId || !eventType) {
      return NextResponse.json({ error: 'Payload webhook incomplet' }, { status: 400 });
    }

    // 1. Dédoublonnage d'idempotence via WebhookLog
    try {
      await prisma.webhookLog.create({
        data: {
          provider: 'moneriz',
          externalId: String(eventId),
          eventType: String(eventType),
          payload: event,
          processedAt: new Date(),
        },
      });
    } catch (err: any) {
      // Si l'événement a déjà été traité (unique constraint violation), renvoyer 200 directement
      if (err?.code === 'P2002') {
        console.info(`[Moneriz Webhook] Événement ${eventId} déjà traité (idempotent).`);
        return NextResponse.json({ received: true, deduplicated: true });
      }
      console.error('[Moneriz Webhook] Erreur insertion WebhookLog:', err);
    }

    // 2. Traitement selon le type d'événement
    console.info(`[Moneriz Webhook] Traitement événement: ${eventType} (${eventId})`);

    switch (eventType) {
      case 'payment.succeeded': {
        const payment = data?.payment;
        const reference = payment?.reference || payment?.metadata?.orderId;
        const amount = payment?.amount;
        const paymentId = payment?.id;
        const paymentType = payment?.paymentType;

        console.info(
          `[Moneriz Webhook] ✅ Paiement confirmé pour commande: ${reference}, Montant: ${amount} XOF, Moyen: ${paymentType}`
        );

        if (reference) {
          // Mise à jour de la commande dans la base Prisma si existante
          try {
            await prisma.order.updateMany({
              where: {
                OR: [
                  { id: reference },
                  { providerChargeId: paymentId },
                  { idempotencyKey: `cs-${reference}-${amount}` },
                ],
              },
              data: {
                status: 'PAID',
                provider: 'moneriz',
                providerChargeId: paymentId,
                paymentMethod: paymentType || 'MONERIZ_ONLINE',
                paidAt: new Date(),
              },
            });
          } catch (dbErr) {
            console.warn('[Moneriz Webhook] Note DB Order update:', dbErr);
          }
        }
        break;
      }

      case 'payment.failed': {
        const payment = data?.payment;
        const reference = payment?.reference || payment?.metadata?.orderId;
        console.warn(`[Moneriz Webhook] ❌ Échec de paiement pour commande ${reference}:`, payment?.failureCode);
        if (reference) {
          try {
            await prisma.order.updateMany({
              where: { id: reference },
              data: { status: 'FAILED' },
            });
          } catch (_) {}
        }
        break;
      }

      case 'payment.expired': {
        const payment = data?.payment;
        const reference = payment?.reference || payment?.metadata?.orderId;
        console.info(`[Moneriz Webhook] ⏰ Session expirée pour commande ${reference}`);
        if (reference) {
          try {
            await prisma.order.updateMany({
              where: { id: reference, status: 'PENDING' },
              data: { status: 'EXPIRED' },
            });
          } catch (_) {}
        }
        break;
      }

      case 'withdrawal.completed': {
        const withdrawal = data?.withdrawal;
        const withdrawalId = withdrawal?.id;
        console.info(`[Moneriz Webhook] 💸 Retrait validé & payé : ${withdrawalId}`);
        if (withdrawalId) {
          try {
            await prisma.withdrawal.updateMany({
              where: { providerPayoutId: withdrawalId },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
              },
            });
          } catch (_) {}
        }
        break;
      }

      case 'withdrawal.failed': {
        const withdrawal = data?.withdrawal;
        const withdrawalId = withdrawal?.id;
        console.warn(`[Moneriz Webhook] ⚠️ Retrait rejeté : ${withdrawalId}`);
        if (withdrawalId) {
          try {
            await prisma.withdrawal.updateMany({
              where: { providerPayoutId: withdrawalId },
              data: {
                status: 'FAILED',
                failureReason: withdrawal?.failureCode || 'Rejet prestataire',
              },
            });
          } catch (_) {}
        }
        break;
      }

      default:
        console.info(`[Moneriz Webhook] Événement ignoré: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Moneriz Webhook Exception]', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur interne traitement webhook Moneriz' },
      { status: 500 }
    );
  }
}
