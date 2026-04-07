/**
 * Référence d’intégration API Business PI-SPI (sandbox / production).
 * Les chemins exacts peuvent être préfixés selon la version publiée par la BCEAO
 * — vérifier la spec OpenAPI sur le portail développeur.
 *
 * Documentation portail :
 * - Guides : https://developer.pispi.bceao.int/guides
 * - Tutoriels : https://developer.pispi.bceao.int/tutoriels
 * - Génération QR EMV (payload interopérable) : https://developer.pispi.bceao.int/guides/qr-generation
 *
 * Flux métier DiziPay :
 * 1) QR présenté par le marchand (EMVCo) : tous les clients peuvent scanner avec l’app de leur PSP
 *    → payload générée côté backend via @pi-spi/qrcode (SDK officiel JS).
 * 2) QR présenté par le client (ou téléphone) : le marchand scanne → résolution alias + initiation paiement
 *    → POST alias/resoudre + POST paiements/initier (implémenté dans PISPIService).
 */
export const PISPI_HTTP_PATHS = {
  /** Résolution téléphone / QR / adresse de paiement vers compte PI-SPI */
  resolveAlias: '/alias/resoudre',
  /** Initiation d’un paiement instantané (débit créditeur) */
  initiatePayment: '/paiements/initier',
  /** Consultation du statut d’un paiement */
  paymentStatus: (pispiPaymentId: string) =>
    `/paiements/${pispiPaymentId}/statut`,
} as const;
