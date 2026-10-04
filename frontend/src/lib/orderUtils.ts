/**
 * Utility functions for Order IDs and African E-commerce Store Codes
 * Format strict demandé : CMD-[CODE_BOUTIQUE]-[NUMERO_6_CHIFFRES]
 * Exemples :
 * - "Juula" -> CMD-JUULA-000001
 * - "Boutique Dakar Élégance" -> CMD-BDE-000001
 * - "Juula Store" -> CMD-JS-000001
 */

export function getStoreCode(storeName: string): string {
  if (!storeName || !storeName.trim()) return 'JS';
  const clean = storeName.trim();
  const words = clean.split(/[\s-_]+/).filter(Boolean);

  const firstWord = words[0];
  if (words.length === 1 && firstWord) {
    // 1 mot : on prend le mot nettoyé en majuscules (max 6 lettres)
    return firstWord.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'JS';
  }

  // Plusieurs mots : on prend les initiales de chaque mot
  const initials = words
    .map((w) => w.charAt(0))
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  return initials.slice(0, 6) || 'JS';
}

export function formatOrderId(storeNameOrCode: string, sequenceNumber: number): string {
  const code =
    storeNameOrCode.length <= 6 && storeNameOrCode === storeNameOrCode.toUpperCase()
      ? storeNameOrCode
      : getStoreCode(storeNameOrCode);

  const formattedSeq = String(sequenceNumber).padStart(6, '0');
  return `CMD-${code}-${formattedSeq}`;
}

/**
 * Deterministic number formatting avoiding locale hydration mismatches between SSR and browser
 */
export function formatNumber(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatFCFA(amount: number): string {
  return `${formatNumber(amount)} FCFA`;
}

