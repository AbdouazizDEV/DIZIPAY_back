import { PayoutAccountValidationError } from '@/domain/payments/errors/domain.errors';

/**
 * Montant monétaire immuable exprimé en plus petite unité (centimes XOF).
 *
 * Garantit : montant strictement positif et devise non vide.
 */
export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string,
  ) {}

  static create(amount: number, currency = 'XOF'): Money {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new PayoutAccountValidationError(
        'Le montant doit être un entier strictement positif (centimes).',
      );
    }
    const normalizedCurrency = currency.trim().toUpperCase();
    if (!normalizedCurrency) {
      throw new PayoutAccountValidationError('La devise est obligatoire.');
    }
    return new Money(amount, normalizedCurrency);
  }
}
