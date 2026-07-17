import { PayoutAccountType } from '@/domain/payments/enums/payout-account-type.enum';
import { PayoutAccountValidationError } from '@/domain/payments/errors/domain.errors';
import { PayoutAccountValidationStrategy } from '@/domain/payments/ports/payout-account-validation.strategy';
import { PayoutAccount } from '@/domain/payments/value-objects/payout-account';
import { BankAccountValidationStrategy } from '@/domain/payments/validation/bank-account.validation-strategy';
import { MobileMoneyAccountValidationStrategy } from '@/domain/payments/validation/mobile-money-account.validation-strategy';

/**
 * Registre des stratégies de validation par type de compte.
 *
 * Permet au use case d'initiation de virement de valider sans `switch` :
 * il délègue à {@link validate} qui résout la bonne stratégie.
 */
export class PayoutAccountValidatorRegistry {
  private readonly strategies: Map<
    PayoutAccountType,
    PayoutAccountValidationStrategy
  >;

  constructor(strategies?: PayoutAccountValidationStrategy[]) {
    const defaults = strategies ?? [
      new MobileMoneyAccountValidationStrategy(),
      new BankAccountValidationStrategy(),
    ];
    this.strategies = new Map(
      defaults.map((s) => [s.supportedType, s]),
    );
  }

  /**
   * Valide un compte via la stratégie correspondant à son discriminant.
   * @throws {PayoutAccountValidationError} si aucune stratégie ou règles invalides.
   */
  validate(account: PayoutAccount): void {
    const strategy = this.strategies.get(account.type);
    if (!strategy) {
      throw new PayoutAccountValidationError(
        `Aucune stratégie de validation pour le type « ${account.type} ».`,
      );
    }
    strategy.validate(account);
  }
}
