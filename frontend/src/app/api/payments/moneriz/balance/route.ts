import { NextResponse } from 'next/server';
import { getMonerizBalance, getMonerizConfig } from '@/lib/server/payments/moneriz';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const config = getMonerizConfig();

    if (!config.secretKey) {
      // Return simulated balance if no keys configured yet
      return NextResponse.json({
        isConfigured: false,
        currency: 'XOF',
        available: 375000,
        pendingSettlement: 185000,
        pendingWithdrawals: 0,
        nextSettlementAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
    }

    const balance = await getMonerizBalance();
    return NextResponse.json({
      isConfigured: true,
      ...balance,
    });
  } catch (error: any) {
    console.error('[Moneriz Balance Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la récupération du solde Moneriz' },
      { status: 500 }
    );
  }
}
