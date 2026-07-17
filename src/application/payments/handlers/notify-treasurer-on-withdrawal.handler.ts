import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  WITHDRAWAL_COMPLETED_EVENT,
  WithdrawalCompletedEvent,
} from '@/domain/payments/events/withdrawal-completed.event';
import { TreasurerNotificationPort } from '@/domain/payments/ports/treasurer-notification.port';
import { TREASURER_NOTIFICATION_PORT } from '@/domain/payments/tokens/payment-domain.tokens';

/**
 * Handler découplé : réagit à un retrait réussi en notifiant le trésorier.
 * Aucune logique d'initiation de virement ici (SRP).
 */
@Injectable()
export class NotifyTreasurerOnWithdrawalHandler {
  private readonly logger = new Logger(NotifyTreasurerOnWithdrawalHandler.name);

  constructor(
    @Inject(TREASURER_NOTIFICATION_PORT)
    private readonly notifier: TreasurerNotificationPort,
  ) {}

  @OnEvent(WITHDRAWAL_COMPLETED_EVENT)
  async handle(event: WithdrawalCompletedEvent): Promise<void> {
    try {
      await this.notifier.notify({
        operationType: event.operationType,
        amount: event.amount,
        currency: event.currency,
        accountLabel: event.accountLabel,
        occurredAt: event.occurredAt,
        reference: event.reference,
      });
    } catch (error) {
      this.logger.error(
        `Échec notification trésorier (retrait): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
