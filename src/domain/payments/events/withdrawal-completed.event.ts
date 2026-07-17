import { DomainEvent } from '@/domain/payments/events/domain-event.interface';
import { TreasurerOperationType } from '@/domain/payments/enums/treasurer-operation-type.enum';

export const WITHDRAWAL_COMPLETED_EVENT = 'payments.withdrawal.completed';

/**
 * Émis lorsqu'un retrait / virement sortant est finalisé avec succès.
 *
 * Consommé par le handler de notification trésorier (découplé du use case virement).
 */
export class WithdrawalCompletedEvent implements DomainEvent {
  readonly eventName = WITHDRAWAL_COMPLETED_EVENT;
  readonly operationType = TreasurerOperationType.WITHDRAWAL;

  constructor(
    readonly occurredAt: Date,
    readonly amount: number,
    readonly currency: string,
    readonly accountLabel: string,
    readonly reference?: string,
    readonly payoutId?: string,
  ) {}
}
