import { geminiGenerateContent } from '@/lib/server/ai/gemini';
// Google Gemini Copywriting Engine — E-commerce Africain
// Générateur de pages de vente ultra-persuasives orienté Cash on Delivery (COD) & WhatsApp.
// Référence automatique des configurations de la boutique et de la page produit.

export interface GenerateCopywritingInput {
  productName: string;
  storeName?: string | undefined;
  category?: string | undefined;
  price?: number | undefined;
  originalPrice?: number | undefined;
  deliveryFee?: number | undefined;
  deliveryFree?: boolean | undefined;
  deliveryNotice?: string | undefined;
  codEnabled?: boolean | undefined;
  whatsapp?: string | undefined;
  city?: string | undefined;
  apiKey?: string | undefined;
}

export interface GeneratedCopywritingOutput {
  titre_principal: string;
  sous_titre: string;
  description_probleme_solution: string;
  benefices_puces: string[];
  garantie_confiance: string;
  urgence_rarete: string;
  bouton_cta: string;
  source: 'gemini' | 'african_copy_engine';
}

/**
 * Construit le prompt structuré avec l'injection des contextes réels
 * de la boutique et de la page produit.
 */
export function buildGeminiCopywritingPrompt(input: GenerateCopywritingInput): string {
  const store = input.storeName?.trim() || 'notre boutique officielle';
  const priceText = input.price
    ? `${input.price.toLocaleString('fr-FR')} FCFA`
    : 'prix de lancement';
  const origPriceText = input.originalPrice
    ? ` (au lieu de ${input.originalPrice.toLocaleString('fr-FR')} FCFA)`
    : '';
  const shippingText = input.deliveryFree
    ? 'Livraison 100% OFFERTE (0 FCFA)'
    : input.deliveryFee
      ? `Frais de livraison : ${input.deliveryFee.toLocaleString('fr-FR')} FCFA`
      : 'Livraison express disponible';
  const deliveryDelay =
    input.deliveryNotice?.trim() || 'Livraison sous 24h à Dakar et 48h en régions';
  const codText =
    input.codEnabled !== false
      ? 'Paiement en espèces à la livraison (Cash on Delivery) — Le client vérifie son colis avant de payer au livreur'
      : 'Paiement mobile sécurisé par Wave ou Orange Money';
  const whatsappText = input.whatsapp?.trim() || 'Support client direct par WhatsApp';
  const market = input.city?.trim() || 'Dakar et les grandes villes d’Afrique de l’Ouest';

  return `Agis comme le meilleur copywriter e-commerce pour le marché africain (Cash on Delivery et WhatsApp). 
Le vendeur lance ce produit : "${input.productName}".

Voici les configurations réelles de sa boutique et de son offre pour personnaliser au maximum le message :
- Nom de la boutique : ${store}
- Catégorie : ${input.category || 'Général'}
- Prix de vente : ${priceText}${origPriceText}
- Conditions de livraison : ${shippingText}
- Délais annoncés : ${deliveryDelay}
- Mode de paiement : ${codText}
- Contact WhatsApp : ${whatsappText}
- Marché cible : ${market}. 

L'audience africaine a besoin de réassurance maximale : peur des arnaques et des faux produits dissipée, insistance sur la possibilité de vérifier le colis avant de donner l'argent au livreur, urgence crédible (stocks importés limités), et appel à l'action direct (commander en 30 secondes sans carte bancaire).

Génère le contenu d'une page de vente ultra-persuasive. Tu DOIS OBLIGATOIREMENT répondre au format JSON strict et valide, sans aucun texte ou balise Markdown autour, en respectant exactement cette structure de clés :
{
  "titre_principal": "Titre accrocheur qui capte l'attention",
  "sous_titre": "La promesse irrésistible",
  "description_probleme_solution": "Un court paragraphe expliquant le problème du client et comment ce produit le règle",
  "benefices_puces": [
    "Avantage clair 1",
    "Avantage clair 2",
    "Avantage clair 3",
    "Avantage clair 4"
  ],
  "garantie_confiance": "Phrase rassurante sur le paiement à la livraison",
  "urgence_rarete": "Texte pour pousser à l'achat immédiat (ex: Stock limité)",
  "bouton_cta": "Texte du bouton d'achat (ex: Commander et payer à la livraison)"
}`;
}

/**
 * Moteur de repli expert pour l'e-commerce africain
 * (Sénégal, Côte d'Ivoire, etc.) si l'API externe est inaccessible.
 */
export function generateAfricanCopyFallback(
  input: GenerateCopywritingInput,
): GeneratedCopywritingOutput {
  const name = input.productName.trim() || 'Produit Tendance';
  const price = input.price ? `${input.price.toLocaleString('fr-FR')} FCFA` : '';
  const city = input.city?.trim() || 'Dakar';
  const isFreeShip = Boolean(input.deliveryFree);

  return {
    titre_principal: `${name} — L'Original Certifié avec Livraison Express à ${city}`,
    sous_titre: isFreeShip
      ? `Commandez aujourd'hui à ${price} et profitez de la livraison 100% offerte partout à ${city}.`
      : `Profitez de la qualité authentique garantie. Payez uniquement après réception et vérification.`,
    description_probleme_solution: `Vous en avez marre des produits de mauvaise qualité qui ne durent pas ou des déceptions à la livraison ? ${name} a été spécialement sélectionné pour vous offrir une efficacité maximale et une durabilité éprouvée. Conçu avec des matériaux haut de gamme, il résout vos besoins quotidiens en toute simplicité et vous garantit une satisfaction totale dès la première utilisation.`,
    benefices_puces: [
      `Qualité 100% Authentique : Testé et certifié avant chaque expédition.`,
      `Prise en main immédiate : Simple, pratique et adapté à votre quotidien.`,
      isFreeShip
        ? `Livraison Gratuite : Zéro frais caché, vous ne payez que le produit.`
        : `Livraison Express en 24h : Directement chez vous ou à votre bureau.`,
      `Service Client VIP : Une équipe dédiée disponible sur WhatsApp pour vous accompagner.`,
    ],
    garantie_confiance: `Garantie Sérénité Totale & Paiement à la Livraison : Vous ne payez RIEN à l'avance. Ouvrez le colis devant le livreur, vérifiez votre ${name}, et réglez en espèces ou par Wave / Orange Money en toute sécurité.`,
    urgence_rarete: `Attention : En raison d'une forte demande sur ${city}, le stock restant pour cette semaine est très limité. Plus que quelques pièces disponibles au tarif promotionnel !`,
    bouton_cta: `Commander maintenant — Paiement à la livraison`,
    source: 'african_copy_engine',
  };
}

/**
 * Appelle l'API Google Gemini avec responseMimeType "application/json"
 * et gère les erreurs en cascade vers le moteur expert africain.
 */
export async function generateCopywritingWithGemini(
  input: GenerateCopywritingInput,
): Promise<GeneratedCopywritingOutput> {
  const apiKey = input.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || '';

  const prompt = buildGeminiCopywritingPrompt(input);

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
              temperature: 0.7,
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

            if (
              typeof parsed.titre_principal === 'string' &&
              typeof parsed.sous_titre === 'string' &&
              typeof parsed.description_probleme_solution === 'string' &&
              Array.isArray(parsed.benefices_puces) &&
              typeof parsed.garantie_confiance === 'string' &&
              typeof parsed.urgence_rarete === 'string' &&
              typeof parsed.bouton_cta === 'string'
            ) {
              return {
                titre_principal: parsed.titre_principal,
                sous_titre: parsed.sous_titre,
                description_probleme_solution: parsed.description_probleme_solution,
                benefices_puces: parsed.benefices_puces.map((b) => String(b)),
                garantie_confiance: parsed.garantie_confiance,
                urgence_rarete: parsed.urgence_rarete,
                bouton_cta: parsed.bouton_cta,
                source: 'gemini',
              };
            }
          }
        }
      } catch {
        // Continue to fallback
      }
    }
  }

  // Fallback haute qualité respectant rigoureusement le schéma
  return generateAfricanCopyFallback(input);
}
