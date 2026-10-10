// POST /api/store/ai/product-names — Suggestions de noms de produit accrocheurs
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { guardAiRequest } from '@/lib/server/ai/guard';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { generateProductNameSuggestionsWithGemini } from '@/lib/server/ai/product-page-wizard';

const RequestSchema = z.object({
  baseIdea: z.string().trim().min(2, 'Veuillez saisir au moins 2 caractères').max(150),
  category: z.string().trim().max(80).optional(),
  apiKey: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    // CSRF + session + per-merchant AI budget.
    const gate = await guardAiRequest(req, headers);
    if (gate instanceof NextResponse) return gate;

    const raw = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: parsed.error.issues[0]?.message || 'Invalide' },
        { status: 400, headers },
      );
    }

    try {
      const result = await generateProductNameSuggestionsWithGemini(parsed.data);
      return NextResponse.json({ success: true, ...result }, { headers });
    } catch (err) {
      return NextResponse.json(
        { error: 'GENERATION_FAILED', message: (err as Error).message },
        { status: 500, headers },
      );
    }
  });
}
