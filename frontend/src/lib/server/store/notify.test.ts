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
      label: 'Commande',
      title: 'Nouvelle commande <script>',
      intro: 'Bonjour',
      sections: [{ title: 'Commande', rows: [{ label: 'Total', value: '32 000 FCFA' }] }],
      cta: { label: 'Voir', url: 'https://www.juula.store/dashboard' },
    });
    expect(html).toContain('https://www.juula.store/email/juula-logo.png');
    expect(html).toContain('Nouvelle commande &lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('href="https://www.juula.store/dashboard"');
    expect(html).toContain('https://www.juula.store/conditions');
    expect(html).toContain('https://www.juula.store/confidentialite');
  });
});

describe('order & withdrawal emails', async () => {
  const { newOrderEmail, withdrawalCompletedEmail, withdrawalFailedEmail, failureReasonText } =
    await import('./notify');
  const now = new Date('2026-10-04T18:42:00Z');

  it('new order email links straight to the order, without a WhatsApp button', () => {
    const mail = newOrderEmail({
      id: 'o1',
      merchantId: 'm',
      productId: 'p',
      number: 1,
      reference: 'CMD-JLA-000001',
      productName: '<b>Montre</b>',
      productImage: null,
      quantity: 1,
      selectedColor: null,
      amount: 15000,
      deliveryFee: 0,
      totalAmount: 15000,
      currency: 'FCFA',
      customerName: 'Awa',
      phone: '+221 771234567',
      whatsappNumber: '221771234567',
      neighborhood: null,
      city: null,
      deliveryAddress: 'Mermoz',
      deliveryNotes: null,
      paymentType: 'cod',
      paymentStatus: 'pending_cod',
      status: 'new',
      createdAt: now,
      updatedAt: now,
      providerSessionId: null,
      providerPaymentId: null,
      paidAt: null,
      availableAt: null,
      netAmount: null,
    } as never);
    expect(mail.html).toContain('https://www.juula.store/dashboard?commande=CMD-JLA-000001');
    expect(mail.html).not.toContain('Écrire au client');
    expect(mail.html).toContain('&lt;b&gt;Montre&lt;/b&gt;');
  });

  it('withdrawal confirmed / failed emails', () => {
    const w = {
      id: 'w1',
      userId: 'm',
      amount: 50000,
      currency: 'XOF',
      status: 'COMPLETED',
      destination: { method: 'WAVE', phone: '+221771234567' },
      provider: 'moneriz',
      providerPayoutId: 'po_1',
      failureReason: 'INVALID_PHONE',
      requestedAt: now,
      processedAt: now,
      completedAt: now,
    } as never;
    expect(withdrawalCompletedEmail(w).subject).toContain('confirmé');
    const failed = withdrawalFailedEmail(w);
    expect(failed.html).toContain('numéro de destination est invalide');
    expect(failed.html).toContain('Réessayer le retrait');
    expect(failureReasonText(null)).toBe('L’opérateur a refusé le virement.');
  });

  it('renders payment confirmed and verification templates', async () => {
    const { paymentConfirmedEmail, verificationEmailTemplate, passwordResetEmailTemplate } =
      await import('./notify');
    const order = {
      reference: 'CMD-JLA-000002',
      productName: 'Sac cuir',
      quantity: 1,
      totalAmount: 25000,
      customerName: 'Fatou',
      phone: '+221 770000000',
      whatsappNumber: '221770000000',
      deliveryAddress: 'Plateau',
      paymentType: 'online_wave',
      paidAt: now,
      netAmount: 25000,
    } as never;
    const paidMail = paymentConfirmedEmail(order);
    expect(paidMail.subject).toContain('Paiement reçu');
    expect(paidMail.html).toContain('Payée en ligne');
    expect(paidMail.html).toContain('25\u00A0000\u00A0FCFA');

    const verifyMail = verificationEmailTemplate('123456');
    expect(verifyMail.subject).toContain('123456');
    expect(verifyMail.html).toContain('123456');
    expect(verifyMail.html).toContain('Validez votre adresse e-mail');

    const resetMail = passwordResetEmailTemplate('654321');
    expect(resetMail.subject).toContain('654321');
    expect(resetMail.html).toContain('654321');
  });
});
