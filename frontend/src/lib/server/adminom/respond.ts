import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { ModResult } from './moderation';
import { adminomActorId, requestMeta } from './session';

/** Author + request metadata of an /adminom action (audit log). */
export async function adminMeta(req: NextRequest) {
  return { actorId: await adminomActorId(), ...requestMeta(req) };
}

export function respond<T extends object>(result: ModResult<T>, requestId: string): NextResponse {
  const headers = { 'x-request-id': requestId };
  if (!result.ok) {
    return NextResponse.json(
      { error: 'ADMIN_ACTION_FAILED', message: result.message },
      { status: result.status, headers },
    );
  }
  return NextResponse.json(result, { headers });
}

export function invalid(requestId: string, message = 'Requête invalide.'): NextResponse {
  return NextResponse.json(
    { error: 'VALIDATION_FAILED', message },
    { status: 400, headers: { 'x-request-id': requestId } },
  );
}
