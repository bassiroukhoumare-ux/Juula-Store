import { describe, it, expect } from 'vitest';
import {
  buildGeminiBrandingPrompt,
  generateAfricanBrandingFallback,
  generateStoreBrandingWithGemini,
} from './branding';

describe('AI Branding Engine — Création d’Entreprise E-commerce Afrique', () => {
  it('buildGeminiBrandingPrompt construit le prompt strict avec les 5 clés JSON demandées', () => {
    const prompt = buildGeminiBrandingPrompt('Vente de produits cosmétiques et sérums');
    expect(prompt).toContain('Vente de produits cosmétiques et sérums');
    expect(prompt).toContain('nom_boutique_propose');
    expect(prompt).toContain('slogan_accrocheur');
    expect(prompt).toContain('couleur_hexadecimale');
    expect(prompt).toContain('description_a_propos');
    expect(prompt).toContain('categories_produits_suggerees');
  });

  it('generateAfricanBrandingFallback génère une identité de marque complète et cohérente', () => {
    const branding = generateAfricanBrandingFallback('Vente de montres et bijoux de luxe');
    expect(branding.nom_boutique_propose).toBeTruthy();
    expect(branding.slogan_accrocheur).toBeTruthy();
    expect(branding.couleur_hexadecimale).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(branding.description_a_propos).toBeTruthy();
    expect(branding.categories_produits_suggerees.length).toBeGreaterThanOrEqual(3);
  });

  it('generateStoreBrandingWithGemini retombe sur le moteur de repli avec succès si la clé est invalide', async () => {
    const result = await generateStoreBrandingWithGemini({
      userIdea: 'Vêtements chics et mode à Dakar',
      apiKey: 'INVALID_TEST_KEY',
    });
    expect(result.nom_boutique_propose).toBeTruthy();
    expect(result.slogan_accrocheur).toBeTruthy();
    expect(result.couleur_hexadecimale).toBeTruthy();
    expect(result.description_a_propos).toBeTruthy();
  });
});
