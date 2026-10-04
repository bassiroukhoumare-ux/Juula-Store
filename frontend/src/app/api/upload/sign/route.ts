// POST /api/upload/sign — signature for a DIRECT browser → Cloudinary upload.
//
// Why direct: Vercel functions reject request bodies over 4.5 MB, so phone
// photos and any video can't transit through /api/upload. The browser now
// uploads straight to Cloudinary with a short-lived signature issued here,
// only to signed-in merchants, constrained to:
//   - their own folder (juula/<userId>/<kind>),
//   - an allow-list of formats per kind (Cloudinary rejects anything else
//     after inspecting the file itself),
//   - a timestamp Cloudinary refuses after 1 hour.
// The API secret never leaves the server.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { MEDIA_RULES, type MediaKind } from '@/lib/upload-rules';

const Body = z.object({ kind: z.enum(['image', 'video', 'audio']) });

export async function POST(req: NextRequest): Promise<NextResponse> {
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
        { error: 'VALIDATION_FAILED', message: 'Type de fichier inconnu.' },
        { status: 400, headers },
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';
    const apiKey = process.env.CLOUDINARY_API_KEY ?? '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET ?? '';
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        {
          error: 'STORAGE_NOT_CONFIGURED',
          message: 'Le stockage des médias n’est pas configuré sur le serveur.',
        },
        { status: 503, headers },
      );
    }

    const kind: MediaKind = parsed.data.kind;
    const rule = MEDIA_RULES[kind];
    const params = {
      timestamp: Math.floor(Date.now() / 1000),
      folder: `juula/${auth.user.sub}/${kind}`,
      allowed_formats: rule.formats.join(','),
    };
    const signature = cloudinary.utils.api_sign_request(params, apiSecret);

    return NextResponse.json(
      {
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${rule.resourceType}/upload`,
        apiKey,
        signature,
        ...params,
      },
      { headers },
    );
  });
}
