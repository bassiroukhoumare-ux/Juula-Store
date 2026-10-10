import { describe, it, expect } from 'vitest';
import {
  buildGeminiCopywritingPrompt,
  generateAfricanCopyFallback,
  generateCopywritingWithGemini,
} from './copywriting';

describe('Copywriting Engine — Marché Africain (COD & WhatsApp)', () => {
  it('buildGeminiCopywritingPrompt injecte correctement les configurations de la boutique et du produit', () => {
    const prompt = buildGeminiCopywritingPrompt({
      productName: 'Montre Royale Quartz',
      storeName: 'Dakar Prestige Store',
      price: 25000,
      originalPrice: 35000,
      deliveryFree: true,
      city: 'Dakar',
      whatsapp: '+221770000000',
    });

    expect(prompt).toContain('Montre Royale Quartz');
    expect(prompt).toContain('Dakar Prestige Store');
    expect(prompt).toContain('25\u202f000 FCFA');
    expect(prompt).toContain('Livraison 100% OFFERTE');
    expect(prompt).toContain('Dakar');
    expect(prompt).toContain('titre_principal');
    expect(prompt).toContain('urgence_rarete');
    expect(prompt).toContain('bouton_cta');
  });

  it('generateAfricanCopyFallback retourne le format JSON strict à 7 clés', () => {
    const fallback = generateAfricanCopyFallback({
      productName: 'Sérum Anti-Taches Éclat',
      price: 15000,
      city: 'Abidjan',
      deliveryFree: false,
    });

    expect(fallback.titre_principal).toBeTruthy();
    expect(fallback.sous_titre).toBeTruthy();
    expect(fallback.description_probleme_solution).toBeTruthy();
    expect(Array.isArray(fallback.benefices_puces)).toBe(true);
    expect(fallback.benefices_puces.length).toBeGreaterThanOrEqual(4);
    expect(fallback.garantie_confiance.toLowerCase()).toContain('livraison');
    expect(fallback.urgence_rarete).toBeTruthy();
    expect(fallback.bouton_cta).toBeTruthy();
    expect(fallback.source).toBe('african_copy_engine');
  });

  it('generateCopywritingWithGemini retombe sur le moteur de repli avec succès en cas d’absence de clé valide', async () => {
    const result = await generateCopywritingWithGemini({
      productName: 'Chaussures Cuir Véritable',
      price: 28000,
      city: 'Dakar',
      apiKey: 'INVALID_TEST_KEY',
    });

    expect(result.titre_principal).toContain('Chaussures Cuir Véritable');
    expect(result.benefices_puces.length).toBe(4);
    expect(result.bouton_cta).toBeTruthy();
    expect(result.garantie_confiance).toBeTruthy();
  });
});
