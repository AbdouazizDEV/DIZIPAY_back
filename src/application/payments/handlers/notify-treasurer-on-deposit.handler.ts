import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  DEPOSIT_COMPLETED_EVENT,
  DepositCompletedEvent,
} from '@/domain/payments/events/deposit-completed.event';
import { TreasurerNotificationPort } from '@/domain/payments/ports/treasurer-notification.port';
import { TREASURER_NOTIFICATION_PORT } from '@/domain/payments/tokens/payment-domain.tokens';

/**
 * Handler découplé : réagit à un dépôt réussi en notifiant le trésorier.
 * Aucune logique d'initiation de paiement ici (SRP).
 */
@Injectable()
export class NotifyTreasurerOnDepositHandler {
  private readonly logger = new Logger(NotifyTreasurerOnDepositHandler.name);

  constructor(
    @Inject(TREASURER_NOTIFICATION_PORT)
    private readonly notifier: TreasurerNotificationPort,
  ) {}

  @OnEvent(DEPOSIT_COMPLETED_EVENT)
  async handle(event: DepositCompletedEvent): Promise<void> {
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
        `Échec notification trésorier (dépôt): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
