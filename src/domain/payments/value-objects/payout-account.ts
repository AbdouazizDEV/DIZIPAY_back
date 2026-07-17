import { PayoutAccountType } from '@/domain/payments/enums/payout-account-type.enum';
import { PayoutAccountValidationError } from '@/domain/payments/errors/domain.errors';

/** Données brutes d'un compte mobile money (Orange Money via PI-SPI). */
export interface MobileMoneyAccountProps {
  readonly pispiAccountId: string;
  readonly holderName: string;
  readonly institutionCode?: string;
  readonly phoneNumber?: string;
}

/** Données brutes d'un compte bancaire (virement international). */
export interface BankAccountProps {
  readonly iban: string;
  readonly holderName: string;
  readonly bankName?: string;
  readonly bic?: string;
  readonly countryCode?: string;
}

/**
 * Union discriminée représentant un compte destinataire de virement.
 *
 * Garantit : le type est toujours explicite ; aucun champ optionnel ambigu
 * entre mobile money et compte bancaire.
 */
export type PayoutAccount =
  | {
      readonly type: PayoutAccountType.MOBILE_MONEY;
      readonly account: MobileMoneyAccountProps;
    }
  | {
      readonly type: PayoutAccountType.BANK_ACCOUNT;
      readonly account: BankAccountProps;
    };

/**
 * Fabrique un {@link PayoutAccount} de type MOBILE_MONEY.
 * La validation métier complète est déléguée à {@link PayoutAccountValidationStrategy}.
 */
export function createMobileMoneyPayoutAccount(
  props: MobileMoneyAccountProps,
): PayoutAccount {
  if (!props.pispiAccountId?.trim()) {
    throw new PayoutAccountValidationError(
      "L'identifiant de compte PI-SPI est obligatoire.",
    );
  }
  if (!props.holderName?.trim()) {
    throw new PayoutAccountValidationError(
      'Le nom du titulaire est obligatoire.',
    );
  }
  return {
    type: PayoutAccountType.MOBILE_MONEY,
    account: {
      ...props,
      pispiAccountId: props.pispiAccountId.trim(),
      holderName: props.holderName.trim(),
    },
  };
}

/**
 * Fabrique un {@link PayoutAccount} de type BANK_ACCOUNT.
 * La validation IBAN/RIB est déléguée à {@link PayoutAccountValidationStrategy}.
 */
export function createBankPayoutAccount(props: BankAccountProps): PayoutAccount {
  if (!props.iban?.trim()) {
    throw new PayoutAccountValidationError("L'IBAN/RIB est obligatoire.");
  }
  if (!props.holderName?.trim()) {
    throw new PayoutAccountValidationError(
      'Le nom du titulaire est obligatoire.',
    );
  }
  return {
    type: PayoutAccountType.BANK_ACCOUNT,
    account: {
      ...props,
      iban: props.iban.replace(/\s/g, '').toUpperCase(),
      holderName: props.holderName.trim(),
    },
  };
}
