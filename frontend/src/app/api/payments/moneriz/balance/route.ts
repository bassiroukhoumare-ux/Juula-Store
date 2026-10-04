// GET /api/payments/moneriz/balance — the PLATFORM's Moneriz account balance
// (all merchants' money combined). Admin-only; merchants read their own
// wallet from GET /api/wallet.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/middleware';
import { getMonerizBalance, getMonerizConfig } from '@/lib/server/payments/moneriz';
import { log } from '@/lib/server/observability/log';

export async function GET(): Promise<NextResponse> {
  const admin = await requireAdmin('ADMIN');
  if (admin instanceof NextResponse) return admin;

  if (!getMonerizConfig().secretKey) {
    return NextResponse.json({ error: 'PAYMENT_PROVIDER_UNCONFIGURED' }, { status: 503 });
  }
  try {
    const balance = await getMonerizBalance();
    return NextResponse.json({ isConfigured: true, ...balance });
  } catch (err) {
    log.error('moneriz.balance_failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'PROVIDER_UNAVAILABLE' }, { status: 502 });
  }
}
