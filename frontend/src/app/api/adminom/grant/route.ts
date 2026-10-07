// POST /api/adminom/grant — manual PRO access { userId, duration, until?, note }.
// Store goes PRO at once, a « Manuel / Offert » subscription row is added and
// the action is written to the audit log (AdminAction).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { adminomActorId, requestMeta, requireAdminom } from '@/lib/server/adminom/session';
import { GRANT_DURATIONS, grantPro } from '@/lib/server/adminom/data';

const Body = z.object({
  userId: z.string().min(1).max(40),
  duration: z.enum(GRANT_DURATIONS),
  until: z.string().datetime({ offset: true }).nullable().optional(),
  note: z.string().max(300).default(''),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const denied = await requireAdminom(req);
    if (denied) return denied;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Choisissez un compte et une durée.' },
        { status: 400, headers },
      );
    }
    const result = await grantPro(
      { ...parsed.data, until: parsed.data.until ?? null },
      { actorId: await adminomActorId(), ...requestMeta(req) },
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: 'GRANT_FAILED', message: result.message },
        { status: result.status, headers },
      );
    }
    return NextResponse.json(result, { headers });
  });
}
