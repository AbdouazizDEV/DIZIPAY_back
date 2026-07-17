import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentLinkStatus, TransactionStatus } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { mapPispiStatutToTransactionStatus } from '@/modules/payments/pispi/pispi-status.mapper';
import { PispiWebhookDto } from './dto/pispi-webhook.dto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Met à jour une transaction (ex. paiement après scan du QR marchand côté client).
   * Recherche par `reference_externe` (= id interne) ou `id_paiement` PI-SPI.
   */
  async handlePispiWebhook(dto: PispiWebhookDto) {
    const referenceExterne = dto.reference_externe?.trim();
    const idPaiement = dto.id_paiement?.trim();
    const statutRaw = dto.statut ?? dto.status;
    const nextStatus = mapPispiStatutToTransactionStatus(statutRaw);

    if (!referenceExterne && !idPaiement) {
      throw new BadRequestException(
        'reference_externe ou id_paiement requis pour rattacher la notification',
      );
    }

    const whereOr: { id?: string; pispiPaymentId?: string }[] = [];
    if (referenceExterne && UUID_RE.test(referenceExterne)) {
      whereOr.push({ id: referenceExterne });
    }
    if (idPaiement) {
      whereOr.push({ pispiPaymentId: idPaiement });
    }

    if (whereOr.length === 0) {
      throw new BadRequestException('Référence externe invalide (UUID attendu)');
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: { OR: whereOr },
    });

    if (!transaction) {
      this.logger.warn(
        `Webhook PI-SPI : aucune transaction pour ref=${referenceExterne} id_paiement=${idPaiement}`,
      );
      throw new NotFoundException('Transaction inconnue');
    }

    const now = new Date();
    const updated = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: nextStatus,
        ...(idPaiement ? { pispiPaymentId: idPaiement } : {}),
        ...(dto.reference_pispi
          ? { pispiTransactionRef: dto.reference_pispi }
          : {}),
        ...(nextStatus === TransactionStatus.SUCCESS
          ? {
              confirmedAt: now,
              failedAt: null,
              ...(!transaction.initiatedAt ? { initiatedAt: now } : {}),
            }
          : nextStatus === TransactionStatus.FAILED
            ? {
                failedAt: now,
                confirmedAt: null,
              }
            : {
                confirmedAt: null,
                failedAt: null,
                ...(!transaction.initiatedAt ? { initiatedAt: now } : {}),
              }),
      },
    });

    await this.prisma.pISPILog.create({
      data: {
        endpoint: '/webhooks/pispi',
        method: 'POST',
        requestPayload: { ...dto } as object,
        responsePayload: {
          transactionId: updated.id,
          status: updated.status,
        } as object,
        statusCode: 200,
        transactionId: updated.id,
      },
    });

    this.logger.log(
      `Webhook PI-SPI appliqué: tx=${updated.id} → ${updated.status}`,
    );

    if (updated.status === TransactionStatus.SUCCESS) {
      await this.prisma.paymentLink.updateMany({
        where: {
          transactionId: updated.id,
          status: { not: PaymentLinkStatus.PAID },
        },
        data: {
          status: PaymentLinkStatus.PAID,
          paidAt: now,
        },
      });
    }

    return {
      ok: true,
      transactionId: updated.id,
      status: updated.status,
    };
  }
}
