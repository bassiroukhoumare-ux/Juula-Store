// POST /api/store/ai/branding — Générateur d'identité de boutique via Google Gemini (Marché Africain)
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import {
  generateStoreBrandingWithGemini,
  type GenerateBrandingInput,
} from '@/lib/server/ai/branding';

const RequestSchema = z.object({
  userIdea: z.string().trim().min(3, 'Veuillez décrire votre idée (min 3 caractères)').max(500),
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

    const input: GenerateBrandingInput = {
      userIdea: parsed.data.userIdea,
      apiKey: parsed.data.apiKey,
    };

    try {
      const branding = await generateStoreBrandingWithGemini(input);
      return NextResponse.json(
        {
          success: true,
          branding,
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
