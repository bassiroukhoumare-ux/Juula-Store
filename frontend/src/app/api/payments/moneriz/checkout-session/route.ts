import { NextResponse, type NextRequest } from 'next/server';
import { createMonerizCheckoutSession, getMonerizConfig, MonerizApiError } from '@/lib/server/payments/moneriz';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const config = getMonerizConfig();
    const body = await req.json();

    const {
      orderId,
      amount,
      title,
      customerName,
      customerPhone,
      integrationMode = 'iframe',
      successUrl,
      cancelUrl,
    } = body;

    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: 'Le montant minimum est de 100 FCFA' },
        { status: 400 }
      );
    }

    if (!title || !orderId) {
      return NextResponse.json(
        { error: 'Titre du produit et référence commande obligatoires' },
        { status: 400 }
      );
    }

    // Determine origin and ensure HTTPS in live mode
    const reqOrigin = req.headers.get('origin') || process.env.APP_URL || 'http://localhost:3000';
    const isLiveMode = config.secretKey.startsWith('izp_live_');
    
    // In live mode, Moneriz strictly requires HTTPS return URLs
    const safeBaseUrl = isLiveMode && !reqOrigin.startsWith('https://') 
      ? 'https://juula.store' 
      : reqOrigin;

    // If Moneriz secret key is not set yet, provide mock test session so the user can test UI immediately
    if (!config.secretKey) {
      console.warn('[Moneriz] MONERIZ_SECRET_KEY non configuré — simulation de session de test');
      const fakeToken = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return NextResponse.json({
        success: true,
        isSimulated: true,
        id: `cs_${fakeToken}`,
        checkoutUrl: `https://moneriz.com/payer/${fakeToken}`,
        embedUrl: `https://moneriz.com/integrer/${fakeToken}?parent_origin=${encodeURIComponent(reqOrigin)}`,
        status: 'open',
        amount,
        currency: 'XOF',
        reference: orderId,
      });
    }

    const safeSuccessUrl = (successUrl && successUrl.startsWith('https://'))
      ? successUrl
      : `${safeBaseUrl}/vitrine?status=success&orderId=${orderId}`;

    const safeCancelUrl = (cancelUrl && cancelUrl.startsWith('https://'))
      ? cancelUrl
      : `${safeBaseUrl}/vitrine?status=cancelled&orderId=${orderId}`;

    const session = await createMonerizCheckoutSession({
      amount: Math.round(amount),
      currency: 'XOF',
      title: title.slice(0, 100),
      reference: orderId,
      country: 'SN',
      integrationMode,
      embedOrigin: reqOrigin,
      successUrl: safeSuccessUrl,
      cancelUrl: safeCancelUrl,
      metadata: {
        orderId,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
      },
      idempotencyKey: `cs-${orderId}-${Math.round(amount)}`,
    });

    return NextResponse.json({
      success: true,
      id: session.id,
      checkoutUrl: session.checkoutUrl,
      embedUrl: session.embedUrl,
      status: session.status,
      amount: session.amount,
      currency: session.currency,
      reference: session.reference,
    });
  } catch (error: any) {
    console.error('[Moneriz Checkout Session Error]', error);
    if (error instanceof MonerizApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code, param: error.param },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: error?.message || 'Erreur interne lors de la création de session Moneriz' },
      { status: 500 }
    );
  }
}
