/**
 * Statut normalisé d'un paiement côté domaine.
 *
 * Indépendant des libellés propres à chaque fournisseur (PSPI, Wave…).
 * Les adapters sont responsables du mapping vers ce vocabulaire commun.
 */
export enum DomainPaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
