// GET & POST /api/store/slots — Gestion multi-boutiques (jusqu'à 2 boutiques par compte)
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { normalizeSubdomain } from '@/lib/store/subdomain';

const SwitchSchema = z.object({
  action: z.literal('switch'),
  slot: z.union([z.literal(1), z.literal(2)]),
});

const CreateSecondStoreSchema = z.object({
  action: z.literal('create'),
  name: z.string().trim().min(2).max(60),
  subdomain: z.string().trim().min(1).max(80),
  storeCategory: z.string().trim().max(80).optional(),
  storeAccent: z.string().trim().max(20).optional(),
});

const PostSchema = z.discriminatedUnion('action', [SwitchSchema, CreateSecondStoreSchema]);

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const store = await prisma.store.findUnique({
      where: { userId: auth.user.sub },
    });

    if (!store) {
      return NextResponse.json({ error: 'STORE_NOT_FOUND' }, { status: 404, headers });
    }

    const slot1 = {
      slot: 1,
      name: store.name,
      subdomain: store.subdomain,
      logoUrl: store.logoUrl,
      storeCoverUrl: store.storeCoverUrl,
      storeCategory: store.storeCategory,
      storeAccent: store.storeAccent,
      storeTagline: store.storeTagline,
      codEnabled: store.codEnabled,
      whatsappOrderEnabled: store.whatsappOrderEnabled,
      storefrontPublished: store.storefrontPublished,
    };

    const slot2 = store.secondaryStore ? (store.secondaryStore as Record<string, unknown>) : null;

    return NextResponse.json(
      {
        activeSlot: store.activeStoreSlot || 1,
        slot1,
        slot2,
        maxSlots: 2,
      },
      { headers },
    );
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const headers = { 'x-request-id': ctx.requestId };
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const raw = await req.json().catch(() => null);
    const parsed = PostSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: parsed.error.issues[0]?.message || 'Invalide' },
        { status: 400, headers },
      );
    }

    const userId = auth.user.sub;
    const store = await prisma.store.findUnique({ where: { userId } });
    if (!store) {
      return NextResponse.json({ error: 'STORE_NOT_FOUND' }, { status: 404, headers });
    }

    if (parsed.data.action === 'switch') {
      const targetSlot = parsed.data.slot;
      if (targetSlot === 2 && !store.secondaryStore) {
        return NextResponse.json(
          { error: 'SLOT_NOT_FOUND', message: 'La 2ème boutique n’est pas encore créée.' },
          { status: 404, headers },
        );
      }

      await prisma.store.update({
        where: { id: store.id },
        data: { activeStoreSlot: targetSlot },
      });

      return NextResponse.json(
        {
          success: true,
          activeSlot: targetSlot,
          message: `Bascule vers la Boutique ${targetSlot} effectuée !`,
        },
        { headers },
      );
    }

    // Action = create (Créer la 2ème boutique)
    if (parsed.data.action === 'create') {
      const sub = normalizeSubdomain(parsed.data.subdomain);

      // Vérifier si le sous-domaine est libre
      const existing = await prisma.store.findUnique({ where: { subdomain: sub } });
      const existingAlias = await prisma.storeAlias.findUnique({ where: { subdomain: sub } });
      if (
        (existing && existing.id !== store.id) ||
        (existingAlias && existingAlias.storeId !== store.id)
      ) {
        return NextResponse.json(
          { error: 'SUBDOMAIN_TAKEN', message: 'Cette adresse web est déjà réservée.' },
          { status: 409, headers },
        );
      }

      const secondStoreData = {
        slot: 2,
        name: parsed.data.name,
        subdomain: sub,
        storeCategory: parsed.data.storeCategory || 'Général',
        storeAccent: parsed.data.storeAccent || '#235BF7',
        logoUrl: null,
        storeCoverUrl: null,
        storeTagline: `Bienvenue chez ${parsed.data.name}`,
        codEnabled: true,
        whatsappOrderEnabled: true,
        directPaymentMethods: [],
        storefrontPublished: false,
      };

      // Enregistrer comme alias pour que https://<subdomain>.juula.store pointe vers ce magasin
      await prisma.storeAlias.upsert({
        where: { subdomain: sub },
        create: { subdomain: sub, storeId: store.id },
        update: { storeId: store.id },
      });

      await prisma.store.update({
        where: { id: store.id },
        data: {
          secondaryStore: secondStoreData,
          activeStoreSlot: 2,
        },
      });

      return NextResponse.json(
        {
          success: true,
          activeSlot: 2,
          slot2: secondStoreData,
          message: 'Votre 2ème boutique a été créée avec succès !',
        },
        { headers },
      );
    }

    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400, headers });
  });
}
