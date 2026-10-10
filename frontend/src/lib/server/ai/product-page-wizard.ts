// Google Gemini Product Creation Wizard Engine — E-commerce Africain
// Générateur complet de page de vente : Noms accrocheurs, Arguments, Description,
// FAQ adaptée, Tableau comparatif marché (Nous vs Les autres) et Avis clients.

import type { FaqItem, ProductComparison } from '@/lib/store/product-content';
import type { CustomerReview } from '@/types/juula';
import { geminiGenerateContent } from '@/lib/server/ai/gemini';

export interface GenerateNamesInput {
  baseIdea: string;
  category?: string | undefined;
  apiKey?: string | undefined;
}

export interface FullProductGenerationInput {
  productName: string;
  category?: string | undefined;
  price?: number | undefined;
  originalPrice?: number | undefined;
  deliveryFree?: boolean | undefined;
  deliveryFee?: number | undefined;
  hasVideo?: boolean | undefined;
  storeName?: string | undefined;
  city?: string | undefined;
  apiKey?: string | undefined;
}

export interface FullProductGenerationOutput {
  benefits: string[];
  description: string;
  faqItems: FaqItem[];
  comparison: ProductComparison;
  reviews: CustomerReview[];
  urgencyText: string;
  reassuranceText: string;
  ctaButtonText: string;
  source: 'gemini' | 'african_copy_engine';
}

const newId = () => Math.random().toString(36).slice(2, 9);

/**
 * 1. Générateur de suggestions de noms de produit accrocheurs
 */
export async function generateProductNameSuggestionsWithGemini(
  input: GenerateNamesInput,
): Promise<{ suggestions: string[]; source: 'gemini' | 'african_copy_engine' }> {
  const apiKey = input.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || '';

  const idea = input.baseIdea.trim();
  const cat = input.category || 'Général';

  const prompt = `Tu es le meilleur copywriter e-commerce pour le marché africain (Sénégal, Côte d'Ivoire, Cameroun).
Un vendeur veut lancer un produit dans la catégorie "${cat}" avec cette idée ou nom de base : "${idea}".

Propose exactement 5 noms de produits ultra-vendeurs, prestigieux et rassurants, conçus pour capter l'attention sur TikTok, Facebook et WhatsApp.
RÉPONDS UNIQUEMENT avec un tableau JSON valide de 5 chaînes de caractères, sans balise markdown :
["Nom 1", "Nom 2", "Nom 3", "Nom 4", "Nom 5"]`;

  if (apiKey) {
    try {
      const res = await geminiGenerateContent(
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        },
        apiKey,
      );

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(
            rawText
              .replace(/```json/gi, '')
              .replace(/```/g, '')
              .trim(),
          );
          if (Array.isArray(parsed) && parsed.length > 0) {
            return {
              suggestions: parsed.slice(0, 6).map((s) => String(s)),
              source: 'gemini',
            };
          }
        }
      }
    } catch {
      // repli
    }
  }

  // Repli intelligent
  const base = idea.charAt(0).toUpperCase() + idea.slice(1);
  return {
    suggestions: [
      `${base} — Édition Prestige Haute Qualité`,
      `${base} Pro Original Certifié`,
      `Pack Découverte ${base} — Série Limitée`,
      `${base} Élégance & Efficacité Maximale`,
      `${base} Confort Ultime (Import Garanti)`,
    ],
    source: 'african_copy_engine',
  };
}

/**
 * 2. Générateur intégral de la page de vente :
 * Arguments, Description, FAQ, Tableau Comparatif Marché, et Avis Clients.
 */
export async function generateFullProductPageWithGemini(
  input: FullProductGenerationInput,
): Promise<FullProductGenerationOutput> {
  const apiKey = input.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || '';

  const name = input.productName.trim();
  const price = input.price ? `${input.price.toLocaleString('fr-FR')} FCFA` : 'Prix Promo';
  const city = input.city?.trim() || 'Dakar';
  const store = input.storeName?.trim() || 'Notre boutique officielle';
  const isFreeShip = Boolean(input.deliveryFree);
  const shipInfo = isFreeShip
    ? 'Livraison 100% Gratuite offerte'
    : input.deliveryFee
      ? `Frais de livraison : ${input.deliveryFee.toLocaleString('fr-FR')} FCFA`
      : 'Livraison express disponible';

  const prompt = `Tu es un directeur artistique et copywriter e-commerce de classe mondiale expert du marché africain (Cash on Delivery & WhatsApp).
Un vendeur lance le produit : "${name}".
- Boutique : ${store}
- Prix : ${price}
- Conditions livraison : ${shipInfo}
- Ville principale : ${city}

Génère le contenu complet d'une page de vente irrésistible au format JSON strict avec EXACTEMENT cette structure :
{
  "benefits": [
    "Bénéfice clé 1 (court et percutant)",
    "Bénéfice clé 2 (qualité et durabilité)",
    "Bénéfice clé 3 (facilité d'usage au quotidien)",
    "Bénéfice clé 4 (sécurité et tranquillité d'esprit)"
  ],
  "description": "Un texte de 2 à 3 paragraphes persuasifs expliquant le problème résolu et pourquoi ce produit surpasse tout ce qui existe sur le marché.",
  "faqItems": [
    {
      "question": "Comment se passe la livraison et le paiement ?",
      "answer": "Explication rassurante sur le paiement en espèces ou Wave à la réception après vérification."
    },
    {
      "question": "Est-ce un produit de qualité authentique ?",
      "answer": "Explication sur la garantie et le test de conformité."
    },
    {
      "question": "Que faire si le produit ne me convient pas ?",
      "answer": "Garantie échange ou assistance immédiate sur WhatsApp."
    }
  ],
  "comparison_rows": [
    {
      "criterion": "Authenticité & Matériaux",
      "ours_text": "Matériaux certifiés haute résistance",
      "others_text": "Copies plastiques fragiles"
    },
    {
      "criterion": "Paiement à la livraison",
      "ours_text": "Vous vérifiez avant de payer au livreur",
      "others_text": "Paiement d'avance obligatoire sans garantie"
    },
    {
      "criterion": "Délais de livraison",
      "ours_text": "24h à 48h chrono à domicile",
      "others_text": "1 à 3 semaines avec retards fréquents"
    },
    {
      "criterion": "Service Client WhatsApp",
      "ours_text": "Équipe disponible 7j/7 pour vous assister",
      "others_text": "Injoignables après la commande"
    }
  ],
  "reviews": [
    {
      "authorName": "Prénom et Nom africain 1",
      "city": "${city}",
      "rating": 5,
      "comment": "Témoignage enthousiaste et détaillé sur la rapidité et la conformité."
    },
    {
      "authorName": "Prénom et Nom africain 2",
      "city": "${city}",
      "rating": 5,
      "comment": "Témoignage sur le paiement à la livraison et la gentillesse du livreur."
    },
    {
      "authorName": "Prénom et Nom africain 3",
      "city": "${city}",
      "rating": 5,
      "comment": "Témoignage sur la qualité du produit par rapport aux copies du marché."
    }
  ],
  "urgencyText": "Texte d'urgence crédible (ex: Plus que 7 pièces disponibles en stock pour cette semaine)",
  "reassuranceText": "Garantie Sérénité : Ne payez rien à l'avance, ouvrez votre colis devant le livreur",
  "ctaButtonText": "Commander et payer à la livraison (${price})"
}`;

  if (apiKey) {
    try {
      const res = await geminiGenerateContent(
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
        },
        apiKey,
      );

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(
            rawText
              .replace(/```json/gi, '')
              .replace(/```/g, '')
              .trim(),
          ) as Record<string, unknown>;

          if (
            Array.isArray(parsed.benefits) &&
            typeof parsed.description === 'string' &&
            Array.isArray(parsed.faqItems) &&
            Array.isArray(parsed.comparison_rows) &&
            Array.isArray(parsed.reviews)
          ) {
            const faqItems: FaqItem[] = (parsed.faqItems as Record<string, string>[]).map((f) => ({
              id: newId(),
              question: String(f.question || ''),
              answer: String(f.answer || ''),
            }));

            const comparisonRows = (parsed.comparison_rows as Record<string, string>[]).map(
              (r) => ({
                id: newId(),
                criterion: String(r.criterion || 'Critère'),
                ours: { kind: 'text' as const, text: String(r.ours_text || 'Oui') },
                others: { kind: 'text' as const, text: String(r.others_text || 'Non') },
              }),
            );

            const reviews: CustomerReview[] = (parsed.reviews as Record<string, unknown>[]).map(
              (rev) => ({
                id: newId(),
                authorName: String(rev.authorName || 'Client vérifié'),
                city: String(rev.city || city),
                rating: typeof rev.rating === 'number' ? rev.rating : 5,
                comment: String(rev.comment || 'Très satisfait du produit.'),
                date: 'Récemment',
                verified: true,
              }),
            );

            return {
              benefits: (parsed.benefits as string[]).map((b) => String(b)),
              description: parsed.description,
              faqItems,
              comparison: {
                enabled: true,
                title: 'Pourquoi choisir notre produit ?',
                oursLabel: store,
                othersLabel: 'Autres vendeurs / Copies',
                rows: comparisonRows,
              },
              reviews,
              urgencyText: String(parsed.urgencyText || 'Stock limité cette semaine'),
              reassuranceText: String(
                parsed.reassuranceText ||
                  'Payez à la livraison après avoir vérifié le colis devant le livreur.',
              ),
              ctaButtonText: String(
                parsed.ctaButtonText || `Commander maintenant — Paiement à la livraison`,
              ),
              source: 'gemini',
            };
          }
        }
      }
    } catch {
      // repli
    }
  }

  // Repli expert africain
  return {
    benefits: [
      `Qualité 100% Authentique : Conçu avec des matériaux robustes et testé avant expédition.`,
      `Efficacité immédiate : Répond parfaitement à votre besoin dès la première utilisation.`,
      isFreeShip
        ? `Livraison 100% Offerte : Zéro frais de transport partout à ${city}.`
        : `Livraison Express sous 24h : Directement chez vous ou à votre bureau.`,
      `Paiement Sécurisé : Vous payez uniquement après vérification du colis.`,
    ],
    description: `Vous en avez assez des produits fragiles ou des promesses non tenues ? ${name} a été rigoureusement sélectionné pour vous apporter le meilleur en termes de confort, de praticité et de durabilité.\n\nFini les déceptions : chaque exemplaire fait l'objet d'un contrôle qualité minutieux avant d'être expédié. Rejoignez nos nombreux clients satisfaits à ${city} et profitez de notre tarif exclusif aujourd'hui.`,
    faqItems: [
      {
        id: newId(),
        question: 'Comment se passe la livraison et le paiement ?',
        answer: `La livraison se fait sous 24h à 48h partout à ${city}. Vous ne payez rien à l'avance : vous réglez en espèces ou par Wave / Orange Money directement au livreur après avoir ouvert et inspecté votre colis.`,
      },
      {
        id: newId(),
        question: 'Le produit est-il garanti authentique ?',
        answer:
          'Absolument. Nous travaillons directement avec les fabricants certifiés pour vous garantir un produit original et durable.',
      },
      {
        id: newId(),
        question: 'Puis-je échanger le produit si la taille ou le modèle ne convient pas ?',
        answer:
          'Oui ! Notre service client WhatsApp est disponible 7j/7 pour organiser un échange rapide et sans tracas.',
      },
    ],
    comparison: {
      enabled: true,
      title: 'Pourquoi commander chez nous ?',
      oursLabel: store,
      othersLabel: 'Autres vendeurs / Marché',
      rows: [
        {
          id: newId(),
          criterion: 'Qualité & Finition',
          ours: { kind: 'text', text: 'Produit original certifié' },
          others: { kind: 'text', text: 'Imitations fragiles' },
        },
        {
          id: newId(),
          criterion: 'Paiement à la livraison',
          ours: { kind: 'text', text: 'Vérification avant de payer' },
          others: { kind: 'text', text: 'Paiement d’avance obligatoire' },
        },
        {
          id: newId(),
          criterion: 'Délai de livraison',
          ours: { kind: 'text', text: '24h chrono à domicile' },
          others: { kind: 'text', text: '1 à 2 semaines d’attente' },
        },
        {
          id: newId(),
          criterion: 'Support WhatsApp',
          ours: { kind: 'text', text: 'Assistance dédiée 7j/7' },
          others: { kind: 'text', text: 'Aucun support après-vente' },
        },
      ],
    },
    reviews: [
      {
        id: newId(),
        authorName: 'Fatou Ndiaye',
        city: `${city} (Mermoz)`,
        rating: 5,
        comment: `Colis reçu en moins de 24h. J'ai pu vérifier le produit devant le livreur avant de payer en Wave. Franchement rien à dire, la qualité est au rendez-vous !`,
        date: 'Il y a 2 jours',
        verified: true,
      },
      {
        id: newId(),
        authorName: 'Moussa Diop',
        city: `${city} (Almadies)`,
        rating: 5,
        comment: `Produit conforme à 100% à la description. Service client très réactif sur WhatsApp. Je recommande les yeux fermés.`,
        date: 'Il y a 4 jours',
        verified: true,
      },
      {
        id: newId(),
        authorName: 'Aïssatou Sow',
        city: `${city} (Plateau)`,
        rating: 5,
        comment: `Très bonne expérience d'achat. Le livreur était poli et ponctuel. Produit de qualité supérieure.`,
        date: 'Il y a 1 semaine',
        verified: true,
      },
    ],
    urgencyText: `Attention : En raison d'une forte demande à ${city}, le stock promotionnel est limité à 10 pièces cette semaine.`,
    reassuranceText: `Garantie Sérénité Totale : Payez uniquement en espèces ou Wave à la réception après vérification de votre commande.`,
    ctaButtonText: `Commander maintenant — Paiement à la livraison (${price})`,
    source: 'african_copy_engine',
  };
}
