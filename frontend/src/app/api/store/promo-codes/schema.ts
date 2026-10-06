// Body of « create / edit a promo code » (shared by POST and PATCH).
import { z } from 'zod';
import { PROMO_TYPES, normalizePromoCode } from '@/lib/store/marketing';

export const PromoBody = z
  .object({
    code: z
      .string()
      .transform(normalizePromoCode)
      .refine((c) => c.length >= 3, { message: 'CODE_TOO_SHORT' }),
    type: z.enum(PROMO_TYPES),
    value: z.number().int().min(0).max(100_000_000),
    minAmount: z.number().int().min(0).max(100_000_000).nullable(),
    maxUses: z.number().int().min(1).max(1_000_000).nullable(),
    expiresAt: z.string().datetime({ offset: true }).nullable(),
    active: z.boolean(),
  })
  .refine((b) => b.type !== 'percent' || (b.value >= 1 && b.value <= 100), {
    message: 'PERCENT_RANGE',
  })
  .refine((b) => b.type !== 'fixed' || b.value >= 1, { message: 'FIXED_RANGE' });

export function promoValidationMessage(issues: { message: string }[]): string {
  const m = issues.map((i) => i.message);
  if (m.includes('CODE_TOO_SHORT'))
    return 'Le code doit contenir au moins 3 caractères (lettres, chiffres).';
  if (m.includes('PERCENT_RANGE')) return 'Le pourcentage doit être compris entre 1 et 100.';
  if (m.includes('FIXED_RANGE')) return 'Indiquez le montant de la réduction en FCFA.';
  return 'Informations du code promo invalides.';
}
