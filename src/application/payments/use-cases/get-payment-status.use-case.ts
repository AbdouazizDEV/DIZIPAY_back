import { Injectable } from '@nestjs/common';
import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';
import { PaymentStatusResult } from '@/domain/payments/ports/payment-provider.port';
import { PaymentProviderSelector } from '@/application/payments/payment-provider.selector';

export interface GetPaymentStatusInput {
  readonly providerType: PaymentProviderType;
  readonly providerPaymentId: string;
}

/**
 * Use case : consulter le statut d'un paiement auprès du fournisseur choisi.
 */
@Injectable()
export class GetPaymentStatusUseCase {
  constructor(private readonly providerSelector: PaymentProviderSelector) {}

  async execute(input: GetPaymentStatusInput): Promise<PaymentStatusResult> {
    const provider = this.providerSelector.select(input.providerType);
    return provider.getPaymentStatus(input.providerPaymentId);
  }
}
