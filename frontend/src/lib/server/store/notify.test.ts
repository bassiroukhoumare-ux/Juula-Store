import { describe, it, expect } from 'vitest';
import { escapeHtml, renderEmail } from './notify';

describe('email templates', () => {
  it('escapes customer-controlled values', () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">'&`)).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&#39;&amp;',
    );
  });

  it('renders the Juula header, title and CTA', () => {
    const html = renderEmail({
      preheader: 'pre',
      title: 'Nouvelle commande <script>',
      intro: 'Bonjour',
      rows: [{ label: 'Total', value: '32 000 FCFA' }],
      cta: { label: 'Voir', url: 'https://www.juula.store/dashboard' },
    });
    expect(html).toContain('https://www.juula.store/email/juula-icon.png');
    expect(html).toContain('Nouvelle commande &lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('href="https://www.juula.store/dashboard"');
  });
});
