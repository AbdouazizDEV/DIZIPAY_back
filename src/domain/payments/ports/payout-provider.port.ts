import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';
import { DomainPaymentStatus } from '@/domain/payments/enums/payment-status.enum';
import { Money } from '@/domain/payments/value-objects/money.vo';
import { PayoutAccount } from '@/domain/payments/value-objects/payout-account';

/**
 * Commande d'initiation de virement sortant (marchand / plateforme → bénéficiaire).
 */
export interface InitiatePayoutCommand {
  readonly beneficiary: PayoutAccount;
  readonly debitAccount: string;
  readonly money: Money;
  readonly reference: string;
  readonly description?: string;
}

/**
 * Résultat normalisé après initiation d'un virement.
 */
export interface PayoutInitiationResult {
  readonly providerPayoutId: string;
  readonly status: DomainPaymentStatus;
  readonly reference: string;
  readonly providerReference?: string;
}

/**
 * Port de domaine — virements sortants via PSPI (mobile money ou compte bancaire).
 *
 * Contrat :
 * - Le bénéficiaire est toujours un {@link PayoutAccount} validé en amont
 *   par une {@link PayoutAccountValidationStrategy}.
 * - Le use case d'initiation ne connaît pas le format IBAN vs compte PSPI :
 *   c'est l'adapter qui mappe selon {@link PayoutAccount.type}.
 * - Pour le MVP, seule l'implémentation PSPI est prévue.
 */
export interface PayoutProviderPort {
  readonly providerType: PaymentProviderType;

  initiatePayout(command: InitiatePayoutCommand): Promise<PayoutInitiationResult>;

  getPayoutStatus(providerPayoutId: string): Promise<PayoutInitiationResult>;
}
