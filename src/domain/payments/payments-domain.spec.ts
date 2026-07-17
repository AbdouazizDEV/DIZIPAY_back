import { PayoutAccountValidationError } from '@/domain/payments/errors/domain.errors';
import { Money } from '@/domain/payments/value-objects/money.vo';
import {
  createBankPayoutAccount,
  createMobileMoneyPayoutAccount,
} from '@/domain/payments/value-objects/payout-account';
import { BankAccountValidationStrategy } from '@/domain/payments/validation/bank-account.validation-strategy';
import { MobileMoneyAccountValidationStrategy } from '@/domain/payments/validation/mobile-money-account.validation-strategy';
import { PayoutAccountValidatorRegistry } from '@/domain/payments/validation/payout-account-validator.registry';

describe('Money', () => {
  it('crée un montant valide en centimes XOF', () => {
    const money = Money.create(5000, 'XOF');
    expect(money.amount).toBe(5000);
    expect(money.currency).toBe('XOF');
  });

  it('rejette un montant non entier ou négatif', () => {
    expect(() => Money.create(0)).toThrow(PayoutAccountValidationError);
    expect(() => Money.create(-100)).toThrow(PayoutAccountValidationError);
    expect(() => Money.create(10.5)).toThrow(PayoutAccountValidationError);
  });
});

describe('MobileMoneyAccountValidationStrategy', () => {
  const strategy = new MobileMoneyAccountValidationStrategy();

  it('accepte un compte PI-SPI mobile money valide', () => {
    const account = createMobileMoneyPayoutAccount({
      pispiAccountId: '10188672388920614979',
      holderName: 'Amadou Diop',
      phoneNumber: '+221771234567',
    });
    expect(() => strategy.validate(account)).not.toThrow();
  });

  it('rejette un identifiant PI-SPI trop court', () => {
    const account = createMobileMoneyPayoutAccount({
      pispiAccountId: '123',
      holderName: 'Test',
    });
    expect(() => strategy.validate(account)).toThrow(PayoutAccountValidationError);
  });
});

describe('BankAccountValidationStrategy', () => {
  const strategy = new BankAccountValidationStrategy();

  it('accepte un IBAN valide', () => {
    const account = createBankPayoutAccount({
      iban: 'FR76 3000 6000 0112 3456 7890 189',
      holderName: 'Société Example',
      bic: 'BNPAFRPP',
      countryCode: 'FR',
    });
    expect(() => strategy.validate(account)).not.toThrow();
  });

  it('rejette un IBAN invalide', () => {
    const account = createBankPayoutAccount({
      iban: 'FR00INVALIDIBAN000',
      holderName: 'Test',
    });
    expect(() => strategy.validate(account)).toThrow(PayoutAccountValidationError);
  });
});

describe('PayoutAccountValidatorRegistry', () => {
  const registry = new PayoutAccountValidatorRegistry();

  it('route vers la bonne stratégie selon le discriminant', () => {
    const mobile = createMobileMoneyPayoutAccount({
      pispiAccountId: '10188672388920614979',
      holderName: 'Client OM',
    });
    const bank = createBankPayoutAccount({
      iban: 'FR76 3000 6000 0112 3456 7890 189',
      holderName: 'Banque SA',
    });

    expect(() => registry.validate(mobile)).not.toThrow();
    expect(() => registry.validate(bank)).not.toThrow();
  });
});
