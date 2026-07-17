/**
 * Erreur levée lorsque le payeur choisit un fournisseur non encore disponible (ex. Wave).
 */
export class PaymentProviderUnavailableError extends Error {
  constructor(provider: string) {
    super(`Le fournisseur de paiement « ${provider} » n'est pas encore disponible.`);
    this.name = 'PaymentProviderUnavailableError';
  }
}

/**
 * Erreur levée lorsqu'un adapter ne supporte pas une opération (ex. remboursement).
 */
export class PaymentOperationNotSupportedError extends Error {
  constructor(operation: string, provider: string) {
    super(
      `L'opération « ${operation} » n'est pas supportée par le fournisseur « ${provider} ».`,
    );
    this.name = 'PaymentOperationNotSupportedError';
  }
}

/**
 * Erreur de validation d'un compte destinataire (Value Object ou stratégie).
 */
export class PayoutAccountValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayoutAccountValidationError';
  }
}
