// POST /api/account/delete/code — step 3 of the account deletion flow.
//   body: { email } — must be the signed-in account's e-mail, typed by hand.
//   Sends a 6-digit code valid 2 minutes. Rate limits: one code per minute,
//   5 per hour (429 + Retry-After).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { deletionBlockers, sameEmail, sendDeletionCode } from '@/lib/server/account/deletion';

const Body = z.object({ email: z.string().trim().min(3).max(254) }).strict();

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const headers = { 'x-request-id': ctx.requestId };

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Saisissez votre adresse e-mail.' },
        { status: 400, headers },
      );
    }
    const user = await prisma.user.findUnique({
      where: { id: auth.user.sub },
      select: { email: true },
    });
    if (!user || !sameEmail(parsed.data.email, user.email)) {
      return NextResponse.json(
        {
          error: 'EMAIL_MISMATCH',
          message: 'Cette adresse ne correspond pas à l’e-mail de votre compte.',
        },
        { status: 400, headers },
      );
    }
    const blockers = await deletionBlockers(auth.user.sub);
    if (blockers.length) {
      return NextResponse.json(
        {
          error: 'DELETION_BLOCKED',
          message: 'Votre compte ne peut pas encore être supprimé.',
          blockers,
        },
        { status: 409, headers },
      );
    }

    const result = await sendDeletionCode(auth.user.sub, user.email);
    if (!result.ok) {
      if (result.error === 'EMAIL_UNAVAILABLE') {
        return NextResponse.json(
          {
            error: result.error,
            message: 'L’envoi de l’e-mail a échoué. Réessayez dans un instant.',
          },
          { status: 503, headers },
        );
      }
      return NextResponse.json(
        {
          error: result.error,
          message:
            result.error === 'RESEND_TOO_SOON'
              ? `Patientez ${result.retryAfterSec} s avant de redemander un code.`
              : 'Trop de codes demandés. Réessayez plus tard.',
          retryAfterSec: result.retryAfterSec,
        },
        { status: 429, headers: { ...headers, 'Retry-After': String(result.retryAfterSec) } },
      );
    }
    return NextResponse.json(
      { expiresAt: result.expiresAt.toISOString(), resendAt: result.resendAt.toISOString() },
      { headers },
    );
  });
}
