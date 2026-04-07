import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  QRCodeType,
  TransactionStatus,
} from '@prisma/client';
import type { QrPayloadInput } from '@pi-spi/qrcode';
import { PrismaService } from '@/database/prisma.service';
import { PISPIService, PispiPaymentStatus } from './pispi/pispi.service';
import { QRData, QRDecoderService } from './qr/qr-decoder.service';
import { QRGeneratorService } from './qr/qr-generator.service';
import { GenerateMerchantQrDto } from './dto/generate-merchant-qr.dto';
import { ScanQRDto } from './dto/scan-qr.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pispiService: PISPIService,
    private readonly qrDecoder: QRDecoderService,
    private readonly qrGenerator: QRGeneratorService,
  ) {}

  /**
   * Parcours client scanne le QR du marchand (payload EMVCo PI-SPI).
   * Tout wallet de la zone peut décoder le même format — cf. guides BCEAO.
   */
  async generateMerchantPresentedQr(
    merchantId: string,
    dto: GenerateMerchantQrDto,
  ) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Marchand introuvable');
    }

    if (!merchant.pispiAlias?.trim()) {
      throw new BadRequestException(
        'Alias PI-SPI (UUID) requis : renseignez merchant.pispiAlias (portail développeur / compte marchand).',
      );
    }

    this.qrGenerator.assertValidPaymentAlias(merchant.pispiAlias);

    let qrType: 'STATIC' | 'DYNAMIC' =
      dto.qrType ??
      (dto.amount != null && dto.amount > 0 ? 'DYNAMIC' : 'STATIC');

    if (qrType === 'DYNAMIC' && (!dto.amount || dto.amount <= 0)) {
      throw new BadRequestException(
        'Un QR dynamique nécessite un montant (centimes XOF) strictement positif.',
      );
    }

    const countryCode = this.qrGenerator.getDefaultCountryCode();
    let referenceLabel = (dto.referenceLabel ?? 'DIZIPAY').slice(0, 25);
    let transactionId: string | undefined;

    if (qrType === 'DYNAMIC') {
      const tx = await this.prisma.transaction.create({
        data: {
          merchantId,
          amount: dto.amount!,
          currency: 'XOF',
          status: TransactionStatus.PENDING,
          paymentMethod: PaymentMethod.PISPI,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      transactionId = tx.id;
      const shortRef = tx.id.replace(/-/g, '').slice(0, 25);
      referenceLabel = (dto.referenceLabel ?? shortRef).slice(0, 25);
    }

    const input: QrPayloadInput = {
      alias: merchant.pispiAlias.trim(),
      countryCode,
      qrType,
      referenceLabel,
      ...(qrType === 'DYNAMIC' && dto.amount != null
        ? { amount: dto.amount }
        : {}),
    };

    const payload = this.qrGenerator.buildPayload(input);
    const validation = this.qrGenerator.verifyPayload(payload);

    if (!validation.valid) {
      this.logger.warn(
        `Payload EMV invalide: ${validation.errors.join(', ')}`,
      );
    }

    let qrRecord = await this.prisma.qRCode.findFirst({
      where: { merchantId, content: payload },
    });

    if (!qrRecord) {
      qrRecord = await this.prisma.qRCode.create({
        data: {
          merchantId,
          type: qrType === 'DYNAMIC' ? QRCodeType.DYNAMIC : QRCodeType.STATIC,
          content: payload,
          format: 'EMVCo',
          detectedType: 'PISPI',
          parsedData: { ...input } as object,
          expiresAt:
            qrType === 'DYNAMIC'
              ? new Date(Date.now() + 15 * 60 * 1000)
              : undefined,
        },
      });
    }

    if (transactionId) {
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: { qrCodeId: qrRecord.id },
      });
    }

    let svg: string | undefined;
    if (dto.includeSvg) {
      svg = await this.qrGenerator.toSvg(input, dto.svgSize ?? 280);
    }

    return {
      flow: 'MERCHANT_PRESENTED' as const,
      documentation: [
        'https://developer.pispi.bceao.int/guides/qr-generation',
        'https://developer.pispi.bceao.int/tutoriels',
      ],
      payload,
      qrType,
      countryCode,
      referenceLabel,
      transactionId,
      qrCodeId: qrRecord.id,
      validation,
      svg,
      hints: {
        merchantQr:
          'Le client scanne ce QR avec son application (Wave, OM, banque PI-SPI, etc.) et valide le paiement.',
        merchantScanFallback:
          'Sinon : POST /payments/scan-and-pay — le marchand scanne le QR du client.',
      },
    };
  }

  async scanAndPay(merchantId: string, dto: ScanQRDto) {
    this.logger.log(`Merchant ${merchantId} scanning QR for payment`);

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Marchand introuvable');
    }

    if (!merchant.pispiAccountId) {
      throw new BadRequestException(
        'Compte PI-SPI non configuré pour ce marchand',
      );
    }

    const qrData = this.qrDecoder.decodeQR(dto.qrCode);
    const paymentMethod = this.mapQrTypeToPaymentMethod(qrData);

    const transaction = await this.prisma.transaction.create({
      data: {
        merchantId,
        amount: dto.amount,
        currency: 'XOF',
        description: dto.description,
        status: TransactionStatus.PENDING,
        paymentMethod,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    try {
      const aliasInfo = await this.resolveClientAccount(qrData, dto.qrCode);
      const clientAccountId = aliasInfo.accountId;
      const clientName = aliasInfo.accountName;

      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          clientName,
          clientPhone: qrData.phone,
          clientAlias: qrData.alias,
          pispiDebitAccount: clientAccountId,
          pispiCreditAccount: merchant.pispiAccountId,
          status: TransactionStatus.PROCESSING,
          initiatedAt: new Date(),
        },
      });

      const paymentResult = await this.pispiService.initiatePayment({
        debitAccount: clientAccountId,
        creditAccount: merchant.pispiAccountId,
        amount: dto.amount,
        currency: 'XOF',
        reference: transaction.id,
        description: dto.description,
      });

      const txStatus = this.mapPispiToTransactionStatus(paymentResult.status);

      const updated = await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          pispiPaymentId: paymentResult.id,
          pispiTransactionRef: paymentResult.pispiReference,
          status: txStatus,
          confirmedAt:
            txStatus === TransactionStatus.SUCCESS ? new Date() : null,
        },
      });

      return {
        transactionId: updated.id,
        status: updated.status,
        amount: updated.amount,
        clientName,
        pispiPaymentId: updated.pispiPaymentId,
      };
    } catch (error) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          failedAt: new Date(),
        },
      });

      throw error;
    }
  }

  private async resolveClientAccount(qrData: QRData, rawQr: string) {
    if (qrData.type === 'PISPI' && qrData.alias) {
      return this.pispiService.resolveAlias({
        aliasType: 'QR_CODE',
        aliasValue: qrData.alias,
      });
    }

    if (qrData.phone) {
      return this.pispiService.resolveAlias({
        aliasType: 'PHONE',
        aliasValue: qrData.phone,
      });
    }

    return this.pispiService.resolveAlias({
      aliasType: 'QR_CODE',
      aliasValue: rawQr,
    });
  }

  private mapQrTypeToPaymentMethod(data: QRData): PaymentMethod {
    const map: Record<QRData['type'], PaymentMethod> = {
      WAVE: PaymentMethod.WAVE,
      ORANGE_MONEY: PaymentMethod.ORANGE_MONEY,
      FREE_MONEY: PaymentMethod.FREE_MONEY,
      PISPI: PaymentMethod.PISPI,
      UNKNOWN: PaymentMethod.UNKNOWN,
    };
    return map[data.type];
  }

  private mapPispiToTransactionStatus(
    s: PispiPaymentStatus,
  ): TransactionStatus {
    if (s === 'SUCCESS') {
      return TransactionStatus.SUCCESS;
    }
    if (s === 'FAILED') {
      return TransactionStatus.FAILED;
    }
    return TransactionStatus.PROCESSING;
  }

  async getTransactionStatus(merchantId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        merchantId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    const terminal: TransactionStatus[] = [
      TransactionStatus.SUCCESS,
      TransactionStatus.FAILED,
      TransactionStatus.CANCELLED,
      TransactionStatus.EXPIRED,
    ];
    if (terminal.includes(transaction.status)) {
      return {
        transactionId: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
      };
    }

    if (
      transaction.pispiPaymentId &&
      transaction.status === TransactionStatus.PROCESSING
    ) {
      const pispiStatus = await this.pispiService.getPaymentStatus(
        transaction.pispiPaymentId,
      );

      const next = this.mapPispiToTransactionStatus(pispiStatus.status);

      if (next !== transaction.status) {
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: next,
            confirmedAt:
              next === TransactionStatus.SUCCESS ? new Date() : null,
            failedAt: next === TransactionStatus.FAILED ? new Date() : null,
          },
        });
      }

      return {
        transactionId: transaction.id,
        status: next,
        amount: transaction.amount,
      };
    }

    return {
      transactionId: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
    };
  }

  async cancelTransaction(merchantId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        merchantId,
        status: {
          in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING],
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(
        'Transaction introuvable ou déjà terminée',
      );
    }

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.CANCELLED,
      },
    });

    return {
      transactionId: transaction.id,
      status: TransactionStatus.CANCELLED,
    };
  }
}
