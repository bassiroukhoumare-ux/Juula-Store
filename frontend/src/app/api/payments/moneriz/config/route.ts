import { NextResponse, type NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { getMonerizConfig } from '@/lib/server/payments/moneriz';

export const runtime = 'nodejs';

export async function GET() {
  const config = getMonerizConfig();
  const isConfigured = !!config.secretKey;
  const isLive = config.secretKey.startsWith('izp_live_');
  const isTest = config.secretKey.startsWith('izp_test_');

  return NextResponse.json({
    isConfigured,
    mode: isLive ? 'live' : isTest ? 'test' : 'unconfigured',
    publicKey: config.publicKey ? `${config.publicKey.slice(0, 14)}...` : '',
    hasSecretKey: !!config.secretKey,
    hasWebhookSecret: !!config.webhookSecret,
    apiUrl: config.apiUrl,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { secretKey, publicKey, webhookSecret } = await req.json();

    if (!secretKey) {
      return NextResponse.json(
        { error: 'La clé secrète Moneriz est obligatoire' },
        { status: 400 }
      );
    }

    // Persist to .env.local
    const envFile = path.join(/*turbopackIgnore: true*/ process.cwd(), '.env.local');

    const linesToSet: Record<string, string> = {
      MONERIZ_SECRET_KEY: secretKey.trim(),
      MONERIZ_PUBLIC_KEY: (publicKey || '').trim(),
      NEXT_PUBLIC_MONERIZ_PUBLIC_KEY: (publicKey || '').trim(),
      MONERIZ_WEBHOOK_SECRET: (webhookSecret || '').trim(),
    };

    try {
      let content = '';
      if (fs.existsSync(envFile)) {
        content = fs.readFileSync(envFile, 'utf8');
      }

      Object.entries(linesToSet).forEach(([key, val]) => {
        if (!val) return;
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          content = content.replace(regex, `${key}="${val}"`);
        } else {
          content += `\n${key}="${val}"`;
        }
      });

      fs.writeFileSync(envFile, content.trim() + '\n', 'utf8');
    } catch (_) {}

    process.env.MONERIZ_SECRET_KEY = secretKey.trim();
    if (publicKey) {
      process.env.MONERIZ_PUBLIC_KEY = publicKey.trim();
      process.env.NEXT_PUBLIC_MONERIZ_PUBLIC_KEY = publicKey.trim();
    }
    if (webhookSecret) {
      process.env.MONERIZ_WEBHOOK_SECRET = webhookSecret.trim();
    }

    return NextResponse.json({
      success: true,
      message: 'Clés Moneriz enregistrées avec succès',
    });
  } catch (error: any) {
    console.error('[Moneriz Config Save Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la sauvegarde des clés' },
      { status: 500 }
    );
  }
}
