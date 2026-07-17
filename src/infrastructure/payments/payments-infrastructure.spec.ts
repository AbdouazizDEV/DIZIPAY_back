import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';
import { DomainPaymentStatus } from '@/domain/payments/enums/payment-status.enum';
import {
  PaymentOperationNotSupportedError,
  PaymentProviderUnavailableError,
} from '@/domain/payments/errors/domain.errors';
import { Money } from '@/domain/payments/value-objects/money.vo';
import {
  createBankPayoutAccount,
  createMobileMoneyPayoutAccount,
} from '@/domain/payments/value-objects/payout-account';
import { PspiPaymentProviderAdapter } from '@/infrastructure/payments/pispi/pspi-payment-provider.adapter';
import { PspiPayoutProviderAdapter } from '@/infrastructure/payments/pispi/pspi-payout-provider.adapter';
import { WavePaymentProviderAdapter } from '@/infrastructure/payments/wave/wave-payment-provider.adapter';
import { EmailTreasurerNotificationAdapter } from '@/infrastructure/payments/notifications/email-treasurer-notification.adapter';
import { TreasurerOperationType } from '@/domain/payments/enums/treasurer-operation-type.enum';
import type { PISPIService } from '@/modules/payments/pispi/pispi.service';
import type { ConfigService } from '@nestjs/config';

describe('PspiPaymentProviderAdapter', () => {
  const pispi = {
    resolveAlias: jest.fn(),
    initiatePayment: jest.fn(),
    getPaymentStatus: jest.fn(),
  } as unknown as jest.Mocked<PISPIService>;

  const adapter = new PspiPaymentProviderAdapter(pispi);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('résout l’alias puis initie le paiement PSPI', async () => {
    pispi.resolveAlias.mockResolvedValue({
      accountId: '10188672388920614979',
      accountName: 'Client',
      institution: 'OM',
      country: 'SN',
      available: true,
    });
    pispi.initiatePayment.mockResolvedValue({
      id: 'pay-1',
      status: 'SUCCESS',
      reference: 'REF-1',
      pispiReference: 'PISPI-1',
    });

    const result = await adapter.initiatePayment({
      payer: { aliasType: 'PHONE', aliasValue: '+221771234567' },
      creditAccount: 'merchant-account',
      amount: 1000,
      currency: 'XOF',
      reference: 'REF-1',
    });

    expect(pispi.resolveAlias).toHaveBeenCalledWith({
      aliasType: 'PHONE',
      aliasValue: '+221771234567',
    });
    expect(pispi.initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        debitAccount: '10188672388920614979',
        creditAccount: 'merchant-account',
        amount: 1000,
      }),
    );
    expect(result).toEqual({
      providerPaymentId: 'pay-1',
      status: DomainPaymentStatus.SUCCESS,
      reference: 'REF-1',
      providerReference: 'PISPI-1',
    });
  });

  it('refuse le remboursement (non supporté MVP)', async () => {
    await expect(
      adapter.refundPayment({
        providerPaymentId: 'pay-1',
        amount: 100,
        currency: 'XOF',
      }),
    ).rejects.toBeInstanceOf(PaymentOperationNotSupportedError);
  });
});

describe('PspiPayoutProviderAdapter', () => {
  const pispi = {
    initiatePayment: jest.fn(),
    getPaymentStatus: jest.fn(),
  } as unknown as jest.Mocked<PISPIService>;

  const adapter = new PspiPayoutProviderAdapter(pispi);

  beforeEach(() => {
    jest.clearAllMocks();
    pispi.initiatePayment.mockResolvedValue({
      id: 'payout-1',
      status: 'PENDING',
      reference: 'OUT-1',
    });
  });

  it('mappe un compte mobile money vers le creditAccount PSPI', async () => {
    const beneficiary = createMobileMoneyPayoutAccount({
      pispiAccountId: '10188672388920614979',
      holderName: 'Amadou',
    });

    await adapter.initiatePayout({
      beneficiary,
      debitAccount: 'platform-debit',
      money: Money.create(5000),
      reference: 'OUT-1',
    });

    expect(pispi.initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        creditAccount: '10188672388920614979',
        debitAccount: 'platform-debit',
        amount: 5000,
      }),
    );
  });

  it('mappe un IBAN bancaire vers le creditAccount PSPI', async () => {
    const beneficiary = createBankPayoutAccount({
      iban: 'FR76 3000 6000 0112 3456 7890 189',
      holderName: 'Société SA',
    });

    await adapter.initiatePayout({
      beneficiary,
      debitAccount: 'platform-debit',
      money: Money.create(25000),
      reference: 'OUT-BANK',
    });

    expect(pispi.initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        creditAccount: 'FR7630006000011234567890189',
        amount: 25000,
      }),
    );
  });
});

describe('WavePaymentProviderAdapter', () => {
  const adapter = new WavePaymentProviderAdapter();

  it('lève une erreur explicite « non disponible »', async () => {
    await expect(
      adapter.initiatePayment({
        payer: { aliasType: 'PHONE', aliasValue: '770000000' },
        creditAccount: 'x',
        amount: 100,
        currency: 'XOF',
        reference: 'W-1',
      }),
    ).rejects.toBeInstanceOf(PaymentProviderUnavailableError);

    expect(adapter.providerType).toBe(PaymentProviderType.WAVE);
  });
});

describe('EmailTreasurerNotificationAdapter', () => {
  it('formate et journalise la notification sans lever', async () => {
    const config = {
      get: jest.fn().mockReturnValue('tresor@example.com'),
    } as unknown as ConfigService;

    const adapter = new EmailTreasurerNotificationAdapter(config);
    await expect(
      adapter.notify({
        operationType: TreasurerOperationType.DEPOSIT,
        amount: 15000,
        currency: 'XOF',
        accountLabel: 'compte-marchand-1',
        occurredAt: new Date('2026-07-17T10:00:00.000Z'),
        reference: 'DEP-1',
      }),
    ).resolves.toBeUndefined();
  });
});
