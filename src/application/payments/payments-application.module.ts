import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  DOMAIN_EVENT_PUBLISHER_PORT,
  PAYOUT_ACCOUNT_VALIDATOR,
} from '@/domain/payments/tokens/payment-domain.tokens';
import { PayoutAccountValidatorRegistry } from '@/domain/payments/validation/payout-account-validator.registry';
import { PaymentsInfrastructureModule } from '@/infrastructure/payments/payments-infrastructure.module';
import { NestDomainEventPublisher } from '@/infrastructure/payments/events/nest-domain-event.publisher';
import { PaymentProviderSelector } from '@/application/payments/payment-provider.selector';
import { InitiateIncomingPaymentUseCase } from '@/application/payments/use-cases/initiate-incoming-payment.use-case';
import { GetPaymentStatusUseCase } from '@/application/payments/use-cases/get-payment-status.use-case';
import { InitiatePayoutUseCase } from '@/application/payments/use-cases/initiate-payout.use-case';
import { NotifyTreasurerOnDepositHandler } from '@/application/payments/handlers/notify-treasurer-on-deposit.handler';
import { NotifyTreasurerOnWithdrawalHandler } from '@/application/payments/handlers/notify-treasurer-on-withdrawal.handler';

/**
 * Couche application paiement : use cases, sélecteur de provider, handlers d'events.
 *
 * Les controllers (étape 4) importeront ce module et appelleront les use cases.
 */
@Module({
  imports: [EventEmitterModule.forRoot(), PaymentsInfrastructureModule],
  providers: [
    PaymentProviderSelector,
    InitiateIncomingPaymentUseCase,
    GetPaymentStatusUseCase,
    InitiatePayoutUseCase,
    NotifyTreasurerOnDepositHandler,
    NotifyTreasurerOnWithdrawalHandler,
    NestDomainEventPublisher,
    {
      provide: DOMAIN_EVENT_PUBLISHER_PORT,
      useExisting: NestDomainEventPublisher,
    },
    {
      provide: PAYOUT_ACCOUNT_VALIDATOR,
      useFactory: () => new PayoutAccountValidatorRegistry(),
    },
  ],
  exports: [
    PaymentProviderSelector,
    InitiateIncomingPaymentUseCase,
    GetPaymentStatusUseCase,
    InitiatePayoutUseCase,
    DOMAIN_EVENT_PUBLISHER_PORT,
    PAYOUT_ACCOUNT_VALIDATOR,
    PaymentsInfrastructureModule,
  ],
})
export class PaymentsApplicationModule {}
