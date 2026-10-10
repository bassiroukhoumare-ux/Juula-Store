// GET & POST /api/store/slots — Gestion multi-boutiques (jusqu'à 2 boutiques par compte)
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { normalizeSubdomain, subdomainProblem, SUBDOMAIN_MESSAGES } from '@/lib/store/subdomain';

const SwitchSchema = z.object({
  action: z.literal('switch'),
  slot: z.union([z.literal(1), z.literal(2)]),
});

const CreateSecondStoreSchema = z.object({
  action: z.literal('create'),
  name: z.string().trim().min(2, 'Le nom doit comporter au moins 2 caractères.').max(60),
  subdomain: z.string().trim().min(1, 'L’adresse web est requise.').max(80),
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

    try {
      const store = await prisma.store.findUnique({
        where: { userId: auth.user.sub },
      });

      if (!store) {
        return NextResponse.json(
          { error: 'STORE_NOT_FOUND', message: 'Boutique introuvable' },
          { status: 404, headers },
        );
      }

      // Compatibilité si l'instance Prisma en mémoire n'a pas encore mappé les colonnes récentes
      let activeSlot = (store as Record<string, unknown>).activeStoreSlot as number | undefined;
      let secondaryStore = (store as Record<string, unknown>).secondaryStore as
        | Record<string, unknown>
        | null
        | undefined;

      if (activeSlot === undefined || secondaryStore === undefined) {
        try {
          const rawRows: Array<{ activeStoreSlot: number | null; secondaryStore: unknown }> =
            await prisma.$queryRawUnsafe(
              `SELECT "activeStoreSlot", "secondaryStore" FROM "Store" WHERE "id" = $1 LIMIT 1`,
              store.id,
            );
          if (rawRows.length > 0) {
            activeSlot = rawRows[0]?.activeStoreSlot ?? 1;
            secondaryStore = (rawRows[0]?.secondaryStore as Record<string, unknown>) ?? null;
          }
        } catch {
          activeSlot = 1;
          secondaryStore = null;
        }
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

      return NextResponse.json(
        {
          activeSlot: activeSlot || 1,
          slot1,
          slot2: secondaryStore || null,
          maxSlots: 2,
        },
        { headers },
      );
    } catch (err) {
      console.error('[API /api/store/slots GET error]', err);
      return NextResponse.json(
        { error: 'SERVER_ERROR', message: 'Impossible de charger vos boutiques.' },
        { status: 500, headers },
      );
    }
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
      const issueMsg = parsed.error.issues[0]?.message || 'Informations invalides.';
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: issueMsg },
        { status: 400, headers },
      );
    }

    try {
      const userId = auth.user.sub;
      const store = await prisma.store.findUnique({ where: { userId } });
      if (!store) {
        return NextResponse.json(
          { error: 'STORE_NOT_FOUND', message: 'Votre compte boutique n’existe pas encore.' },
          { status: 404, headers },
        );
      }

      // 1. Action : Basculer entre boutique 1 et boutique 2
      if (parsed.data.action === 'switch') {
        const targetSlot = parsed.data.slot;

        let secStore = (store as Record<string, unknown>).secondaryStore;
        if (!secStore) {
          try {
            const rawRows: Array<{ secondaryStore: unknown }> = await prisma.$queryRawUnsafe(
              `SELECT "secondaryStore" FROM "Store" WHERE "id" = $1 LIMIT 1`,
              store.id,
            );
            secStore = rawRows[0]?.secondaryStore;
          } catch {
            secStore = null;
          }
        }

        if (targetSlot === 2 && !secStore) {
          return NextResponse.json(
            { error: 'SLOT_NOT_FOUND', message: 'La 2ème boutique n’est pas encore créée.' },
            { status: 404, headers },
          );
        }

        try {
          await prisma.store.update({
            where: { id: store.id },
            data: { activeStoreSlot: targetSlot },
          });
        } catch {
          await prisma.$executeRawUnsafe(
            `UPDATE "Store" SET "activeStoreSlot" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
            targetSlot,
            store.id,
          );
        }

        return NextResponse.json(
          {
            success: true,
            activeSlot: targetSlot,
            message: `Bascule vers la Boutique ${targetSlot} effectuée avec succès !`,
          },
          { headers },
        );
      }

      // 2. Action : Créer la 2ème boutique
      if (parsed.data.action === 'create') {
        const sub = normalizeSubdomain(parsed.data.subdomain);

        // Validation du format du sous-domaine
        const problem = subdomainProblem(sub);
        if (problem) {
          return NextResponse.json(
            { error: problem, message: SUBDOMAIN_MESSAGES[problem] },
            { status: 400, headers },
          );
        }

        // Vérifier que le sous-domaine n'est pas le même que la 1ère boutique
        if (sub === store.subdomain) {
          return NextResponse.json(
            {
              error: 'SUBDOMAIN_SAME_AS_PRIMARY',
              message:
                'Cette adresse est déjà celle de votre 1ère boutique. Choisissez une autre adresse pour votre 2ème boutique.',
            },
            { status: 400, headers },
          );
        }

        // Vérifier si le sous-domaine est déjà pris par un autre vendeur
        const existing = await prisma.store.findUnique({ where: { subdomain: sub } });
        if (existing && existing.id !== store.id) {
          return NextResponse.json(
            {
              error: 'SUBDOMAIN_TAKEN',
              message: 'Cette adresse web est déjà réservée par une autre boutique.',
            },
            { status: 409, headers },
          );
        }

        const existingAlias = await prisma.storeAlias.findUnique({ where: { subdomain: sub } });
        if (existingAlias && existingAlias.storeId !== store.id) {
          return NextResponse.json(
            {
              error: 'SUBDOMAIN_TAKEN',
              message: 'Cette adresse web est déjà réservée par une autre boutique.',
            },
            { status: 409, headers },
          );
        }

        const secondStoreData = {
          slot: 2,
          name: parsed.data.name.trim(),
          subdomain: sub,
          storeCategory: parsed.data.storeCategory || 'Général',
          storeAccent: parsed.data.storeAccent || '#235BF7',
          logoUrl: null,
          storeCoverUrl: null,
          storeTagline: `Bienvenue chez ${parsed.data.name.trim()}`,
          codEnabled: true,
          whatsappOrderEnabled: true,
          directPaymentMethods: [],
          storefrontPublished: false,
        };

        // Enregistrer l'alias de sous-domaine pour router vers la boutique
        try {
          await prisma.storeAlias.upsert({
            where: { subdomain: sub },
            create: { subdomain: sub, storeId: store.id },
            update: { storeId: store.id },
          });
        } catch (aliasErr) {
          console.warn('[storeAlias upsert error, continuing]', aliasErr);
        }

        // Sauvegarder la 2ème boutique dans la base
        try {
          await prisma.store.update({
            where: { id: store.id },
            data: {
              secondaryStore: secondStoreData,
              activeStoreSlot: 2,
            },
          });
        } catch (updateErr) {
          console.warn('[prisma.store.update fallback to SQL]', updateErr);
          await prisma.$executeRawUnsafe(
            `UPDATE "Store" SET "secondaryStore" = $1::jsonb, "activeStoreSlot" = 2, "updatedAt" = NOW() WHERE "id" = $2`,
            JSON.stringify(secondStoreData),
            store.id,
          );
        }

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

      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Action inconnue' },
        { status: 400, headers },
      );
    } catch (err) {
      console.error('[API /api/store/slots POST error]', err);
      const msg = err instanceof Error ? err.message : 'Erreur interne du serveur';
      return NextResponse.json({ error: 'SERVER_ERROR', message: msg }, { status: 500, headers });
    }
  });
}
