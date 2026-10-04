// GET /api/payments/moneriz/config — Moneriz integration status (SUPERADMIN).
//
// Read-only: keys are managed through deployment env vars (Vercel), never
// through an HTTP endpoint. The previous POST that wrote .env.local from an
// unauthenticated request has been removed.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/middleware';
import { getMonerizConfig } from '@/lib/server/payments/moneriz';

export async function GET(): Promise<NextResponse> {
  const admin = await requireAdmin('SUPERADMIN');
  if (admin instanceof NextResponse) return admin;

  const config = getMonerizConfig();
  const isLive = config.secretKey.startsWith('izp_live_');
  const isTest = config.secretKey.startsWith('izp_test_');
  return NextResponse.json({
    isConfigured: Boolean(config.secretKey),
    mode: isLive ? 'live' : isTest ? 'test' : 'unconfigured',
    hasSecretKey: Boolean(config.secretKey),
    hasPublicKey: Boolean(config.publicKey),
    hasWebhookSecret: Boolean(config.webhookSecret),
    apiUrl: config.apiUrl,
  });
}
