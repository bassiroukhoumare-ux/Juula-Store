// Body of « create / edit a partner » (shared by POST and PATCH).
import { z } from 'zod';
import { COMMISSION_TYPES, normalizePartnerSlug } from '@/lib/store/partners';

export const PartnerBody = z
  .object({
    name: z.string().trim().min(2).max(80),
    slug: z
      .string()
      .transform(normalizePartnerSlug)
      .refine((s) => s.length >= 2, { message: 'SLUG_TOO_SHORT' }),
    startsAt: z.string().datetime({ offset: true }).nullable(),
    expiresAt: z.string().datetime({ offset: true }),
    commissionType: z.enum(COMMISSION_TYPES),
    commissionValue: z.number().int().min(1).max(100_000_000),
    productSlug: z.string().max(120).nullable(),
  })
  .refine((b) => b.commissionType !== 'percent' || b.commissionValue <= 100, {
    message: 'PERCENT_RANGE',
  })
  .refine((b) => !b.startsAt || new Date(b.startsAt) < new Date(b.expiresAt), {
    message: 'DATES_ORDER',
  });

export function partnerValidationMessage(issues: { message: string }[]): string {
  const m = issues.map((i) => i.message);
  if (m.includes('SLUG_TOO_SHORT'))
    return 'L’identifiant du lien doit contenir au moins 2 caractères.';
  if (m.includes('PERCENT_RANGE')) return 'Le pourcentage doit être compris entre 1 et 100.';
  if (m.includes('DATES_ORDER')) return 'La date de début doit précéder la date d’expiration.';
  return 'Vérifiez les informations du partenaire (nom, date d’expiration, commission).';
}
