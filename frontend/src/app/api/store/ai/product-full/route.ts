// POST /api/store/ai/product-full — Génération intégrale du contenu produit (Arguments, Description, FAQ, Comparatif, Avis)
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { guardAiRequest } from '@/lib/server/ai/guard';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import {
  generateFullProductPageWithGemini,
  type FullProductGenerationInput,
} from '@/lib/server/ai/product-page-wizard';

const RequestSchema = z.object({
  productName: z.string().trim().min(2, 'Le nom du produit est requis').max(150),
  category: z.string().trim().max(80).optional(),
  price: z.number().nonnegative().optional(),
  deliveryFree: z.boolean().optional(),
  deliveryFee: z.number().nonnegative().optional(),
  storeName: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  apiKey: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    // CSRF + session + per-merchant AI budget.
    const gate = await guardAiRequest(req, headers);
    if (gate instanceof NextResponse) return gate;
    const auth = { user: { sub: gate.userId } };

    const raw = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: parsed.error.issues[0]?.message || 'Invalide' },
        { status: 400, headers },
      );
    }

    const data = parsed.data;
    let storeName = data.storeName;
    let city = data.city;

    if (!storeName || !city) {
      const store = await prisma.store.findUnique({
        where: { userId: auth.user.sub },
        select: { name: true, city: true },
      });
      if (store) {
        if (!storeName && store.name) storeName = store.name;
        if (!city && store.city) city = store.city;
      }
    }

    const input: FullProductGenerationInput = {
      productName: data.productName,
      category: data.category,
      price: data.price,
      deliveryFree: data.deliveryFree,
      deliveryFee: data.deliveryFee,
      storeName,
      city: city || 'Dakar',
      apiKey: data.apiKey,
    };

    try {
      const generated = await generateFullProductPageWithGemini(input);
      return NextResponse.json({ success: true, generated }, { headers });
    } catch (err) {
      return NextResponse.json(
        { error: 'GENERATION_FAILED', message: (err as Error).message },
        { status: 500, headers },
      );
    }
  });
}
