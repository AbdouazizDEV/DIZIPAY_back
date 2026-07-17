import { DomainEvent } from '@/domain/payments/events/domain-event.interface';
import { TreasurerOperationType } from '@/domain/payments/enums/treasurer-operation-type.enum';

export const DEPOSIT_COMPLETED_EVENT = 'payments.deposit.completed';

/**
 * Émis lorsqu'un dépôt est finalisé avec succès.
 *
 * Consommé par le handler de notification trésorier (découplé du use case paiement).
 */
export class DepositCompletedEvent implements DomainEvent {
  readonly eventName = DEPOSIT_COMPLETED_EVENT;
  readonly operationType = TreasurerOperationType.DEPOSIT;

  constructor(
    readonly occurredAt: Date,
    readonly amount: number,
    readonly currency: string,
    readonly accountLabel: string,
    readonly reference?: string,
    readonly transactionId?: string,
  ) {}
}
