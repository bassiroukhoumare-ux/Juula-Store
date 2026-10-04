// Legal identity of the publisher, shown on /confidentialite, /conditions
// and the site footer. Empty fields are simply not displayed — fill them in
// (company registration, address, email) before the public launch.
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
  /** Adresse e-mail de contact / protection des données. */
  email: '',
  /** WhatsApp support (affiché dans le tableau de bord). */
  whatsapp: '+221 77 412 89 30',
  whatsappLink: 'https://wa.me/221774128930',
  lastUpdated: '4 octobre 2026',
} as const;

/** "Juula Store" or "Juula Store (Raison sociale)" when the company is filled. */
export function publisherName(): string {
  return LEGAL.companyName ? `${LEGAL.companyName}, exploitant de ${LEGAL.brand}` : LEGAL.brand;
}
