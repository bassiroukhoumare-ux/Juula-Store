// Google Gemini Storefront AI Site Generator — Générateur de site e-commerce boutique
// Génère le slogan, la barre d'annonce, les sections et la FAQ de la boutique.

import type { AnnouncementBar } from '@/lib/store/marketing';
import type { FaqItem } from '@/lib/store/product-content';
import type { StoreSection } from '@/lib/store/storefront-types';

export interface StorefrontAiGenerateInput {
  storeName: string;
  storeCategory?: string | undefined;
  accentColor?: string | undefined;
  productTitles?: string[] | undefined;
  codEnabled?: boolean | undefined;
  whatsapp?: string | undefined;
  apiKey?: string | undefined;
}

export interface StorefrontAiGenerateOutput {
  storeTagline: string;
  announcementBar: AnnouncementBar;
  storeFaq: FaqItem[];
  storeSections: StoreSection[];
  aboutText: string;
  source: 'gemini' | 'african_copy_engine';
}

const newId = () => Math.random().toString(36).slice(2, 9);

export async function generateStorefrontWithGemini(
  input: StorefrontAiGenerateInput,
): Promise<StorefrontAiGenerateOutput> {
  const apiKey = input.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || '';

  const name = input.storeName.trim() || 'Ma Boutique';
  const cat = input.storeCategory?.trim() || 'Général';
  const products = (input.productTitles || []).slice(0, 5).join(', ') || 'Articles de qualité';

  const prompt = `Tu es le meilleur directeur artistique et concepteur de boutiques e-commerce pour l'Afrique francophone (Sénégal, Côte d'Ivoire).
Voici les informations de la boutique :
- Nom : "${name}"
- Catégorie : "${cat}"
- Exemples de produits : "${products}"
- Paiement à la livraison : ${input.codEnabled !== false ? 'Oui (Paiement en espèces ou Wave à la réception)' : 'Mobile Money'}

Génère les éléments textuels et structurels complets pour ce site e-commerce au format JSON strict :
{
  "storeTagline": "Slogan accrocheur de 4 à 7 mots pour le haut du site",
  "announcementText": "Bannière d'annonce urgente ou promotionnelle en haut du site (ex: Livraison express offerte partout à Dakar dès 2 articles commandés !)",
  "aboutText": "Paragraphe de 2-3 phrases rassurantes présentant la boutique et son engagement envers la qualité et la satisfaction client.",
  "faq": [
    {
      "question": "Comment se passe le paiement à la livraison ?",
      "answer": "Vous ne payez rien à la commande. Vous réglez directement le livreur en espèces ou par Wave / Orange Money après avoir reçu et inspecté votre colis."
    },
    {
      "question": "Quels sont les délais de livraison ?",
      "answer": "Votre commande est préparée avec soin et livrée sous 24h à Dakar et sous 48h en régions."
    },
    {
      "question": "Les produits sont-ils certifiés et garantis ?",
      "answer": "Oui, tous nos articles sont rigoureusement sélectionnés et testés avant expédition pour garantir une qualité irréprochable."
    }
  ]
}`;

  if (apiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        }),
      });

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

          if (typeof parsed.storeTagline === 'string' && Array.isArray(parsed.faq)) {
            const faq: FaqItem[] = (parsed.faq as Record<string, string>[]).map((f) => ({
              id: newId(),
              question: String(f.question || ''),
              answer: String(f.answer || ''),
            }));

            const sections: StoreSection[] = [
              {
                id: newId(),
                type: 'products',
                title: 'La sélection du moment',
                subtitle: 'Nos meilleures offres sélectionnées pour vous',
                placement: 'before_products',
                productSlugs: [],
                images: [],
              },
            ];

            return {
              storeTagline: parsed.storeTagline,
              announcementBar: {
                enabled: true,
                text: String(parsed.announcementText || 'Livraison rapide partout au Sénégal !'),
                link: '',
                style: 'dark',
                countdown: { enabled: false, endsAt: null, daily: false },
              },
              storeFaq: faq,
              storeSections: sections,
              aboutText: String(parsed.aboutText || ''),
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
    storeTagline: `L’excellence et l’authenticité livrées chez vous`,
    announcementBar: {
      enabled: true,
      text: `Livraison Express sous 24h — Paiement à la réception après vérification !`,
      link: '',
      style: 'dark',
      countdown: { enabled: false, endsAt: null, daily: false },
    },
    storeFaq: [
      {
        id: newId(),
        question: 'Comment se passe le paiement à la livraison ?',
        answer:
          'Vous ne payez rien à l’avance. Vous réglez directement le livreur en espèces ou via Wave / Orange Money une fois votre colis inspecté.',
      },
      {
        id: newId(),
        question: 'Quels sont les délais de livraison ?',
        answer: 'Livraison sous 24h à Dakar et sous 48h dans les autres régions du Sénégal.',
      },
      {
        id: newId(),
        question: 'Comment joindre le service client ?',
        answer:
          'Notre équipe est disponible 7j/7 directement sur WhatsApp pour répondre à vos questions et suivre votre commande.',
      },
    ],
    storeSections: [
      {
        id: newId(),
        type: 'products',
        title: 'Sélection Exclusive',
        subtitle: 'Découvrez nos nouveautés et best-sellers',
        placement: 'before_products',
        productSlugs: [],
        images: [],
      },
    ],
    aboutText: `${name} est votre boutique de référence pour des articles authentiques et durables, avec le paiement en toute confiance à la livraison.`,
    source: 'african_copy_engine',
  };
}
