// Legal identity of the publisher, shown on /confidentialite, /conditions
// and the site footer. Empty fields are simply not displayed — fill them in
// (company registration, address) before the public launch.
export const LEGAL = {
  brand: 'Juula Store',
  siteUrl: 'https://www.juula.store',
  /** Raison sociale de l'entité qui exploite Juula Store. */
  companyName: '',
  /** Ex. « SARL au capital de … FCFA ». */
  legalForm: '',
  /** Numéro RCCM (Registre du Commerce et du Crédit Mobilier). */
  rccm: '',
  /** NINEA. */
  ninea: '',
  /** Adresse du siège. */
  address: '',
  country: 'Sénégal',
  // Aucune coordonnée de support (téléphone, e-mail) n'est publiée : les
  // demandes passent par le tableau de bord et le formulaire « Signaler ».
  lastUpdated: '7 octobre 2026',
} as const;

/** "Juula Store" or "Juula Store (Raison sociale)" when the company is filled. */
export function publisherName(): string {
  return LEGAL.companyName ? `${LEGAL.companyName}, exploitant de ${LEGAL.brand}` : LEGAL.brand;
}
