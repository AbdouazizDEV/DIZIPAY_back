import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';
import { DomainPaymentStatus } from '@/domain/payments/enums/payment-status.enum';

/**
 * Identifiant du payeur côté fournisseur (téléphone, alias PI-SPI, QR…).
 *
 * Le port ne prescrit pas le format — chaque adapter interprète selon son API.
 */
export interface PayerIdentifier {
  /** Type d'alias tel que compris par le fournisseur (PHONE, QR_CODE, PAYMENT_ADDRESS…). */
  readonly aliasType: string;
  readonly aliasValue: string;
}

/**
 * Commande d'initiation de paiement entrant (client → marchand).
 *
 * Contient uniquement les données nécessaires aux use cases ;
 * pas de détails HTTP ou de mapping PSPI.
 */
export interface InitiatePaymentCommand {
  readonly payer: PayerIdentifier;
  readonly creditAccount: string;
  readonly amount: number;
  readonly currency: string;
  readonly reference: string;
  readonly description?: string;
}

/**
 * Résultat normalisé après initiation d'un paiement.
 */
export interface PaymentInitiationResult {
  readonly providerPaymentId: string;
  readonly status: DomainPaymentStatus;
  readonly reference: string;
  readonly providerReference?: string;
}

/**
 * Résultat normalisé d'une consultation de statut.
 */
export interface PaymentStatusResult {
  readonly providerPaymentId: string;
  readonly status: DomainPaymentStatus;
  readonly reference: string;
  readonly providerReference?: string;
}

/**
 * Commande de remboursement (si le fournisseur le supporte).
 */
export interface RefundPaymentCommand {
  readonly providerPaymentId: string;
  readonly amount: number;
  readonly currency: string;
  readonly reason?: string;
}

/**
 * Résultat normalisé d'un remboursement.
 */
export interface RefundPaymentResult {
  readonly refundId: string;
  readonly status: DomainPaymentStatus;
}

/**
 * Port de domaine — abstraction des fournisseurs de paiement entrant.
 *
 * Contrat :
 * - Les implémentations traduisent les erreurs techniques en exceptions domaine
 *   ou HTTP au niveau présentation ; le port lui-même reste synchrone/asynchrone pur.
 * - {@link initiatePayment} doit être idempotent pour une même référence externe
 *   (délégué à l'adapter / API du fournisseur).
 * - {@link getPaymentStatus} retourne toujours un statut normalisé {@link DomainPaymentStatus}.
 * - {@link refundPayment} peut lever {@link PaymentOperationNotSupportedError}
 *   si le fournisseur ne propose pas encore les remboursements.
 *
 * Segregation : ce port expose uniquement ce dont les use cases de collecte ont besoin.
 * Les virements sortants passent par {@link PayoutProviderPort}.
 */
export interface PaymentProviderPort {
  /** Identifiant du fournisseur (PSPI, WAVE…). */
  readonly providerType: PaymentProviderType;

  /**
   * Initie un paiement entrant.
   * Résout l'identifiant payeur si nécessaire avant le débit.
   */
  initiatePayment(
    command: InitiatePaymentCommand,
  ): Promise<PaymentInitiationResult>;

  /** Consulte le statut d'un paiement précédemment initié. */
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult>;

  /**
   * Demande un remboursement partiel ou total.
   * @throws {PaymentOperationNotSupportedError} si non supporté par le fournisseur.
   */
  refundPayment(command: RefundPaymentCommand): Promise<RefundPaymentResult>;
}
