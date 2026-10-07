// Shop categories of the public directory (/boutiques).

export const STORE_CATEGORIES = [
  { id: 'mode', label: 'Mode & Accessoires' },
  { id: 'chaussures', label: 'Chaussures' },
  { id: 'beaute', label: 'Beauté & Soins' },
  { id: 'electronique', label: 'High-Tech & Électronique' },
  { id: 'maison', label: 'Maison & Décoration' },
  { id: 'alimentation', label: 'Alimentation' },
  { id: 'sante', label: 'Santé & Bien-être' },
  { id: 'enfants', label: 'Enfants & Bébé' },
  { id: 'sport', label: 'Sport & Loisirs' },
  { id: 'autre', label: 'Autres' },
] as const;

export type StoreCategory = (typeof STORE_CATEGORIES)[number]['id'];
export const STORE_CATEGORY_IDS = STORE_CATEGORIES.map((c) => c.id) as [
  StoreCategory,
  ...StoreCategory[],
];

export function isStoreCategory(v: unknown): v is StoreCategory {
  return typeof v === 'string' && (STORE_CATEGORY_IDS as string[]).includes(v);
}

export function storeCategoryLabel(id: string | null | undefined): string | null {
  return STORE_CATEGORIES.find((c) => c.id === id)?.label ?? null;
}
