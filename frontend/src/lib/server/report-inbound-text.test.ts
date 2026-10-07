import { describe, expect, it } from 'vitest';
import { emailOf, htmlToText, stripQuotedReply } from './report-inbound-text';

describe('stripQuotedReply', () => {
  it('drops the Gmail (fr) quoted history', () => {
    const t =
      'Bonjour,\nVoici la capture du virement.\n\nLe mar. 6 oct. 2026 à 23:28, Juula Store Support <support@juula.store> a écrit :\n> Bonjour Fatou,\n> Nous avons ouvert une enquête.';
    expect(stripQuotedReply(t)).toBe('Bonjour,\nVoici la capture du virement.');
  });
  it('handles a header wrapped over two lines and the English form', () => {
    expect(
      stripQuotedReply('Merci\n\nLe 6 oct. 2026, Juula Support\n<s@j.store> a écrit :\n> x'),
    ).toBe('Merci');
    expect(stripQuotedReply('Thanks\nOn Tue, Oct 6, 2026 Juula wrote:\n> hi')).toBe('Thanks');
  });
  it('drops mobile signatures and quoted lines', () => {
    expect(stripQuotedReply('Ok reçu\n> ancien\nEnvoyé de mon iPhone')).toBe('Ok reçu');
  });
  it('never returns an empty message', () => {
    expect(stripQuotedReply('> tout est cité')).toBe('> tout est cité');
  });
});

describe('htmlToText / emailOf', () => {
  it('converts simple HTML and removes quotes', () => {
    expect(
      htmlToText('<div>Bonjour&nbsp;!</div><div>Merci</div><blockquote>vieux</blockquote>'),
    ).toBe('Bonjour !\nMerci');
  });
  it('extracts the address', () => {
    expect(emailOf('Fatou Ndiaye <Fatou@Example.com>')).toBe('fatou@example.com');
    expect(emailOf('a@b.co')).toBe('a@b.co');
  });
});
