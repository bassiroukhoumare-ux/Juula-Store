// Store identity: display name + public subdomain (<sub>.juula.store).
import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { getStoreCode } from '@/lib/orderUtils';
import { configToJson, productConfig } from '@/lib/server/store/products';
import {
  normalizeSubdomain,
  subdomainProblem,
  SUBDOMAIN_MESSAGES,
  type SubdomainProblem,
} from '@/lib/store/subdomain';

export type Availability =
  | { available: true; subdomain: string }
  | { available: false; subdomain: string; reason: SubdomainProblem | 'TAKEN'; message: string };

/**
 * A subdomain is free when no store uses it and no *other* store holds it
 * as an alias (old address kept for redirects). A store may take back one
 * of its own former addresses.
 */
export async function checkSubdomain(raw: string, storeId?: string): Promise<Availability> {
  const subdomain = normalizeSubdomain(raw);
  const problem = subdomainProblem(subdomain);
  if (problem)
    return { available: false, subdomain, reason: problem, message: SUBDOMAIN_MESSAGES[problem] };

  const [owner, alias] = await Promise.all([
    prisma.store.findUnique({ where: { subdomain }, select: { id: true } }),
    prisma.storeAlias.findUnique({ where: { subdomain }, select: { storeId: true } }),
  ]);
  const takenByOther = (owner && owner.id !== storeId) || (alias && alias.storeId !== storeId);
  if (takenByOther) {
    return { available: false, subdomain, reason: 'TAKEN', message: SUBDOMAIN_MESSAGES.TAKEN };
  }
  return { available: true, subdomain };
}

export interface StoreProfile {
  name: string | null;
  subdomain: string | null;
}

export type ProfileUpdateResult =
  | { ok: true; profile: StoreProfile; firstSetup: boolean }
  | { ok: false; status: number; error: string; message: string };

/**
 * Set the store name and/or subdomain. Changing the subdomain keeps the old
 * one as an alias (shared links redirect). The name is also written into
 * every product page (store-wide `storeName` / order prefix `storeCode`).
 */
export async function updateStoreProfile(
  userId: string,
  input: { name?: string | undefined; subdomain?: string | undefined },
): Promise<ProfileUpdateResult> {
  const store = await prisma.store.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  const firstSetup = !store.subdomain;

  let nextSub = store.subdomain;
  if (input.subdomain !== undefined) {
    const check = await checkSubdomain(input.subdomain, store.id);
    if (!check.available)
      return { ok: false, status: 409, error: check.reason, message: check.message };
    nextSub = check.subdomain;
  }
  if (!nextSub) {
    return {
      ok: false,
      status: 400,
      error: 'SUBDOMAIN_REQUIRED',
      message: 'Choisissez l’adresse de votre boutique.',
    };
  }
  const nextName = input.name?.trim() || store.name || nextSub;

  try {
    await prisma.$transaction(async (tx) => {
      if (store.subdomain && store.subdomain !== nextSub) {
        // Keep the old address for redirects; reclaiming one of our own
        // aliases removes it from the alias list.
        await tx.storeAlias.upsert({
          where: { subdomain: store.subdomain },
          create: { subdomain: store.subdomain, storeId: store.id },
          update: { storeId: store.id },
        });
      }
      await tx.storeAlias.deleteMany({ where: { subdomain: nextSub, storeId: store.id } });
      await tx.store.update({
        where: { id: store.id },
        data: { subdomain: nextSub, name: nextName },
      });

      if (input.name !== undefined) {
        const products = await tx.product.findMany({ where: { userId } });
        for (const p of products) {
          const config = productConfig(p);
          await tx.product.update({
            where: { id: p.id },
            data: {
              config: configToJson({
                ...config,
                storeName: nextName,
                storeCode: getStoreCode(nextName),
              }),
            },
          });
        }
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { ok: false, status: 409, error: 'TAKEN', message: SUBDOMAIN_MESSAGES.TAKEN };
    }
    throw err;
  }

  return { ok: true, profile: { name: nextName, subdomain: nextSub }, firstSetup };
}
