import { Inject, Injectable } from '@nestjs/common';
import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';
import { DomainPaymentStatus } from '@/domain/payments/enums/payment-status.enum';
import { DepositCompletedEvent } from '@/domain/payments/events/deposit-completed.event';
import {
  InitiatePaymentCommand,
  PaymentInitiationResult,
} from '@/domain/payments/ports/payment-provider.port';
import { DomainEventPublisherPort } from '@/domain/payments/ports/domain-event-publisher.port';
import { DOMAIN_EVENT_PUBLISHER_PORT } from '@/domain/payments/tokens/payment-domain.tokens';
import { PaymentProviderSelector } from '@/application/payments/payment-provider.selector';

export interface InitiateIncomingPaymentInput {
  readonly providerType: PaymentProviderType;
  readonly command: InitiatePaymentCommand;
  /** Libellé compte créditeur pour la notification trésorier. */
  readonly creditAccountLabel?: string;
}

/**
 * Use case : initier un paiement entrant via le fournisseur choisi par le payeur.
 *
 * - Résout le provider via {@link PaymentProviderSelector} (pas de dépendance concrète).
 * - En cas de succès immédiat, émet {@link DepositCompletedEvent} (notification découplée).
 */
@Injectable()
export class InitiateIncomingPaymentUseCase {
  constructor(
    private readonly providerSelector: PaymentProviderSelector,
    @Inject(DOMAIN_EVENT_PUBLISHER_PORT)
    private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  async execute(
    input: InitiateIncomingPaymentInput,
  ): Promise<PaymentInitiationResult> {
    const provider = this.providerSelector.select(input.providerType);
    const result = await provider.initiatePayment(input.command);

    if (result.status === DomainPaymentStatus.SUCCESS) {
      await this.eventPublisher.publish(
        new DepositCompletedEvent(
          new Date(),
          input.command.amount,
          input.command.currency,
          input.creditAccountLabel ?? input.command.creditAccount,
          result.reference,
          result.providerPaymentId,
        ),
      );
    }

    return result;
  }
}
