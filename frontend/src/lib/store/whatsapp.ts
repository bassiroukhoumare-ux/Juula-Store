// WhatsApp numbers: stored as international digits without "+" (wa.me
// format, e.g. "221771234567"). Bare Senegalese mobile numbers (9 digits
// starting with 7) get the 221 country code.

export function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '').replace(/^00/, '');
  if (/^7\d{8}$/.test(digits)) return `221${digits}`;
  if (/^2217\d{8}$/.test(digits)) return digits;
  // Other countries: plausible E.164 length.
  if (/^[1-9]\d{7,14}$/.test(digits) && !digits.startsWith('221')) return digits;
  return null;
}

/** "221771234567" → "+221 77 123 45 67" (other countries: "+<digits>"). */
export function formatWhatsapp(digits: string): string {
  const m = digits.match(/^221(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+221 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : `+${digits}`;
}
