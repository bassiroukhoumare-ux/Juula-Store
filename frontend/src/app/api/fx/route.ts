// GET /api/fx — FCFA per US dollar, for displaying prices in USD.
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { XOF_PER_EUR } from '@/lib/money';
import { getXofPerUsd } from '@/lib/server/fx';

export async function GET(): Promise<NextResponse> {
  const { xofPerUsd, source } = await getXofPerUsd();
  return NextResponse.json(
    { xofPerUsd, xofPerEur: XOF_PER_EUR, source },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } },
  );
}
