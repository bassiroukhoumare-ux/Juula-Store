// PATCH /api/store/profile — set the store name and/or its public address
// (<subdomain>.juula.store). The first call is the end of onboarding and
// triggers the welcome email.
export const runtime = 'nodejs';

import 'server-only';
import { after, NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { updateStoreProfile } from '@/lib/server/store/profile';
import { sendWelcomeEmailOnce } from '@/lib/server/store/notify';

const Body = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    subdomain: z.string().trim().min(1).max(80).optional(),
    logoUrl: z.string().url().max(500).nullable().optional(),
    whatsapp: z.string().trim().min(6).max(25).optional(),
    onlineOnly: z.boolean().optional(),
    displayCurrency: z.enum(['XOF', 'EUR', 'USD']).optional(),
    address: z.string().trim().max(200).nullable().optional(),
    city: z.string().trim().max(80).nullable().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), { message: 'Nothing to update' });

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_FAILED',
          message: 'Informations invalides (nom : 2 à 60 caractères).',
        },
        { status: 400, headers },
      );
    }

    const result = await updateStoreProfile(auth.user.sub, parsed.data);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: result.status, headers },
      );
    }
    if (result.firstSetup) {
      const userId = auth.user.sub;
      after(() => sendWelcomeEmailOnce(userId));
    }
    return NextResponse.json({ store: result.profile }, { headers });
  });
}
