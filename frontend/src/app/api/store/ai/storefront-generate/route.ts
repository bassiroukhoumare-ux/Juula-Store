// POST /api/store/ai/storefront-generate — Générateur IA complet pour le site de la boutique
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import {
  generateStorefrontWithGemini,
  type StorefrontAiGenerateInput,
} from '@/lib/server/ai/storefront-generator';

const RequestSchema = z.object({
  storeName: z.string().trim().max(100).optional(),
  storeCategory: z.string().trim().max(80).optional(),
  accentColor: z.string().trim().max(20).optional(),
  codEnabled: z.boolean().optional(),
  whatsapp: z.string().trim().max(50).optional(),
  apiKey: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const raw = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: parsed.error.issues[0]?.message || 'Invalide' },
        { status: 400, headers },
      );
    }

    const userId = auth.user.sub;
    const store = await prisma.store.findUnique({ where: { userId } });

    // Récupérer les titres des produits pour enrichir la génération
    const products = await prisma.product.findMany({
      where: { userId },
      select: { internalName: true },
      take: 6,
    });

    const input: StorefrontAiGenerateInput = {
      storeName: parsed.data.storeName || store?.name || 'Ma Boutique',
      storeCategory: parsed.data.storeCategory || store?.storeCategory || 'Général',
      accentColor: parsed.data.accentColor || store?.storeAccent || '#235BF7',
      productTitles: products.map((p) => p.internalName),
      codEnabled: parsed.data.codEnabled ?? store?.codEnabled ?? true,
      whatsapp: parsed.data.whatsapp || store?.whatsapp || undefined,
      apiKey: parsed.data.apiKey,
    };

    try {
      const generated = await generateStorefrontWithGemini(input);
      return NextResponse.json({ success: true, generated }, { headers });
    } catch (err) {
      return NextResponse.json(
        { error: 'GENERATION_FAILED', message: (err as Error).message },
        { status: 500, headers },
      );
    }
  });
}
