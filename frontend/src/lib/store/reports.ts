// Public reports (« Signaler ») — shared between the form, the API and /adminom.

export const REPORT_REASONS = [
  { id: 'not_received', label: 'Produit non reçu après paiement' },
  { id: 'scam', label: 'Arnaque ou fraude suspectée' },
  { id: 'counterfeit', label: 'Produit contrefait ou non conforme' },
  { id: 'dangerous', label: 'Produit dangereux ou interdit' },
  { id: 'abusive', label: 'Comportement abusif / Vendeur injoignable' },
  { id: 'other', label: 'Autre motif' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['id'];
export const REPORT_REASON_IDS = REPORT_REASONS.map((r) => r.id) as [
  ReportReason,
  ...ReportReason[],
];

export function reportReasonLabel(id: string): string {
  return REPORT_REASONS.find((r) => r.id === id)?.label ?? 'Autre motif';
}

export const REPORT_STATUSES = [
  { id: 'new', label: 'Nouveau / Non lu' },
  { id: 'investigating', label: 'En cours d’investigation' },
  { id: 'resolved', label: 'Résolu' },
  { id: 'dismissed', label: 'Classé sans suite' },
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number]['id'];
export const REPORT_STATUS_IDS = REPORT_STATUSES.map((s) => s.id) as [
  ReportStatus,
  ...ReportStatus[],
];

export const REPORT_MAX_IMAGES = 5;
export const REPORT_MAX_DESCRIPTION = 1000;
/** Per photo, after client-side compression. */
export const REPORT_MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const REPORT_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Quick replies offered to the admin (« {cible} » is replaced by the target name). */
export const REPORT_REPLY_TEMPLATES = [
  {
    id: 'ack',
    label: 'Accusé de réception et enquête en cours',
    body: 'Bonjour {prenom},\n\nNous avons bien reçu votre signalement concernant {cible} et nous vous en remercions.\n\nNotre équipe de sécurité a ouvert une enquête. Nous vérifions les informations et les preuves transmises, et nous reviendrons vers vous dès que possible.\n\nCordialement,\nL’équipe sécurité Juula Store',
  },
  {
    id: 'refund',
    label: 'Confirmation du remboursement effectué',
    body: 'Bonjour {prenom},\n\nÀ l’issue de notre enquête concernant {cible}, nous avons procédé à votre remboursement. Le montant a été envoyé sur votre compte Mobile Money ; il peut apparaître sous quelques heures.\n\nMerci de votre confiance et de votre patience.\n\nCordialement,\nL’équipe sécurité Juula Store',
  },
  {
    id: 'sanction',
    label: 'Boutique sanctionnée et fermée',
    body: 'Bonjour {prenom},\n\nSuite à votre signalement et à notre enquête, des sanctions ont été prises contre {cible} : la boutique a été fermée et n’est plus accessible aux acheteurs.\n\nMerci d’avoir contribué à la sécurité de la communauté Juula Store.\n\nCordialement,\nL’équipe sécurité Juula Store',
  },
  {
    id: 'info',
    label: 'Demande d’informations complémentaires',
    body: 'Bonjour {prenom},\n\nNous traitons votre signalement concernant {cible}. Pour avancer, pourriez-vous nous transmettre les éléments suivants en répondant à cet e-mail :\n\n- la référence de votre commande (ex. CMD-…) ;\n- la preuve de paiement (capture Wave / Orange Money) ;\n- vos échanges avec le vendeur.\n\nCordialement,\nL’équipe sécurité Juula Store',
  },
] as const;
