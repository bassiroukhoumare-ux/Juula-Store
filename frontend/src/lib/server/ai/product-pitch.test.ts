import { describe, it, expect } from 'vitest';
import {
  buildGeminiProductPitchPrompt,
  inferTemplate,
  generateAfricanProductPitchFallback,
  generateProductTemplateAndCopyWithGemini,
} from './product-pitch';

describe('AI Product Pitch & Art Direction Engine — E-commerce COD Afrique', () => {
  it('buildGeminiProductPitchPrompt construit le prompt strict avec la liste des templates et les clés JSON', () => {
    const prompt = buildGeminiProductPitchPrompt('Montre Royale Chrono', 25000);
    expect(prompt).toContain('Montre Royale Chrono');
    expect(prompt).toContain('25\u202f000 FCFA');
    expect(prompt).toContain('TEMPLATE_BEAUTE_SANTE');
    expect(prompt).toContain('TEMPLATE_TECH_GADGET');
    expect(prompt).toContain('TEMPLATE_MODE_VETEMENT');
    expect(prompt).toContain('TEMPLATE_MAISON_CUISINE');
    expect(prompt).toContain('TEMPLATE_GENERIQUE');
    expect(prompt).toContain('id_design_choisi');
    expect(prompt).toContain('titre_page_vente');
    expect(prompt).toContain('texte_intro_probleme');
    expect(prompt).toContain('argumentaire_solution');
    expect(prompt).toContain('liste_benefices_puces');
    expect(prompt).toContain('texte_urgence');
    expect(prompt).toContain('texte_garantie');
    expect(prompt).toContain('bouton_appel_action');
  });

  it('inferTemplate déduit correctement les templates visuels par niche', () => {
    expect(inferTemplate('Sérum visage bio')).toBe('TEMPLATE_BEAUTE_SANTE');
    expect(inferTemplate('Écouteurs sans fil bluetooth')).toBe('TEMPLATE_TECH_GADGET');
    expect(inferTemplate('Robe chic en soie')).toBe('TEMPLATE_MODE_VETEMENT');
    expect(inferTemplate('Mixeur multifonction cuisine')).toBe('TEMPLATE_MAISON_CUISINE');
    expect(inferTemplate('Pack universel multi-usage')).toBe('TEMPLATE_GENERIQUE');
  });

  it('generateAfricanProductPitchFallback génère les 8 champs requis pour le Cash on Delivery', () => {
    const pitch = generateAfricanProductPitchFallback('Sérum Anti-Taches Éclat', 15000);
    expect(pitch.id_design_choisi).toBe('TEMPLATE_BEAUTE_SANTE');
    expect(pitch.titre_page_vente).toBeTruthy();
    expect(pitch.texte_intro_probleme).toBeTruthy();
    expect(pitch.argumentaire_solution).toBeTruthy();
    expect(pitch.liste_benefices_puces.length).toBe(3);
    expect(pitch.texte_urgence).toBeTruthy();
    expect(pitch.texte_garantie.toLowerCase()).toContain('livraison');
    expect(pitch.bouton_appel_action).toContain('15\u202f000 FCFA');
  });

  it('generateProductTemplateAndCopyWithGemini fonctionne avec repli en cas de clé invalide', async () => {
    const result = await generateProductTemplateAndCopyWithGemini({
      productName: 'Chaussures Cuir Homme',
      price: 30000,
      apiKey: 'INVALID_TEST_KEY',
    });
    expect(result.id_design_choisi).toBe('TEMPLATE_MODE_VETEMENT');
    expect(result.titre_page_vente).toBeTruthy();
    expect(result.liste_benefices_puces.length).toBe(3);
    expect(result.bouton_appel_action).toBeTruthy();
  });
});
