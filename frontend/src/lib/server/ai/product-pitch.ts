import { geminiGenerateContent } from '@/lib/server/ai/gemini';
// Google Gemini Product Pitch & Art Direction Engine — E-commerce Africain Cash on Delivery
// Choix du template visuel adapté et rédaction d'un argumentaire orienté achat impulsif.

export type DesignTemplateId =
  | 'TEMPLATE_BEAUTE_SANTE'
  | 'TEMPLATE_TECH_GADGET'
  | 'TEMPLATE_MODE_VETEMENT'
  | 'TEMPLATE_MAISON_CUISINE'
  | 'TEMPLATE_GENERIQUE';

export interface GenerateProductPitchInput {
  productName: string;
  price: number | string;
  apiKey?: string | undefined;
}

export interface ProductPitchOutput {
  id_design_choisi: DesignTemplateId;
  titre_page_vente: string;
  texte_intro_probleme: string;
  argumentaire_solution: string;
  liste_benefices_puces: string[];
  texte_urgence: string;
  texte_garantie: string;
  bouton_appel_action: string;
  source: 'gemini' | 'african_copy_engine';
}

const VALID_TEMPLATES: readonly DesignTemplateId[] = [
  'TEMPLATE_BEAUTE_SANTE',
  'TEMPLATE_TECH_GADGET',
  'TEMPLATE_MODE_VETEMENT',
  'TEMPLATE_MAISON_CUISINE',
  'TEMPLATE_GENERIQUE',
];

/**
 * Construit le prompt structuré selon les consignes exactes de l'utilisateur.
 */
export function buildGeminiProductPitchPrompt(productName: string, price: number | string): string {
  const priceFormatted =
    typeof price === 'number' ? price.toLocaleString('fr-FR') : String(price).trim();

  return `Tu es un copywriter e-commerce de génie et un directeur artistique spécialisé dans le Cash on Delivery (Paiement à la livraison) en Afrique. Un vendeur ajoute le produit suivant à sa boutique :
- Nom du produit : '${productName.trim()}'
- Prix : '${priceFormatted}' FCFA

Ta mission est double :
1. Choisir le meilleur template visuel pour ce produit parmi cette liste stricte : [TEMPLATE_BEAUTE_SANTE, TEMPLATE_TECH_GADGET, TEMPLATE_MODE_VETEMENT, TEMPLATE_MAISON_CUISINE, TEMPLATE_GENERIQUE].
2. Rédiger un argumentaire de vente irrésistible conçu pour pousser à l'achat impulsif.

CONTRAINTES STRICTES :
1. Tu DOIS répondre UNIQUEMENT par un objet JSON valide.
2. Aucun texte avant ou après le JSON.
3. N'utilise pas de balises Markdown.

STRUCTURE DU JSON ATTENDUE :
{
  "id_design_choisi": "Ici tu mets le nom EXACT du template choisi dans la liste ci-dessus, sans rien modifier",
  "titre_page_vente": "Un grand titre très accrocheur (H1) qui met en valeur le bénéfice principal du produit",
  "texte_intro_probleme": "Un paragraphe de 2 phrases qui décrit la frustration ou le besoin du client avant d'avoir ce produit",
  "argumentaire_solution": "Un paragraphe persuasif expliquant comment ce produit change la vie de l'utilisateur, avec un ton enthousiaste",
  "liste_benefices_puces": ["Avantage concret 1", "Avantage concret 2", "Avantage concret 3"],
  "texte_urgence": "Une phrase créant l'urgence (ex: Stock limité, l'offre expire bientôt)",
  "texte_garantie": "Une phrase rassurante adaptée au marché local (ex: Payez uniquement à la livraison à la réception du colis)",
  "bouton_appel_action": "Texte court et orienté action pour le bouton d'achat, incluant le prix si pertinent (ex: Commander maintenant - ${priceFormatted} FCFA)"
}`;
}

/**
 * Détermine le template par défaut basé sur le nom du produit.
 */
export function inferTemplate(productName: string): DesignTemplateId {
  const name = productName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    name.includes('beaut') ||
    name.includes('peau') ||
    name.includes('serum') ||
    name.includes('creme') ||
    name.includes('cheveu') ||
    name.includes('savon') ||
    name.includes('sante') ||
    name.includes('visage') ||
    name.includes('minceur')
  ) {
    return 'TEMPLATE_BEAUTE_SANTE';
  }
  if (
    name.includes('ecouteur') ||
    name.includes('montre') ||
    name.includes('smart') ||
    name.includes('chargeur') ||
    name.includes('cable') ||
    name.includes('gadget') ||
    name.includes('phone') ||
    name.includes('bluetooth') ||
    name.includes('camera')
  ) {
    return 'TEMPLATE_TECH_GADGET';
  }
  if (
    name.includes('chaussur') ||
    name.includes('robe') ||
    name.includes('sac') ||
    name.includes('pantalon') ||
    name.includes('costume') ||
    name.includes('habit') ||
    name.includes('vetement') ||
    name.includes('bazin') ||
    name.includes('chemise')
  ) {
    return 'TEMPLATE_MODE_VETEMENT';
  }
  if (
    name.includes('cuisine') ||
    name.includes('couteau') ||
    name.includes('poele') ||
    name.includes('mixeur') ||
    name.includes('lampe') ||
    name.includes('maison') ||
    name.includes('deco') ||
    name.includes('aspirateur')
  ) {
    return 'TEMPLATE_MAISON_CUISINE';
  }
  return 'TEMPLATE_GENERIQUE';
}

/**
 * Moteur de repli expert haute conversion pour l'Afrique.
 */
export function generateAfricanProductPitchFallback(
  productName: string,
  price: number | string,
): ProductPitchOutput {
  const template = inferTemplate(productName);
  const priceFormatted =
    typeof price === 'number' ? `${price.toLocaleString('fr-FR')} FCFA` : `${price} FCFA`;
  const name = productName.trim();

  return {
    id_design_choisi: template,
    titre_page_vente: `${name} — Transformez Votre Quotidien Sans Aucun Risque`,
    texte_intro_probleme: `Combien de fois avez-vous perdu du temps et de l'argent avec des produits décevants qui ne tiennent pas leurs promesses ? Vous méritez enfin une solution fiable, durable et conçue pour répondre à vos exigences sans compromis.`,
    argumentaire_solution: `Avec ${name}, tout devient plus simple et plus gratifiant. Dès le premier jour, vous ressentirez une différence spectaculaire qui vous fera vous demander comment vous avez pu vous en passer si longtemps !`,
    liste_benefices_puces: [
      `Efficacité prouvée : Résultats concrets visibles dès la première utilisation.`,
      `Finitions premium : Conçu avec des matériaux robustes pour durer des années.`,
      `Utilisation ultra-facile : Prêt à l'emploi en quelques secondes sans complication.`,
    ],
    texte_urgence: `Attention : Stocks d'importation très limités pour cette semaine, déjà plus de 80% des pièces réservées !`,
    texte_garantie: `Garantie Sérénité Totale : Payez uniquement en espèces ou Wave / Orange Money à la livraison après avoir inspecté votre colis.`,
    bouton_appel_action: `Commander maintenant - ${priceFormatted}`,
    source: 'african_copy_engine',
  };
}

/**
 * Appelle Google Gemini avec le schéma JSON strict demandé (temperature 0.5).
 */
export async function generateProductTemplateAndCopyWithGemini(
  input: GenerateProductPitchInput,
): Promise<ProductPitchOutput> {
  const apiKey = input.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || '';

  const prompt = buildGeminiProductPitchPrompt(input.productName, input.price);

  if (apiKey) {
    // One attempt: geminiGenerateContent already falls back across models.
    for (let attempt = 0; attempt < 1; attempt++) {
      try {
        const res = await geminiGenerateContent(
          {
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.5,
            },
          },
          apiKey,
        );

        if (res.ok) {
          const data = (await res.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleaned = rawText
              .replace(/```json/gi, '')
              .replace(/```/g, '')
              .trim();
            const parsed = JSON.parse(cleaned) as Record<string, unknown>;

            const chosenTemplate = String(parsed.id_design_choisi) as DesignTemplateId;
            const validTemplate = VALID_TEMPLATES.includes(chosenTemplate)
              ? chosenTemplate
              : inferTemplate(input.productName);

            if (
              typeof parsed.titre_page_vente === 'string' &&
              typeof parsed.texte_intro_probleme === 'string' &&
              typeof parsed.argumentaire_solution === 'string' &&
              Array.isArray(parsed.liste_benefices_puces) &&
              typeof parsed.texte_urgence === 'string' &&
              typeof parsed.texte_garantie === 'string' &&
              typeof parsed.bouton_appel_action === 'string'
            ) {
              return {
                id_design_choisi: validTemplate,
                titre_page_vente: parsed.titre_page_vente,
                texte_intro_probleme: parsed.texte_intro_probleme,
                argumentaire_solution: parsed.argumentaire_solution,
                liste_benefices_puces: parsed.liste_benefices_puces.map((b) => String(b)),
                texte_urgence: parsed.texte_urgence,
                texte_garantie: parsed.texte_garantie,
                bouton_appel_action: parsed.bouton_appel_action,
                source: 'gemini',
              };
            }
          }
        }
      } catch {
        // Fallback
      }
    }
  }

  return generateAfricanProductPitchFallback(input.productName, input.price);
}
