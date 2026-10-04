// Store identity: display name, public subdomain (<sub>.juula.store), logo,
// WhatsApp number and physical address (or "online only").
import 'server-only';
import { Prisma, type Store } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { getStoreCode } from '@/lib/orderUtils';
import { configToJson, productConfig } from '@/lib/server/store/products';
import {
  normalizeSubdomain,
  subdomainProblem,
  SUBDOMAIN_MESSAGES,
  type SubdomainProblem,
} from '@/lib/store/subdomain';
import { normalizeWhatsapp, formatWhatsapp } from '@/lib/store/whatsapp';

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
  logoUrl: string | null;
  whatsapp: string | null;
  onlineOnly: boolean;
  address: string | null;
  city: string | null;
}

export function toStoreProfile(store: Store | null): StoreProfile {
  return {
    name: store?.name ?? null,
    subdomain: store?.subdomain ?? null,
    logoUrl: store?.logoUrl ?? null,
    whatsapp: store?.whatsapp ?? null,
    onlineOnly: store?.onlineOnly ?? false,
    address: store?.address ?? null,
    city: store?.city ?? null,
  };
}

export interface ProfileInput {
  name?: string | undefined;
  subdomain?: string | undefined;
  logoUrl?: string | null | undefined;
  whatsapp?: string | undefined;
  onlineOnly?: boolean | undefined;
  address?: string | null | undefined;
  city?: string | null | undefined;
}

export type ProfileUpdateResult =
  | { ok: true; profile: StoreProfile; firstSetup: boolean }
  | { ok: false; status: number; error: string; message: string };

/** Logos must be images hosted on our Cloudinary account. */
function isAllowedLogoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    return (
      u.protocol === 'https:' &&
      u.hostname === 'res.cloudinary.com' &&
      (!cloud || u.pathname.startsWith(`/${cloud}/image/`))
    );
  } catch {
    return false;
  }
}

const fail = (status: number, error: string, message: string): ProfileUpdateResult => ({
  ok: false,
  status,
  error,
  message,
});

/**
 * Create or update the store profile. Onboarding (no subdomain yet) must
 * provide everything: name, address, logo, WhatsApp and a physical address
 * unless the shop sells online only. Changing the subdomain keeps the old one
 * as an alias (shared links redirect). Name and WhatsApp are also written
 * into every product page (store-wide fields).
 */
export async function updateStoreProfile(
  userId: string,
  input: ProfileInput,
): Promise<ProfileUpdateResult> {
  const store = await prisma.store.upsert({ where: { userId }, create: { userId }, update: {} });
  const firstSetup = !store.subdomain;

  let nextSub = store.subdomain;
  if (input.subdomain !== undefined) {
    const check = await checkSubdomain(input.subdomain, store.id);
    if (!check.available) return fail(409, check.reason, check.message);
    nextSub = check.subdomain;
  }

  let whatsapp = store.whatsapp;
  if (input.whatsapp !== undefined) {
    const normalized = normalizeWhatsapp(input.whatsapp);
    if (!normalized) {
      return fail(400, 'WHATSAPP_INVALID', 'Numéro WhatsApp invalide (ex : 77 123 45 67).');
    }
    whatsapp = normalized;
  }

  let logoUrl = store.logoUrl;
  if (input.logoUrl !== undefined) {
    if (input.logoUrl !== null && !isAllowedLogoUrl(input.logoUrl)) {
      return fail(
        400,
        'LOGO_INVALID',
        'Logo invalide : téléversez une image depuis votre appareil.',
      );
    }
    logoUrl = input.logoUrl;
  }

  const onlineOnly = input.onlineOnly ?? store.onlineOnly;
  const address =
    (input.address !== undefined ? input.address?.trim() || null : store.address) ?? null;
  const city = (input.city !== undefined ? input.city?.trim() || null : store.city) ?? null;
  const name = input.name?.trim() || store.name || nextSub;

  if (!nextSub || !name)
    return fail(400, 'SUBDOMAIN_REQUIRED', 'Choisissez l’adresse de votre boutique.');
  const touchesIdentity =
    firstSetup ||
    input.whatsapp !== undefined ||
    input.logoUrl !== undefined ||
    input.onlineOnly !== undefined ||
    input.address !== undefined;
  if (touchesIdentity) {
    if (!whatsapp)
      return fail(400, 'WHATSAPP_REQUIRED', 'Ajoutez le numéro WhatsApp de la boutique.');
    if (!logoUrl) {
      return fail(400, 'LOGO_REQUIRED', 'Ajoutez le logo ou la photo de profil de votre boutique.');
    }
    if (!onlineOnly && !address) {
      return fail(
        400,
        'ADDRESS_REQUIRED',
        'Indiquez l’adresse de la boutique, ou cochez « Je vends uniquement en ligne ».',
      );
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (store.subdomain && store.subdomain !== nextSub) {
        // Keep the old address for redirects.
        await tx.storeAlias.upsert({
          where: { subdomain: store.subdomain },
          create: { subdomain: store.subdomain, storeId: store.id },
          update: { storeId: store.id },
        });
      }
      await tx.storeAlias.deleteMany({ where: { subdomain: nextSub, storeId: store.id } });
      await tx.store.update({
        where: { id: store.id },
        data: {
          subdomain: nextSub,
          name,
          logoUrl,
          whatsapp,
          onlineOnly,
          address: onlineOnly ? null : address,
          city,
        },
      });

      if (input.name !== undefined || input.whatsapp !== undefined) {
        const products = await tx.product.findMany({ where: { userId } });
        for (const p of products) {
          const config = productConfig(p);
          await tx.product.update({
            where: { id: p.id },
            data: {
              config: configToJson({
                ...config,
                storeName: name,
                storeCode: getStoreCode(name),
                ...(whatsapp ? { whatsappSupportNumber: formatWhatsapp(whatsapp) } : {}),
              }),
            },
          });
        }
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return fail(409, 'TAKEN', SUBDOMAIN_MESSAGES.TAKEN);
    }
    throw err;
  }

  const fresh = await prisma.store.findUnique({ where: { id: store.id } });
  return { ok: true, profile: toStoreProfile(fresh), firstSetup };
}
