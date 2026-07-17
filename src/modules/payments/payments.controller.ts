import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { GenerateMerchantQrDto } from './dto/generate-merchant-qr.dto';
import { ScanQRDto } from './dto/scan-qr.dto';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@ApiUnauthorizedResponse({
  description: 'JWT absent, expiré ou invalide — refaire POST /auth/login',
})
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('merchant-presented-qr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Générer le QR PI-SPI (EMVCo) présenté par le marchand — interopérable tous opérateurs',
    description:
      'Utilise le SDK officiel @pi-spi/qrcode (cf. https://developer.pispi.bceao.int/guides/qr-generation ). ' +
      'Le client scanne avec Wave, Orange Money, Free Money ou toute app PI-SPI ; il valide dans son application. ' +
      'QR STATIC sans montant ou DYNAMIC avec montant en centimes. ' +
      'Requiert merchant.pispiAlias = UUID v4 côté base.',
  })
  @ApiBody({ type: GenerateMerchantQrDto })
  @ApiOkResponse({
    description:
      'Contient `payload` (string EMV à encoder en QR côté app) et optionnellement `svg`',
  })
  @ApiForbiddenResponse({ description: 'Token sans merchantId' })
  async merchantPresentedQr(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateMerchantQrDto,
  ) {
    if (!user.merchantId) {
      throw new ForbiddenException('JWT marchand invalide: merchantId manquant');
    }
    return this.paymentsService.generateMerchantPresentedQr(
      user.merchantId,
      dto,
    );
  }

  @Post('scan-and-pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Scanner le QR du client (ou alias) — le marchand initie le débit',
    description:
      'Parcours alternatif : le client montre son QR ; le marchand scanne. ' +
      'Champ optionnel `paymentProvider` (PSPI | WAVE). Wave → 503 explicite (MVP).',
  })
  @ApiBody({ type: ScanQRDto })
  @ApiOkResponse({
    description: 'Transaction créée / mise à jour (statut, pispiPaymentId)',
  })
  @ApiForbiddenResponse({ description: 'Token sans merchantId' })
  async scanAndPay(
    @CurrentUser() user: AuthUser,
    @Body() dto: ScanQRDto,
  ) {
    if (!user.merchantId) {
      throw new ForbiddenException('JWT marchand invalide: merchantId manquant');
    }
    return this.paymentsService.scanAndPay(user.merchantId, dto);
  }

  @Get('status/:transactionId')
  @ApiOperation({
    summary: "Vérifier le statut d'une transaction",
    description:
      'Polling côté marchand ; rafraîchit aussi depuis PI-SPI si la transaction est en cours de traitement.',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'UUID retourné par merchant-presented-qr ou scan-and-pay',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ description: 'transactionId, status, amount' })
  @ApiNotFoundResponse({ description: 'Transaction introuvable pour ce marchand' })
  @ApiForbiddenResponse({ description: 'Token sans merchantId' })
  async getStatus(
    @CurrentUser() user: AuthUser,
    @Param('transactionId') transactionId: string,
  ) {
    if (!user.merchantId) {
      throw new ForbiddenException('JWT marchand invalide: merchantId manquant');
    }
    return this.paymentsService.getTransactionStatus(
      user.merchantId,
      transactionId,
    );
  }

  @Post('cancel/:transactionId')
  @ApiOperation({
    summary: 'Annuler une transaction en attente',
    description: 'Uniquement si statut PENDING ou PROCESSING',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'UUID de la transaction',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ description: 'transactionId, status=CANCELLED' })
  @ApiNotFoundResponse({ description: 'Transaction introuvable ou déjà terminée' })
  @ApiForbiddenResponse({ description: 'Token sans merchantId' })
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('transactionId') transactionId: string,
  ) {
    if (!user.merchantId) {
      throw new ForbiddenException('JWT marchand invalide: merchantId manquant');
    }
    return this.paymentsService.cancelTransaction(
      user.merchantId,
      transactionId,
    );
  }
}
