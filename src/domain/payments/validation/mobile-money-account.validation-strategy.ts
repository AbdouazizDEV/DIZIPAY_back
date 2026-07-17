import { PayoutAccountType } from '@/domain/payments/enums/payout-account-type.enum';
import { PayoutAccountValidationError } from '@/domain/payments/errors/domain.errors';
import { PayoutAccountValidationStrategy } from '@/domain/payments/ports/payout-account-validation.strategy';
import { PayoutAccount } from '@/domain/payments/value-objects/payout-account';

/** Longueur minimale d'un identifiant compte PI-SPI (sandbox / prod). */
const MIN_PISPI_ACCOUNT_ID_LENGTH = 10;

/**
 * Valide un compte mobile money lié à PI-SPI (ex. Orange Money UEMOA).
 */
export class MobileMoneyAccountValidationStrategy
  implements PayoutAccountValidationStrategy
{
  readonly supportedType = PayoutAccountType.MOBILE_MONEY;

  validate(account: PayoutAccount): void {
    if (account.type !== PayoutAccountType.MOBILE_MONEY) {
      throw new PayoutAccountValidationError(
        'Stratégie mobile money : type de compte incompatible.',
      );
    }

    const { pispiAccountId, holderName, phoneNumber } = account.account;

    if (pispiAccountId.length < MIN_PISPI_ACCOUNT_ID_LENGTH) {
      throw new PayoutAccountValidationError(
        `L'identifiant compte PI-SPI doit contenir au moins ${MIN_PISPI_ACCOUNT_ID_LENGTH} caractères.`,
      );
    }

    if (!/^\d+$/.test(pispiAccountId)) {
      throw new PayoutAccountValidationError(
        "L'identifiant compte PI-SPI doit être numérique.",
      );
    }

    if (!holderName.trim()) {
      throw new PayoutAccountValidationError(
        'Le nom du titulaire mobile money est obligatoire.',
      );
    }

    if (phoneNumber && !/^\+?[0-9]{8,15}$/.test(phoneNumber.replace(/\s/g, ''))) {
      throw new PayoutAccountValidationError(
        'Le numéro de téléphone mobile money est invalide.',
      );
    }
  }
}
