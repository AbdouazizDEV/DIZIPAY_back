import { Module } from '@nestjs/common';
import {
  PAYOUT_PROVIDER_PORT,
  PSPI_PAYMENT_PROVIDER,
  PSPI_PAYOUT_PROVIDER,
  TREASURER_NOTIFICATION_PORT,
  WAVE_PAYMENT_PROVIDER,
} from '@/domain/payments/tokens/payment-domain.tokens';
import { PispiModule } from '@/modules/payments/pispi/pispi.module';
import { EmailTreasurerNotificationAdapter } from '@/infrastructure/payments/notifications/email-treasurer-notification.adapter';
import { PspiPaymentProviderAdapter } from '@/infrastructure/payments/pispi/pspi-payment-provider.adapter';
import { PspiPayoutProviderAdapter } from '@/infrastructure/payments/pispi/pspi-payout-provider.adapter';
import { WavePaymentProviderAdapter } from '@/infrastructure/payments/wave/wave-payment-provider.adapter';

/**
 * Branche les adapters concrets sur les tokens de ports domaine.
 *
 * Les use cases consomment ces tokens via DI — jamais les classes concrètes.
 */
@Module({
  imports: [PispiModule],
  providers: [
    PspiPaymentProviderAdapter,
    {
      provide: PSPI_PAYMENT_PROVIDER,
      useExisting: PspiPaymentProviderAdapter,
    },

    WavePaymentProviderAdapter,
    {
      provide: WAVE_PAYMENT_PROVIDER,
      useExisting: WavePaymentProviderAdapter,
    },

    PspiPayoutProviderAdapter,
    {
      provide: PSPI_PAYOUT_PROVIDER,
      useExisting: PspiPayoutProviderAdapter,
    },
    {
      provide: PAYOUT_PROVIDER_PORT,
      useExisting: PspiPayoutProviderAdapter,
    },

    EmailTreasurerNotificationAdapter,
    {
      provide: TREASURER_NOTIFICATION_PORT,
      useExisting: EmailTreasurerNotificationAdapter,
    },
  ],
  exports: [
    PSPI_PAYMENT_PROVIDER,
    WAVE_PAYMENT_PROVIDER,
    PSPI_PAYOUT_PROVIDER,
    PAYOUT_PROVIDER_PORT,
    TREASURER_NOTIFICATION_PORT,
    PspiPaymentProviderAdapter,
    WavePaymentProviderAdapter,
    PspiPayoutProviderAdapter,
    EmailTreasurerNotificationAdapter,
  ],
})
export class PaymentsInfrastructureModule {}
