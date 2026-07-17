import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentLinkStatus,
  PaymentMethod,
  QRCodeType,
  TransactionStatus,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import type { QrPayloadInput } from '@pi-spi/qrcode';
import { PrismaService } from '@/database/prisma.service';
import { PISPIService } from '@/modules/payments/pispi/pispi.service';
import { QRData, QRDecoderService } from '@/modules/payments/qr/qr-decoder.service';
import { QRGeneratorService } from '@/modules/payments/qr/qr-generator.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { PayPaymentLinkDto } from './dto/pay-payment-link.dto';

const MAX_EXPIRES_MINUTES = 7 * 24 * 60;
const DEFAULT_EXPIRES_MINUTES = 24 * 60;

@Injectable()
export class PaymentLinksService {
  private readonly logger = new Logger(PaymentLinksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly pispiService: PISPIService,
    private readonly qrDecoder: QRDecoderService,
    private readonly qrGenerator: QRGeneratorService,
  ) {}

  async create(merchantId: string, dto: CreatePaymentLinkDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) {
      throw new NotFoundException('Marchand introuvable');
    }
    if (!merchant.pispiAlias?.trim()) {
      throw new BadRequestException(
        'Alias PI-SPI requis (merchant.pispiAlias) pour générer un QR sur le lien.',
      );
    }
    this.qrGenerator.assertValidPaymentAlias(merchant.pispiAlias);

    const expiresIn = Math.min(
      dto.expiresInMinutes ?? DEFAULT_EXPIRES_MINUTES,
      MAX_EXPIRES_MINUTES,
    );
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);
    const token = this.generateToken();

    const transaction = await this.prisma.transaction.create({
      data: {
        merchantId,
        amount: dto.amount,
        currency: 'XOF',
        description: dto.description,
        status: TransactionStatus.PENDING,
        paymentMethod: PaymentMethod.PISPI,
        expiresAt,
        metadata: { source: 'payment_link' },
      },
    });

    const countryCode = this.qrGenerator.getDefaultCountryCode();
    const referenceLabel = transaction.id.replace(/-/g, '').slice(0, 25);
    const input: QrPayloadInput = {
      alias: merchant.pispiAlias.trim(),
      countryCode,
      qrType: 'DYNAMIC',
      referenceLabel,
      amount: dto.amount,
    };
    const payload = this.qrGenerator.buildPayload(input);

    const qrRecord = await this.prisma.qRCode.create({
      data: {
        merchantId,
        type: QRCodeType.DYNAMIC,
        content: payload,
        format: 'EMVCo',
        detectedType: 'PISPI',
        parsedData: { ...input, paymentLinkToken: token } as object,
        expiresAt,
      },
    });

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { qrCodeId: qrRecord.id },
    });

    const link = await this.prisma.paymentLink.create({
      data: {
        token,
        merchantId,
        amount: dto.amount,
        currency: 'XOF',
        description: dto.description,
        status: PaymentLinkStatus.ACTIVE,
        transactionId: transaction.id,
        qrPayload: payload,
        qrCodeId: qrRecord.id,
        expiresAt,
      },
    });

    let svg: string | undefined;
    if (dto.includeSvg !== false) {
      svg = await this.qrGenerator.toSvg(input, 280);
    }

    this.logger.log(
      `PaymentLink créé token=${token} merchant=${merchantId} amount=${dto.amount}`,
    );

    return this.toMerchantView(link, merchant.name, svg);
  }

  async list(merchantId: string) {
    const links = await this.prisma.paymentLink.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { merchant: { select: { name: true } } },
    });
    return links.map((l) => this.toMerchantView(l, l.merchant.name));
  }

  async getPublicByToken(token: string) {
    const link = await this.refreshIfExpired(await this.findByToken(token));
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: link.merchantId },
      select: { name: true, type: true },
    });

    let svg: string | undefined;
    if (link.qrPayload && link.status === PaymentLinkStatus.ACTIVE) {
      try {
        const m = await this.prisma.merchant.findUnique({
          where: { id: link.merchantId },
        });
        if (m?.pispiAlias) {
          const input: QrPayloadInput = {
            alias: m.pispiAlias.trim(),
            countryCode: this.qrGenerator.getDefaultCountryCode(),
            qrType: 'DYNAMIC',
            amount: link.amount,
            referenceLabel: (link.transactionId ?? link.id)
              .replace(/-/g, '')
              .slice(0, 25),
          };
          svg = await this.qrGenerator.toSvg(input, 280);
        }
      } catch (e) {
        this.logger.warn(`SVG QR lien ${token}: ${(e as Error).message}`);
      }
    }

    return {
      token: link.token,
      amount: link.amount,
      currency: link.currency,
      description: link.description,
      status: link.status,
      expiresAt: link.expiresAt,
      paidAt: link.paidAt,
      merchantName: merchant?.name ?? 'Marchand',
      merchantType: merchant?.type,
      qrPayload: link.status === PaymentLinkStatus.ACTIVE ? link.qrPayload : null,
      svg: link.status === PaymentLinkStatus.ACTIVE ? svg : undefined,
      url: this.buildShareUrl(link.token),
      instructions:
        link.status === PaymentLinkStatus.ACTIVE
          ? 'Scannez le QR avec Wave, Orange Money, Free Money ou une app PI-SPI, ou utilisez POST /payment-links/:token/pay avec votre téléphone / QR wallet.'
          : undefined,
    };
  }

  async getStatusByToken(token: string) {
    const link = await this.refreshIfExpired(await this.findByToken(token));
    let txStatus: TransactionStatus | null = null;
    if (link.transactionId) {
      const tx = await this.prisma.transaction.findUnique({
        where: { id: link.transactionId },
      });
      txStatus = tx?.status ?? null;
      if (
        tx &&
        tx.status === TransactionStatus.SUCCESS &&
        link.status !== PaymentLinkStatus.PAID
      ) {
        await this.markPaid(link.id);
        return {
          token: link.token,
          status: PaymentLinkStatus.PAID,
          transactionStatus: tx.status,
          amount: link.amount,
          currency: link.currency,
          paidAt: new Date(),
        };
      }
    }
    return {
      token: link.token,
      status: link.status,
      transactionStatus: txStatus,
      amount: link.amount,
      currency: link.currency,
      paidAt: link.paidAt,
    };
  }

  /**
   * Le client paie via son wallet (téléphone / alias / QR) — débit PI-SPI vers le marchand.
   * Alternative : scanner le QR marchand affiché sur la page publique.
   */
  async pay(token: string, dto: PayPaymentLinkDto) {
    let link = await this.refreshIfExpired(await this.findByToken(token));
    if (link.status !== PaymentLinkStatus.ACTIVE) {
      throw new BadRequestException(
        `Ce lien n'est plus payable (statut: ${link.status})`,
      );
    }

    if (!dto.qrCode && !dto.clientPhone?.trim() && !dto.clientAlias?.trim()) {
      throw new BadRequestException(
        'Fournissez qrCode, clientPhone ou clientAlias pour initier le paiement.',
      );
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: link.merchantId },
    });
    if (!merchant?.pispiAccountId) {
      throw new BadRequestException(
        'Compte PI-SPI marchand non configuré (pispiAccountId).',
      );
    }

    let transaction = link.transactionId
      ? await this.prisma.transaction.findUnique({
          where: { id: link.transactionId },
        })
      : null;

    if (!transaction) {
      transaction = await this.prisma.transaction.create({
        data: {
          merchantId: link.merchantId,
          amount: link.amount,
          currency: link.currency,
          description: link.description,
          status: TransactionStatus.PENDING,
          paymentMethod: PaymentMethod.PISPI,
          expiresAt: link.expiresAt ?? undefined,
          metadata: { source: 'payment_link', token },
        },
      });
      link = await this.prisma.paymentLink.update({
        where: { id: link.id },
        data: { transactionId: transaction.id },
      });
    }

    if (
      transaction.status === TransactionStatus.SUCCESS ||
      transaction.status === TransactionStatus.PROCESSING
    ) {
      throw new BadRequestException(
        'Un paiement est déjà en cours ou terminé pour ce lien.',
      );
    }

    try {
      const aliasInfo = await this.resolveClientDebit(dto);
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          clientName: aliasInfo.accountName,
          clientPhone: dto.clientPhone,
          clientAlias: dto.clientAlias ?? aliasInfo.accountId,
          pispiDebitAccount: aliasInfo.accountId,
          pispiCreditAccount: merchant.pispiAccountId,
          status: TransactionStatus.PROCESSING,
          initiatedAt: new Date(),
          paymentMethod: PaymentMethod.PISPI,
        },
      });

      const paymentResult = await this.pispiService.initiatePayment({
        debitAccount: aliasInfo.accountId,
        creditAccount: merchant.pispiAccountId,
        amount: link.amount,
        currency: link.currency,
        reference: transaction.id,
        description: link.description ?? 'Paiement via lien DiziPay',
      });

      const txStatus =
        paymentResult.status === 'SUCCESS'
          ? TransactionStatus.SUCCESS
          : paymentResult.status === 'FAILED'
            ? TransactionStatus.FAILED
            : TransactionStatus.PROCESSING;

      const updated = await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          pispiPaymentId: paymentResult.id,
          pispiTransactionRef: paymentResult.pispiReference,
          status: txStatus,
          confirmedAt:
            txStatus === TransactionStatus.SUCCESS ? new Date() : null,
          failedAt: txStatus === TransactionStatus.FAILED ? new Date() : null,
        },
      });

      if (txStatus === TransactionStatus.SUCCESS) {
        await this.markPaid(link.id);
      }

      return {
        token: link.token,
        transactionId: updated.id,
        status: updated.status,
        paymentLinkStatus:
          txStatus === TransactionStatus.SUCCESS
            ? PaymentLinkStatus.PAID
            : PaymentLinkStatus.ACTIVE,
        amount: updated.amount,
        clientName: aliasInfo.accountName,
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

  async cancel(merchantId: string, token: string) {
    const link = await this.prisma.paymentLink.findFirst({
      where: { token, merchantId },
    });
    if (!link) {
      throw new NotFoundException('Lien introuvable');
    }
    if (link.status === PaymentLinkStatus.PAID) {
      throw new BadRequestException('Impossible d’annuler un lien déjà payé');
    }
    if (link.status === PaymentLinkStatus.CANCELLED) {
      return this.toMerchantView(link);
    }

    const updated = await this.prisma.paymentLink.update({
      where: { id: link.id },
      data: { status: PaymentLinkStatus.CANCELLED },
    });

    if (link.transactionId) {
      await this.prisma.transaction.updateMany({
        where: {
          id: link.transactionId,
          status: {
            in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING],
          },
        },
        data: { status: TransactionStatus.CANCELLED },
      });
    }

    return this.toMerchantView(updated);
  }

  /** Appelé depuis le webhook PI-SPI quand la transaction liée passe à SUCCESS */
  async markPaidByTransactionId(transactionId: string) {
    const link = await this.prisma.paymentLink.findFirst({
      where: { transactionId },
    });
    if (!link || link.status === PaymentLinkStatus.PAID) {
      return;
    }
    await this.markPaid(link.id);
  }

  private async markPaid(paymentLinkId: string) {
    await this.prisma.paymentLink.update({
      where: { id: paymentLinkId },
      data: {
        status: PaymentLinkStatus.PAID,
        paidAt: new Date(),
      },
    });
  }

  private async findByToken(token: string) {
    const link = await this.prisma.paymentLink.findUnique({
      where: { token },
    });
    if (!link) {
      throw new NotFoundException('Lien de paiement introuvable');
    }
    return link;
  }

  private async refreshIfExpired<
    T extends { id: string; status: PaymentLinkStatus; expiresAt: Date | null },
  >(link: T): Promise<T> {
    if (
      link.status === PaymentLinkStatus.ACTIVE &&
      link.expiresAt &&
      link.expiresAt.getTime() < Date.now()
    ) {
      const updated = await this.prisma.paymentLink.update({
        where: { id: link.id },
        data: { status: PaymentLinkStatus.EXPIRED },
      });
      return updated as unknown as T;
    }
    return link;
  }

  private async resolveClientDebit(dto: PayPaymentLinkDto) {
    if (dto.qrCode) {
      const qrData = this.qrDecoder.decodeQR(dto.qrCode);
      return this.resolveFromQrData(qrData, dto.qrCode);
    }
    if (dto.clientAlias?.trim()) {
      return this.pispiService.resolveAlias({
        aliasType: 'PAYMENT_ADDRESS',
        aliasValue: dto.clientAlias.trim(),
      });
    }
    return this.pispiService.resolveAlias({
      aliasType: 'PHONE',
      aliasValue: dto.clientPhone!.trim(),
    });
  }

  private async resolveFromQrData(qrData: QRData, rawQr: string) {
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

  private generateToken(): string {
    return createHash('sha256')
      .update(randomBytes(32))
      .digest('hex')
      .slice(0, 32);
  }

  private buildShareUrl(token: string): string {
    const base = (
      this.config.get<string>('PAYMENT_LINK_PUBLIC_BASE_URL') ||
      process.env.PAYMENT_LINK_PUBLIC_BASE_URL ||
      process.env.WEB_APP_URL ||
      'http://localhost:5173'
    ).replace(/\/$/, '');
    return `${base}/pay/${token}`;
  }

  private toMerchantView(
    link: {
      id: string;
      token: string;
      amount: number;
      currency: string;
      description: string | null;
      status: PaymentLinkStatus;
      expiresAt: Date | null;
      paidAt: Date | null;
      qrPayload: string | null;
      transactionId: string | null;
      createdAt: Date;
    },
    merchantName?: string,
    svg?: string,
  ) {
    return {
      id: link.id,
      token: link.token,
      url: this.buildShareUrl(link.token),
      amount: link.amount,
      currency: link.currency,
      description: link.description,
      status: link.status,
      expiresAt: link.expiresAt,
      paidAt: link.paidAt,
      transactionId: link.transactionId,
      qrPayload: link.qrPayload,
      svg,
      merchantName,
      createdAt: link.createdAt,
    };
  }
}
