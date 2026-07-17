import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';
import { DomainPaymentStatus } from '@/domain/payments/enums/payment-status.enum';
import { PaymentProviderUnavailableError } from '@/domain/payments/errors/domain.errors';
import { DepositCompletedEvent } from '@/domain/payments/events/deposit-completed.event';
import { WithdrawalCompletedEvent } from '@/domain/payments/events/withdrawal-completed.event';
import { DomainEventPublisherPort } from '@/domain/payments/ports/domain-event-publisher.port';
import { PaymentProviderPort } from '@/domain/payments/ports/payment-provider.port';
import { PayoutProviderPort } from '@/domain/payments/ports/payout-provider.port';
import { TreasurerNotificationPort } from '@/domain/payments/ports/treasurer-notification.port';
import { Money } from '@/domain/payments/value-objects/money.vo';
import {
  createBankPayoutAccount,
  createMobileMoneyPayoutAccount,
} from '@/domain/payments/value-objects/payout-account';
import { PayoutAccountValidatorRegistry } from '@/domain/payments/validation/payout-account-validator.registry';
import { PaymentProviderSelector } from '@/application/payments/payment-provider.selector';
import { InitiateIncomingPaymentUseCase } from '@/application/payments/use-cases/initiate-incoming-payment.use-case';
import { GetPaymentStatusUseCase } from '@/application/payments/use-cases/get-payment-status.use-case';
import { InitiatePayoutUseCase } from '@/application/payments/use-cases/initiate-payout.use-case';
import { NotifyTreasurerOnDepositHandler } from '@/application/payments/handlers/notify-treasurer-on-deposit.handler';
import { NotifyTreasurerOnWithdrawalHandler } from '@/application/payments/handlers/notify-treasurer-on-withdrawal.handler';

function mockPaymentProvider(
  type: PaymentProviderType,
  overrides: Partial<PaymentProviderPort> = {},
): PaymentProviderPort {
  return {
    providerType: type,
    initiatePayment: jest.fn(),
    getPaymentStatus: jest.fn(),
    refundPayment: jest.fn(),
    ...overrides,
  };
}

describe('PaymentProviderSelector', () => {
  const pspi = mockPaymentProvider(PaymentProviderType.PSPI);
  const wave = mockPaymentProvider(PaymentProviderType.WAVE);
  const selector = new PaymentProviderSelector(pspi, wave);

  it('résout PSPI', () => {
    expect(selector.select(PaymentProviderType.PSPI)).toBe(pspi);
  });

  it('résout Wave (adapter stub — erreur au moment de l’appel)', () => {
    expect(selector.select(PaymentProviderType.WAVE)).toBe(wave);
  });
});

describe('InitiateIncomingPaymentUseCase', () => {
  it('délègue au provider sélectionné et émet DepositCompletedEvent si SUCCESS', async () => {
    const initiatePayment = jest.fn().mockResolvedValue({
      providerPaymentId: 'pay-1',
      status: DomainPaymentStatus.SUCCESS,
      reference: 'REF-1',
    });
    const pspi = mockPaymentProvider(PaymentProviderType.PSPI, {
      initiatePayment,
    });
    const wave = mockPaymentProvider(PaymentProviderType.WAVE);
    const selector = new PaymentProviderSelector(pspi, wave);
    const publish = jest.fn().mockResolvedValue(undefined);
    const publisher: DomainEventPublisherPort = { publish };

    const useCase = new InitiateIncomingPaymentUseCase(selector, publisher);
    const result = await useCase.execute({
      providerType: PaymentProviderType.PSPI,
      command: {
        payer: { aliasType: 'PHONE', aliasValue: '+221771234567' },
        creditAccount: 'merchant-1',
        amount: 5000,
        currency: 'XOF',
        reference: 'REF-1',
      },
      creditAccountLabel: 'Marchand Demo',
    });

    expect(initiatePayment).toHaveBeenCalled();
    expect(result.status).toBe(DomainPaymentStatus.SUCCESS);
    expect(publish).toHaveBeenCalledWith(expect.any(DepositCompletedEvent));
  });

  it('n’émet pas d’event si le statut n’est pas SUCCESS', async () => {
    const pspi = mockPaymentProvider(PaymentProviderType.PSPI, {
      initiatePayment: jest.fn().mockResolvedValue({
        providerPaymentId: 'pay-2',
        status: DomainPaymentStatus.PENDING,
        reference: 'REF-2',
      }),
    });
    const selector = new PaymentProviderSelector(
      pspi,
      mockPaymentProvider(PaymentProviderType.WAVE),
    );
    const publish = jest.fn();
    const useCase = new InitiateIncomingPaymentUseCase(selector, { publish });

    await useCase.execute({
      providerType: PaymentProviderType.PSPI,
      command: {
        payer: { aliasType: 'PHONE', aliasValue: '77' },
        creditAccount: 'm',
        amount: 100,
        currency: 'XOF',
        reference: 'REF-2',
      },
    });

    expect(publish).not.toHaveBeenCalled();
  });

  it('propage l’erreur Wave non disponible', async () => {
    const wave = mockPaymentProvider(PaymentProviderType.WAVE, {
      initiatePayment: jest
        .fn()
        .mockRejectedValue(
          new PaymentProviderUnavailableError(PaymentProviderType.WAVE),
        ),
    });
    const selector = new PaymentProviderSelector(
      mockPaymentProvider(PaymentProviderType.PSPI),
      wave,
    );
    const useCase = new InitiateIncomingPaymentUseCase(selector, {
      publish: jest.fn(),
    });

    await expect(
      useCase.execute({
        providerType: PaymentProviderType.WAVE,
        command: {
          payer: { aliasType: 'PHONE', aliasValue: '77' },
          creditAccount: 'm',
          amount: 100,
          currency: 'XOF',
          reference: 'W-1',
        },
      }),
    ).rejects.toBeInstanceOf(PaymentProviderUnavailableError);
  });
});

describe('GetPaymentStatusUseCase', () => {
  it('délègue getPaymentStatus au provider sélectionné', async () => {
    const getPaymentStatus = jest.fn().mockResolvedValue({
      providerPaymentId: 'pay-1',
      status: DomainPaymentStatus.PROCESSING,
      reference: 'REF-1',
    });
    const pspi = mockPaymentProvider(PaymentProviderType.PSPI, {
      getPaymentStatus,
    });
    const useCase = new GetPaymentStatusUseCase(
      new PaymentProviderSelector(
        pspi,
        mockPaymentProvider(PaymentProviderType.WAVE),
      ),
    );

    const result = await useCase.execute({
      providerType: PaymentProviderType.PSPI,
      providerPaymentId: 'pay-1',
    });

    expect(getPaymentStatus).toHaveBeenCalledWith('pay-1');
    expect(result.status).toBe(DomainPaymentStatus.PROCESSING);
  });
});

describe('InitiatePayoutUseCase', () => {
  it('valide le compte puis initie le virement (indépendant de PSPI concret)', async () => {
    const initiatePayout = jest.fn().mockResolvedValue({
      providerPayoutId: 'out-1',
      status: DomainPaymentStatus.SUCCESS,
      reference: 'OUT-1',
    });
    const payoutProvider: PayoutProviderPort = {
      providerType: PaymentProviderType.PSPI,
      initiatePayout,
      getPayoutStatus: jest.fn(),
    };
    const publish = jest.fn().mockResolvedValue(undefined);
    const useCase = new InitiatePayoutUseCase(
      payoutProvider,
      new PayoutAccountValidatorRegistry(),
      { publish },
    );

    const result = await useCase.execute({
      beneficiary: createMobileMoneyPayoutAccount({
        pispiAccountId: '10188672388920614979',
        holderName: 'Client OM',
      }),
      debitAccount: 'platform',
      money: Money.create(10000),
      reference: 'OUT-1',
    });

    expect(initiatePayout).toHaveBeenCalled();
    expect(result.providerPayoutId).toBe('out-1');
    expect(publish).toHaveBeenCalledWith(expect.any(WithdrawalCompletedEvent));
  });

  it('rejette un IBAN invalide avant d’appeler le provider', async () => {
    const initiatePayout = jest.fn();
    const useCase = new InitiatePayoutUseCase(
      {
        providerType: PaymentProviderType.PSPI,
        initiatePayout,
        getPayoutStatus: jest.fn(),
      },
      new PayoutAccountValidatorRegistry(),
      { publish: jest.fn() },
    );

    await expect(
      useCase.execute({
        beneficiary: createBankPayoutAccount({
          iban: 'FR00INVALIDIBAN000',
          holderName: 'X',
        }),
        debitAccount: 'platform',
        money: Money.create(1000),
        reference: 'BAD',
      }),
    ).rejects.toThrow();

    expect(initiatePayout).not.toHaveBeenCalled();
  });
});

describe('NotifyTreasurer handlers', () => {
  it('NotifyTreasurerOnDepositHandler appelle le port notification', async () => {
    const notify = jest.fn().mockResolvedValue(undefined);
    const notifier: TreasurerNotificationPort = { notify };
    const handler = new NotifyTreasurerOnDepositHandler(notifier);

    await handler.handle(
      new DepositCompletedEvent(
        new Date('2026-07-17T10:00:00Z'),
        5000,
        'XOF',
        'Marchand',
        'REF-1',
      ),
    );

    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        currency: 'XOF',
        accountLabel: 'Marchand',
        reference: 'REF-1',
      }),
    );
  });

  it('NotifyTreasurerOnWithdrawalHandler appelle le port notification', async () => {
    const notify = jest.fn().mockResolvedValue(undefined);
    const handler = new NotifyTreasurerOnWithdrawalHandler({ notify });

    await handler.handle(
      new WithdrawalCompletedEvent(
        new Date(),
        2000,
        'XOF',
        'BANK:FR76…0189 (SA)',
        'OUT-1',
      ),
    );

    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2000, reference: 'OUT-1' }),
    );
  });
});
