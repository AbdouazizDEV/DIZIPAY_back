import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';
import { PayoutAccountType } from '@/domain/payments/enums/payout-account-type.enum';
import {
  InitiatePayoutCommand,
  PayoutInitiationResult,
  PayoutProviderPort,
} from '@/domain/payments/ports/payout-provider.port';
import { PayoutAccount } from '@/domain/payments/value-objects/payout-account';
import { PISPIService } from '@/modules/payments/pispi/pispi.service';
import { mapPispiStatusToDomain } from '@/infrastructure/payments/pispi/pspi-domain-status.mapper';

/**
 * Adapter PI-SPI pour les virements sortants.
 *
 * Mappe {@link PayoutAccount} vers le compte créditeur attendu par l'API :
 * - MOBILE_MONEY → identifiant compte PI-SPI (Orange Money, etc.)
 * - BANK_ACCOUNT → IBAN/RIB normalisé
 *
 * Aucune validation métier ici : elle est faite en amont via les stratégies domaine.
 */
@Injectable()
export class PspiPayoutProviderAdapter implements PayoutProviderPort {
  readonly providerType = PaymentProviderType.PSPI;
  private readonly logger = new Logger(PspiPayoutProviderAdapter.name);

  constructor(private readonly pispiService: PISPIService) {}

  async initiatePayout(
    command: InitiatePayoutCommand,
  ): Promise<PayoutInitiationResult> {
    const creditAccount = this.resolveCreditAccount(command.beneficiary);

    this.logger.log(
      `PSPI initiatePayout type=${command.beneficiary.type} ref=${command.reference}`,
    );

    const response = await this.pispiService.initiatePayment({
      debitAccount: command.debitAccount,
      creditAccount,
      amount: command.money.amount,
      currency: command.money.currency,
      reference: command.reference,
      description:
        command.description ??
        this.defaultDescription(command.beneficiary),
    });

    return {
      providerPayoutId: response.id,
      status: mapPispiStatusToDomain(response.status),
      reference: response.reference,
      providerReference: response.pispiReference,
    };
  }

  async getPayoutStatus(
    providerPayoutId: string,
  ): Promise<PayoutInitiationResult> {
    const response = await this.pispiService.getPaymentStatus(providerPayoutId);
    return {
      providerPayoutId: response.id,
      status: mapPispiStatusToDomain(response.status),
      reference: response.reference,
      providerReference: response.pispiReference,
    };
  }

  /**
   * Traduit le discriminant du VO en identifiant créditeur API.
   * Extension future (autre format bancaire) : ajouter une branche ici uniquement.
   */
  private resolveCreditAccount(beneficiary: PayoutAccount): string {
    switch (beneficiary.type) {
      case PayoutAccountType.MOBILE_MONEY:
        return beneficiary.account.pispiAccountId;
      case PayoutAccountType.BANK_ACCOUNT:
        return beneficiary.account.iban;
      default: {
        const _exhaustive: never = beneficiary;
        return _exhaustive;
      }
    }
  }

  private defaultDescription(beneficiary: PayoutAccount): string {
    if (beneficiary.type === PayoutAccountType.MOBILE_MONEY) {
      return `Virement mobile money — ${beneficiary.account.holderName}`;
    }
    return `Virement bancaire — ${beneficiary.account.holderName}`;
  }
}
