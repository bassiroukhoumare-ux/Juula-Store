// Senegal mobile numbers (Wave / Orange Money): "77 123 45 67",
// "+221771234567", "221 77…" → "+221771234567"; anything else → null.
export function toSenegalE164(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '');
  const local = digits.startsWith('221') && digits.length === 12 ? digits.slice(3) : digits;
  return /^7\d{8}$/.test(local) ? `+221${local}` : null;
}

/** "+221771234567" → "77 123 45 67". */
export function formatSenegalPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const local = e164.replace(/^\+221/, '');
  return local.replace(/^(\d{2})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4');
}
