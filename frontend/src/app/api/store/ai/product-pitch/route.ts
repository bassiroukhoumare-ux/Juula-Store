// POST /api/store/ai/product-pitch — Choix du template visuel et argumentaire persuasif COD via Google Gemini
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import {
  generateProductTemplateAndCopyWithGemini,
  type GenerateProductPitchInput,
} from '@/lib/server/ai/product-pitch';

const RequestSchema = z.object({
  productName: z.string().trim().min(2, 'Le nom du produit est requis').max(150),
  price: z.union([z.number().nonnegative(), z.string().trim().min(1)]),
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

    const input: GenerateProductPitchInput = {
      productName: parsed.data.productName,
      price: parsed.data.price,
      apiKey: parsed.data.apiKey,
    };

    try {
      const pitch = await generateProductTemplateAndCopyWithGemini(input);
      return NextResponse.json(
        {
          success: true,
          pitch,
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
