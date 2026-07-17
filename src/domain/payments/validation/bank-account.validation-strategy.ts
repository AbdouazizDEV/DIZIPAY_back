import { PayoutAccountType } from '@/domain/payments/enums/payout-account-type.enum';
import { PayoutAccountValidationError } from '@/domain/payments/errors/domain.errors';
import { PayoutAccountValidationStrategy } from '@/domain/payments/ports/payout-account-validation.strategy';
import { PayoutAccount } from '@/domain/payments/value-objects/payout-account';

/**
 * Validation IBAN simplifiée (modulo 97) — suffisante pour le domaine.
 * L'adapter PSPI peut appliquer des règles supplémentaires côté API.
 */
function isValidIban(iban: string): boolean {
  const normalized = iban.replace(/\s/g, '').toUpperCase();
  if (normalized.length < 15 || normalized.length > 34) {
    return false;
  }
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(normalized)) {
    return false;
  }

  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  const numeric = rearranged
    .split('')
    .map((ch) => (/[A-Z]/.test(ch) ? (ch.charCodeAt(0) - 55).toString() : ch))
    .join('');

  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }
  return remainder === 1;
}

/**
 * Valide un compte bancaire destinataire (IBAN / RIB international).
 */
export class BankAccountValidationStrategy
  implements PayoutAccountValidationStrategy
{
  readonly supportedType = PayoutAccountType.BANK_ACCOUNT;

  validate(account: PayoutAccount): void {
    if (account.type !== PayoutAccountType.BANK_ACCOUNT) {
      throw new PayoutAccountValidationError(
        'Stratégie bancaire : type de compte incompatible.',
      );
    }

    const { iban, holderName, bic, countryCode } = account.account;

    if (!isValidIban(iban)) {
      throw new PayoutAccountValidationError('IBAN/RIB invalide.');
    }

    if (!holderName.trim()) {
      throw new PayoutAccountValidationError(
        'Le nom du titulaire bancaire est obligatoire.',
      );
    }

    if (bic && !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) {
      throw new PayoutAccountValidationError('Code BIC/SWIFT invalide.');
    }

    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
      throw new PayoutAccountValidationError(
        'Le code pays doit être au format ISO 3166-1 alpha-2 (ex. SN).',
      );
    }
  }
}
