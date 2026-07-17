/**
 * Fournisseur de paiement choisi par le payeur.
 *
 * Le domaine ne connaît que ces identifiants — l'implémentation concrète
 * (PSPI, Wave, etc.) est résolue en infrastructure via injection de dépendances.
 */
export enum PaymentProviderType {
  PSPI = 'PSPI',
  WAVE = 'WAVE',
}
