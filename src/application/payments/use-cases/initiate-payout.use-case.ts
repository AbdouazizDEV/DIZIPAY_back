import { Inject, Injectable } from '@nestjs/common';
import { DomainPaymentStatus } from '@/domain/payments/enums/payment-status.enum';
import { PayoutAccountType } from '@/domain/payments/enums/payout-account-type.enum';
import { WithdrawalCompletedEvent } from '@/domain/payments/events/withdrawal-completed.event';
import { DomainEventPublisherPort } from '@/domain/payments/ports/domain-event-publisher.port';
import {
  InitiatePayoutCommand,
  PayoutInitiationResult,
  PayoutProviderPort,
} from '@/domain/payments/ports/payout-provider.port';
import {
  DOMAIN_EVENT_PUBLISHER_PORT,
  PAYOUT_ACCOUNT_VALIDATOR,
  PAYOUT_PROVIDER_PORT,
} from '@/domain/payments/tokens/payment-domain.tokens';
import { PayoutAccountValidatorRegistry } from '@/domain/payments/validation/payout-account-validator.registry';
import { PayoutAccount } from '@/domain/payments/value-objects/payout-account';

/**
 * Use case : initier un virement sortant (mobile money ou compte bancaire).
 *
 * Single Responsibility :
 * - valide le bénéficiaire via le registre de stratégies (pas de if IBAN/OM ici)
 * - délègue l'appel réseau au {@link PayoutProviderPort}
 * - émet {@link WithdrawalCompletedEvent} en cas de succès immédiat
 */
@Injectable()
export class InitiatePayoutUseCase {
  constructor(
    @Inject(PAYOUT_PROVIDER_PORT)
    private readonly payoutProvider: PayoutProviderPort,
    @Inject(PAYOUT_ACCOUNT_VALIDATOR)
    private readonly accountValidator: PayoutAccountValidatorRegistry,
    @Inject(DOMAIN_EVENT_PUBLISHER_PORT)
    private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  async execute(command: InitiatePayoutCommand): Promise<PayoutInitiationResult> {
    this.accountValidator.validate(command.beneficiary);

    const result = await this.payoutProvider.initiatePayout(command);

    if (result.status === DomainPaymentStatus.SUCCESS) {
      await this.eventPublisher.publish(
        new WithdrawalCompletedEvent(
          new Date(),
          command.money.amount,
          command.money.currency,
          this.accountLabel(command.beneficiary),
          result.reference,
          result.providerPayoutId,
        ),
      );
    }

    return result;
  }

  private accountLabel(beneficiary: PayoutAccount): string {
    if (beneficiary.type === PayoutAccountType.MOBILE_MONEY) {
      return `MM:${beneficiary.account.pispiAccountId} (${beneficiary.account.holderName})`;
    }
    const iban = beneficiary.account.iban;
    const masked =
      iban.length > 8 ? `${iban.slice(0, 4)}…${iban.slice(-4)}` : iban;
    return `BANK:${masked} (${beneficiary.account.holderName})`;
  }
}
