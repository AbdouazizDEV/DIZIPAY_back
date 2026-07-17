/**
 * Type de compte destinataire pour un virement sortant.
 *
 * Utilisé comme discriminant de la Value Object {@link PayoutAccount}
 * afin d'éviter les champs optionnels ambigus.
 */
export enum PayoutAccountType {
  /** Compte mobile money lié à PI-SPI (ex. Orange Money UEMOA). */
  MOBILE_MONEY = 'MOBILE_MONEY',
  /** Compte bancaire classique (IBAN / RIB selon l'API PSPI). */
  BANK_ACCOUNT = 'BANK_ACCOUNT',
}
