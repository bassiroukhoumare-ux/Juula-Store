// Google Gemini Branding Engine — Création d'Entreprise E-commerce Marché Africain
// Générateur d'identité complète de marque (Nom, Slogan, Couleur HEX, Description, Catégories).

export interface GenerateBrandingInput {
  userIdea: string;
  apiKey?: string | undefined;
}

export interface StoreBrandingOutput {
  nom_boutique_propose: string;
  slogan_accrocheur: string;
  couleur_hexadecimale: string;
  description_a_propos: string;
  categories_produits_suggerees: string[];
  source: 'gemini' | 'african_copy_engine';
}

/**
 * Construit le prompt structuré selon les consignes exactes de l'utilisateur.
 */
export function buildGeminiBrandingPrompt(userIdea: string): string {
  return `Tu es un expert en branding et création d'entreprise e-commerce pour le marché africain francophone. Un futur vendeur souhaite ouvrir sa boutique. Voici son idée de base : '${userIdea.trim()}'. 

Ta mission est de créer l'identité complète de cette boutique pour maximiser la confiance des acheteurs locaux. 

CONTRAINTES STRICTES :
1. Tu DOIS répondre UNIQUEMENT par un objet JSON valide.
2. Aucun texte avant ou après le JSON.
3. N'utilise pas de balises Markdown (comme \`\`\`json).

STRUCTURE DU JSON ATTENDUE :
{
  "nom_boutique_propose": "Un nom de marque court, percutant et facile à retenir",
  "slogan_accrocheur": "Une phrase d'accroche (idéalement de 3 à 6 mots) pour le haut du site",
  "couleur_hexadecimale": "Un code couleur HEX (ex: #3D0B37 pour du violet élégant, ou un autre adapté à la niche) qui servira pour les boutons et le thème global",
  "description_a_propos": "Un paragraphe de 3 phrases très professionnel, inspirant la confiance, expliquant la mission de la boutique et la qualité des produits, idéal pour rassurer un client qui hésite à commander",
  "categories_produits_suggerees": ["Nom Catégorie 1", "Nom Catégorie 2", "Nom Catégorie 3"]
}`;
}

/**
 * Moteur de repli expert si l'API externe est inaccessible.
 */
export function generateAfricanBrandingFallback(userIdea: string): StoreBrandingOutput {
  const idea = userIdea
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  let nom = 'Prestige Horizon';
  let slogan = 'L’excellence livrée chez vous';
  let couleur = '#235BF7';
  let categories = ['Nouveautés', 'Best-Sellers', 'Offres Spéciales'];

  if (
    idea.includes('beaut') ||
    idea.includes('cosmet') ||
    idea.includes('soin') ||
    idea.includes('peau') ||
    idea.includes('cheveu')
  ) {
    nom = 'Éclat Sublime';
    slogan = 'Votre beauté naturelle sublimée';
    couleur = '#E11D48';
    categories = ['Soins Visage & Éclat', 'Soins Capillaires', 'Packs Beauté'];
  } else if (
    idea.includes('montre') ||
    idea.includes('bijou') ||
    idea.includes('accessoire') ||
    idea.includes('luxe')
  ) {
    nom = 'Horlogerie Royale';
    slogan = 'Le raffinement à votre poignet';
    couleur = '#D97706';
    categories = ['Montres Homme', 'Montres Femme', 'Coffrets Cadeaux'];
  } else if (
    idea.includes('tech') ||
    idea.includes('gadget') ||
    idea.includes('telephon') ||
    idea.includes('ecouteur')
  ) {
    nom = 'NovaTech Express';
    slogan = 'La technologie du futur aujourd’hui';
    couleur = '#2563EB';
    categories = ['Gadgets Intelligents', 'Audio & Sans Fil', 'Accessoires Mobiles'];
  } else if (
    idea.includes('mode') ||
    idea.includes('habit') ||
    idea.includes('vetement') ||
    idea.includes('chaussur') ||
    idea.includes('robe')
  ) {
    nom = 'Atelier Dakar Chic';
    slogan = 'L’élégance moderne en toute occasion';
    couleur = '#0F172A';
    categories = ['Collection Homme', 'Collection Femme', 'Accessoires Tendance'];
  } else if (idea.includes('maison') || idea.includes('cuisin') || idea.includes('deco')) {
    nom = 'Maison & Confort';
    slogan = 'Simplifiez votre vie au quotidien';
    couleur = '#059669';
    categories = ['Cuisine Pratique', 'Décoration & Intérieur', 'Rangement Malin'];
  }

  return {
    nom_boutique_propose: nom,
    slogan_accrocheur: slogan,
    couleur_hexadecimale: couleur,
    description_a_propos: `${nom} est votre destination de confiance pour dénicher des produits de qualité supérieure rigoureusement sélectionnés. Notre mission est d'offrir une expérience d'achat en ligne irréprochable avec un service client disponible 7j/7 et le paiement à la livraison partout en Afrique. Chaque commande est inspectée avec soin avant expédition pour vous garantir une satisfaction totale dès l'ouverture du colis.`,
    categories_produits_suggerees: categories,
    source: 'african_copy_engine',
  };
}

/**
 * Appelle Google Gemini avec le schéma JSON strict demandé.
 */
export async function generateStoreBrandingWithGemini(
  input: GenerateBrandingInput,
): Promise<StoreBrandingOutput> {
  const apiKey = input.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || '';

  const prompt = buildGeminiBrandingPrompt(input.userIdea);

  if (apiKey) {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro'];

    for (const model of modelsToTry) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          }),
        });

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
              typeof parsed.nom_boutique_propose === 'string' &&
              typeof parsed.slogan_accrocheur === 'string' &&
              typeof parsed.couleur_hexadecimale === 'string' &&
              typeof parsed.description_a_propos === 'string' &&
              Array.isArray(parsed.categories_produits_suggerees)
            ) {
              return {
                nom_boutique_propose: parsed.nom_boutique_propose,
                slogan_accrocheur: parsed.slogan_accrocheur,
                couleur_hexadecimale: parsed.couleur_hexadecimale,
                description_a_propos: parsed.description_a_propos,
                categories_produits_suggerees: parsed.categories_produits_suggerees.map((c) =>
                  String(c),
                ),
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

  return generateAfricanBrandingFallback(input.userIdea);
}
