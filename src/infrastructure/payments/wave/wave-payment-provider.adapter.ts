import { Injectable } from '@nestjs/common';
import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';
import { PaymentProviderUnavailableError } from '@/domain/payments/errors/domain.errors';
import {
  InitiatePaymentCommand,
  PaymentInitiationResult,
  PaymentProviderPort,
  PaymentStatusResult,
  RefundPaymentCommand,
  RefundPaymentResult,
} from '@/domain/payments/ports/payment-provider.port';

/**
 * Stub Wave — structure prête pour une future implémentation réelle.
 *
 * Contrat MVP : toute opération lève {@link PaymentProviderUnavailableError}
 * de façon explicite (pas d'échec silencieux).
 *
 * Lorsqu'Wave sera branché : remplacer le corps des méthodes sans toucher
 * aux use cases ni à {@link PspiPaymentProviderAdapter} (Open/Closed).
 */
@Injectable()
export class WavePaymentProviderAdapter implements PaymentProviderPort {
  readonly providerType = PaymentProviderType.WAVE;

  async initiatePayment(
    _command: InitiatePaymentCommand,
  ): Promise<PaymentInitiationResult> {
    throw new PaymentProviderUnavailableError(PaymentProviderType.WAVE);
  }

  async getPaymentStatus(_providerPaymentId: string): Promise<PaymentStatusResult> {
    throw new PaymentProviderUnavailableError(PaymentProviderType.WAVE);
  }

  async refundPayment(
    _command: RefundPaymentCommand,
  ): Promise<RefundPaymentResult> {
    throw new PaymentProviderUnavailableError(PaymentProviderType.WAVE);
  }
}
