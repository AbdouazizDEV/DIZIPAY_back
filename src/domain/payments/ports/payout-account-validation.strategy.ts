import { PayoutAccountType } from '@/domain/payments/enums/payout-account-type.enum';
import { PayoutAccount } from '@/domain/payments/value-objects/payout-account';

/**
 * Stratégie de validation d'un {@link PayoutAccount} selon son type.
 *
 * Contrat :
 * - Une stratégie ne gère qu'un seul {@link PayoutAccountType} (Single Responsibility).
 * - {@link validate} lève {@link PayoutAccountValidationError} si les règles métier
 *   ne sont pas respectées ; ne retourne rien en cas de succès.
 * - Le use case d'initiation de virement délègue à la stratégie appropriée
 *   sans connaître les règles IBAN vs mobile money.
 */
export interface PayoutAccountValidationStrategy {
  readonly supportedType: PayoutAccountType;

  validate(account: PayoutAccount): void;
}
