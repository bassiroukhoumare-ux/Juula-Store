// POST /api/store/ai/copywriting — Générateur de copy persuasif E-commerce Africain via Gemini & Fallback Expert
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import {
  generateCopywritingWithGemini,
  type GenerateCopywritingInput,
} from '@/lib/server/ai/copywriting';

const RequestSchema = z.object({
  productName: z.string().trim().min(2, 'Le nom du produit est requis (min 2 caractères)').max(150),
  storeName: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  price: z.number().nonnegative().optional(),
  originalPrice: z.number().nonnegative().optional(),
  deliveryFee: z.number().nonnegative().optional(),
  deliveryFree: z.boolean().optional(),
  deliveryNotice: z.string().trim().max(200).optional(),
  codEnabled: z.boolean().optional(),
  whatsapp: z.string().trim().max(50).optional(),
  city: z.string().trim().max(100).optional(),
  apiKey: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const rawBody = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_FAILED',
          message: parsed.error.issues[0]?.message || 'Données invalides',
        },
        { status: 400, headers },
      );
    }

    const data = parsed.data;

    // Récupérer le contexte boutique si non fourni dans le payload
    let storeName = data.storeName;
    let whatsapp = data.whatsapp;
    let city = data.city;

    if (!storeName || !whatsapp || !city) {
      const store = await prisma.store.findUnique({
        where: { userId: auth.user.sub },
        select: { name: true, whatsapp: true, city: true },
      });
      if (store) {
        if (!storeName && store.name) storeName = store.name;
        if (!whatsapp && store.whatsapp) whatsapp = store.whatsapp;
        if (!city && store.city) city = store.city;
      }
    }

    const input: GenerateCopywritingInput = {
      productName: data.productName,
      storeName,
      category: data.category,
      price: data.price,
      originalPrice: data.originalPrice,
      deliveryFee: data.deliveryFee,
      deliveryFree: data.deliveryFree,
      deliveryNotice: data.deliveryNotice,
      codEnabled: data.codEnabled,
      whatsapp,
      city: city || 'Dakar',
      apiKey: data.apiKey,
    };

    try {
      const copy = await generateCopywritingWithGemini(input);
      return NextResponse.json(
        {
          success: true,
          copy,
        },
        { headers },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de génération';
      return NextResponse.json(
        {
          error: 'GENERATION_FAILED',
          message,
        },
        { status: 500, headers },
      );
    }
  });
}
