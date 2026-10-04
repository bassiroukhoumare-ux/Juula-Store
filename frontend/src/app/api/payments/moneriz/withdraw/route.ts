import { NextResponse, type NextRequest } from 'next/server';
import { createMonerizWithdrawal, getMonerizConfig, MonerizApiError } from '@/lib/server/payments/moneriz';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const config = getMonerizConfig();
    const body = await req.json();

    const { amount, phone, name, paymentType = 'wave_money', reason } = body;

    if (!amount || amount < 1000) {
      return NextResponse.json(
        { error: 'Le montant minimum de retrait est de 1 000 FCFA' },
        { status: 400 }
      );
    }

    if (!phone || !name) {
      return NextResponse.json(
        { error: 'Numéro de téléphone et nom du bénéficiaire obligatoires' },
        { status: 400 }
      );
    }

    // Format phone with international +221 prefix if not present
    let formattedPhone = phone.trim().replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('221')) {
        formattedPhone = `+${formattedPhone}`;
      } else {
        formattedPhone = `+221${formattedPhone}`;
      }
    }

    // If Moneriz secret key is not set, simulate payout
    if (!config.secretKey) {
      console.warn('[Moneriz] MONERIZ_SECRET_KEY non configuré — simulation de retrait');
      return NextResponse.json({
        success: true,
        isSimulated: true,
        id: `wd_sim_${Date.now()}`,
        status: 'pending',
        amount: Math.round(amount),
        currency: 'XOF',
        fee: 0,
        paymentType,
        destination: { phone: formattedPhone, name },
        message: 'Demande de retrait enregistrée avec succès (simulation test)',
      });
    }

    const withdrawal = await createMonerizWithdrawal({
      amount: Math.round(amount),
      currency: 'XOF',
      country: 'SN',
      paymentType,
      destination: {
        phone: formattedPhone,
        name: name.slice(0, 100),
      },
      reason: reason || 'Retrait des ventes Juula Store',
      idempotencyKey: `wd-${Date.now()}-${Math.round(amount)}`,
    });

    return NextResponse.json({
      success: true,
      ...withdrawal,
    });
  } catch (error: any) {
    console.error('[Moneriz Withdrawal Error]', error);
    if (error instanceof MonerizApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code, param: error.param },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la demande de retrait Moneriz' },
      { status: 500 }
    );
  }
}
