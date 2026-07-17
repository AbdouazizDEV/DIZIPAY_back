import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';
import { PaymentOperationNotSupportedError } from '@/domain/payments/errors/domain.errors';
import {
  InitiatePaymentCommand,
  PaymentInitiationResult,
  PaymentProviderPort,
  PaymentStatusResult,
  RefundPaymentCommand,
  RefundPaymentResult,
} from '@/domain/payments/ports/payment-provider.port';
import {
  PISPIService,
  ResolveAliasRequest,
} from '@/modules/payments/pispi/pispi.service';
import { mapPispiStatusToDomain } from '@/infrastructure/payments/pispi/pspi-domain-status.mapper';

/**
 * Adapter PI-SPI pour les paiements entrants (client → marchand).
 *
 * Délègue à {@link PISPIService} sans le modifier (Open/Closed).
 * Résout l'alias payeur puis initie le débit instantané.
 */
@Injectable()
export class PspiPaymentProviderAdapter implements PaymentProviderPort {
  readonly providerType = PaymentProviderType.PSPI;
  private readonly logger = new Logger(PspiPaymentProviderAdapter.name);

  constructor(private readonly pispiService: PISPIService) {}

  async initiatePayment(
    command: InitiatePaymentCommand,
  ): Promise<PaymentInitiationResult> {
    this.logger.log(
      `PSPI initiatePayment ref=${command.reference} amount=${command.amount}`,
    );

    const alias = await this.pispiService.resolveAlias(
      this.toResolveAliasRequest(command.payer.aliasType, command.payer.aliasValue),
    );

    if (!alias.available) {
      throw new Error(
        `Compte payeur indisponible (institution: ${alias.institution}).`,
      );
    }

    const response = await this.pispiService.initiatePayment({
      debitAccount: alias.accountId,
      creditAccount: command.creditAccount,
      amount: command.amount,
      currency: command.currency,
      reference: command.reference,
      description: command.description,
    });

    return {
      providerPaymentId: response.id,
      status: mapPispiStatusToDomain(response.status),
      reference: response.reference,
      providerReference: response.pispiReference,
    };
  }

  async getPaymentStatus(
    providerPaymentId: string,
  ): Promise<PaymentStatusResult> {
    const response = await this.pispiService.getPaymentStatus(providerPaymentId);
    return {
      providerPaymentId: response.id,
      status: mapPispiStatusToDomain(response.status),
      reference: response.reference,
      providerReference: response.pispiReference,
    };
  }

  async refundPayment(
    _command: RefundPaymentCommand,
  ): Promise<RefundPaymentResult> {
    throw new PaymentOperationNotSupportedError(
      'refund',
      PaymentProviderType.PSPI,
    );
  }

  private toResolveAliasRequest(
    aliasType: string,
    aliasValue: string,
  ): ResolveAliasRequest {
    const normalized = aliasType.trim().toUpperCase();
    const allowed: ResolveAliasRequest['aliasType'][] = [
      'PHONE',
      'QR_CODE',
      'PAYMENT_ADDRESS',
    ];
    const mapped = (allowed.includes(
      normalized as ResolveAliasRequest['aliasType'],
    )
      ? normalized
      : 'PHONE') as ResolveAliasRequest['aliasType'];

    return { aliasType: mapped, aliasValue };
  }
}
