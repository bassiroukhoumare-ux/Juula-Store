// Slogan / short description ideas for a shop, from what the merchant sells.
// Runs in the browser, instantly and offline; an AI provider can replace
// `suggestSlogans` later without changing the UI.

export const SHOP_TYPES = [
  { id: 'mode', label: 'Mode & vêtements', noun: 'vos tenues', item: 'mode' },
  { id: 'beaute', label: 'Beauté & cosmétiques', noun: 'vos soins', item: 'beauté' },
  { id: 'parfum', label: 'Parfums', noun: 'vos parfums', item: 'parfums' },
  { id: 'chaussures', label: 'Chaussures', noun: 'vos chaussures', item: 'chaussures' },
  { id: 'accessoires', label: 'Sacs & accessoires', noun: 'vos accessoires', item: 'accessoires' },
  { id: 'bijoux', label: 'Bijoux & montres', noun: 'vos bijoux', item: 'bijoux' },
  { id: 'electronique', label: 'Électronique', noun: 'vos appareils', item: 'high-tech' },
  { id: 'maison', label: 'Maison & déco', noun: 'votre intérieur', item: 'déco' },
  { id: 'enfants', label: 'Enfants & bébés', noun: 'vos petits', item: 'articles pour enfants' },
  { id: 'alimentation', label: 'Alimentation', noun: 'vos produits du terroir', item: 'saveurs' },
] as const;

export type ShopTypeId = (typeof SHOP_TYPES)[number]['id'];

const BY_TYPE: Record<ShopTypeId, string[]> = {
  mode: [
    'La mode qui vous ressemble, livrée chez vous.',
    'Des tenues tendance pour chaque moment de votre vie.',
    'Élégance au quotidien, à petits prix.',
    'Habillez votre style, on s’occupe du reste.',
    'Les pièces mode du moment, sélectionnées pour vous.',
  ],
  beaute: [
    'Révélez votre beauté naturelle.',
    'Des soins de qualité pour une peau éclatante.',
    'Votre routine beauté, livrée à domicile.',
    'Prenez soin de vous, simplement.',
  ],
  parfum: [
    'Des parfums qui laissent une empreinte.',
    'Votre signature olfactive, à prix doux.',
    'Sentez-vous unique, chaque jour.',
    'Fragrances d’exception, livrées chez vous.',
  ],
  chaussures: [
    'Le confort et le style à chaque pas.',
    'Des chaussures pour toutes vos sorties.',
    'Marchez avec assurance.',
    'Vos pieds méritent le meilleur.',
  ],
  accessoires: [
    'L’accessoire qui fait toute la différence.',
    'Sacs et accessoires pour sublimer votre look.',
    'Le détail chic de votre style.',
    'Complétez votre tenue avec élégance.',
  ],
  bijoux: [
    'Des bijoux qui racontent votre histoire.',
    'Brillez en toute occasion.',
    'L’élégance à votre poignet.',
    'Des pièces précieuses, à portée de main.',
  ],
  electronique: [
    'La technologie qui simplifie votre quotidien.',
    'Des appareils fiables, au meilleur prix.',
    'Le high-tech livré en un clic.',
    'Restez connecté, sans vous ruiner.',
  ],
  maison: [
    'Faites de votre maison un cocon.',
    'La déco qui donne vie à votre intérieur.',
    'Du style pour chaque pièce de la maison.',
    'Votre intérieur, votre fierté.',
  ],
  enfants: [
    'Tout pour le bonheur de vos petits.',
    'Des articles doux et sûrs pour vos enfants.',
    'Grandir avec le sourire.',
    'Le meilleur pour vos tout-petits.',
  ],
  alimentation: [
    'Le goût authentique, livré chez vous.',
    'Des produits frais et savoureux.',
    'Les saveurs d’ici, sélectionnées avec soin.',
    'Bien manger, tout simplement.',
  ],
};

const GENERIC = [
  '{what} de qualité, livrés partout au Sénégal.',
  'Commandez {what}, payez en toute sécurité.',
  '{what} sélectionnés avec soin pour vous.',
  'Le meilleur des {what}, au juste prix.',
  'Vos {what} préférés, livrés rapidement.',
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function shuffle<T>(items: T[], seed: number): T[] {
  const a = [...items];
  let x = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    const j = Math.floor((x / 233280) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Best-guess shop type from free text (« je vends des robes et des sacs »). */
export function guessShopType(text: string): ShopTypeId | null {
  const t = text.toLowerCase();
  const rules: [RegExp, ShopTypeId][] = [
    [/parfum|fragrance|senteur|encens|thiouraye/, 'parfum'],
    [/chaussure|basket|sandale|talon|sneaker/, 'chaussures'],
    [/bijou|montre|collier|bracelet|bague|boucle/, 'bijoux'],
    [/sac|accessoire|ceinture|lunette|foulard|perruque/, 'accessoires'],
    [/beaut|cosm|crème|creme|maquill|soin|cheveu|savon/, 'beaute'],
    [/robe|v[êe]tement|tenue|mode|boubou|pagne|wax|t-shirt|chemise|ensemble/, 'mode'],
    [/t[ée]l[ée]phone|[ée]lectron|ordinateur|[ée]couteur|chargeur|high.?tech/, 'electronique'],
    [/maison|d[ée]co|cuisine|meuble|linge/, 'maison'],
    [/b[ée]b[ée]|enfant|jouet/, 'enfants'],
    [/aliment|[ée]picerie|jus|caf[ée]|th[ée]|miel|c[ée]r[ée]ale|bissap/, 'alimentation'],
  ];
  return rules.find(([re]) => re.test(t))?.[1] ?? null;
}

/**
 * 6 slogan ideas for a shop. `what` is the merchant's own words (« robes
 * wax »), `type` a picked category; `seed` changes the selection (« Autres
 * idées »). Every idea is ≤ 140 characters (the tagline limit).
 */
export function suggestSlogans(input: {
  what: string;
  type?: ShopTypeId | null | undefined;
  storeName?: string | undefined;
  seed?: number | undefined;
}): string[] {
  const what = input.what.trim().replace(/\s+/g, ' ').slice(0, 60);
  const type = input.type ?? (what ? guessShopType(what) : null);
  const seed = input.seed ?? 1;
  const ideas: string[] = [];
  if (type) ideas.push(...BY_TYPE[type]);
  if (what) {
    ideas.push(...GENERIC.map((g) => g.replace('{what}', what)).map(capitalize));
  }
  if (input.storeName?.trim()) {
    const name = input.storeName.trim();
    ideas.push(
      `${name} : ${type ? SHOP_TYPES.find((s) => s.id === type)!.label.toLowerCase() : 'vos envies'}, livrés chez vous.`,
    );
  }
  if (ideas.length === 0) {
    ideas.push(
      'Des produits de qualité, livrés partout au Sénégal.',
      'Commandez en ligne, payez en toute sécurité.',
      'Le meilleur au juste prix, livré chez vous.',
    );
  }
  return [...new Set(shuffle(ideas, seed).filter((s) => s.length <= 140))].slice(0, 6);
}
