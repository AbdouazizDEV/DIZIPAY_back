/**
 * Tokens d'injection NestJS pour les ports du domaine paiement.
 *
 * Les use cases et adapters s'enregistrent via ces symboles
 * afin de respecter l'inversion de dépendances (DIP).
 */
export const PAYMENT_PROVIDER_PORT = Symbol('PAYMENT_PROVIDER_PORT');
export const PAYOUT_PROVIDER_PORT = Symbol('PAYOUT_PROVIDER_PORT');
export const TREASURER_NOTIFICATION_PORT = Symbol(
  'TREASURER_NOTIFICATION_PORT',
);
export const DOMAIN_EVENT_PUBLISHER_PORT = Symbol(
  'DOMAIN_EVENT_PUBLISHER_PORT',
);

/** Implémentations concrètes enregistrées individuellement pour le sélecteur. */
export const PSPI_PAYMENT_PROVIDER = Symbol('PSPI_PAYMENT_PROVIDER');
export const WAVE_PAYMENT_PROVIDER = Symbol('WAVE_PAYMENT_PROVIDER');
export const PSPI_PAYOUT_PROVIDER = Symbol('PSPI_PAYOUT_PROVIDER');

/** Registre de validation des comptes destinataires (stratégies). */
export const PAYOUT_ACCOUNT_VALIDATOR = Symbol('PAYOUT_ACCOUNT_VALIDATOR');
