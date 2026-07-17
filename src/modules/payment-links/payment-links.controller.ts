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
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { PayPaymentLinkDto } from './dto/pay-payment-link.dto';
import { PaymentLinksService } from './payment-links.service';

@ApiTags('Payment Links')
@Controller('payment-links')
@UseGuards(JwtAuthGuard)
export class PaymentLinksController {
  constructor(private readonly paymentLinksService: PaymentLinksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiUnauthorizedResponse({ description: 'JWT requis' })
  @ApiOperation({
    summary: 'Créer un lien de paiement partageable',
    description:
      'Le marchand génère un lien (+ QR PI-SPI dynamique). À partager aux clients (WhatsApp, SMS, etc.).',
  })
  @ApiBody({ type: CreatePaymentLinkDto })
  @ApiOkResponse({ description: 'Lien créé (url, token, qrPayload, svg)' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePaymentLinkDto,
  ) {
    if (!user.merchantId) {
      throw new ForbiddenException('JWT marchand invalide: merchantId manquant');
    }
    return this.paymentLinksService.create(user.merchantId, dto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lister mes liens de paiement' })
  async list(@CurrentUser() user: AuthUser) {
    if (!user.merchantId) {
      throw new ForbiddenException('JWT marchand invalide: merchantId manquant');
    }
    return this.paymentLinksService.list(user.merchantId);
  }

  @Post(':token/cancel')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Annuler un lien actif' })
  @ApiParam({ name: 'token', description: 'Token public du lien' })
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('token') token: string,
  ) {
    if (!user.merchantId) {
      throw new ForbiddenException('JWT marchand invalide: merchantId manquant');
    }
    return this.paymentLinksService.cancel(user.merchantId, token);
  }

  @Public()
  @Get(':token')
  @ApiOperation({
    summary: 'Consulter un lien (page publique client)',
    description:
      'Sans JWT. Retourne montant, marchand, statut, QR EMV à afficher pour paiement wallet.',
  })
  @ApiParam({ name: 'token' })
  async getPublic(@Param('token') token: string) {
    return this.paymentLinksService.getPublicByToken(token);
  }

  @Public()
  @Get(':token/status')
  @ApiOperation({
    summary: 'Statut public du lien (polling client / marchand)',
  })
  @ApiParam({ name: 'token' })
  async getStatus(@Param('token') token: string) {
    return this.paymentLinksService.getStatusByToken(token);
  }

  @Public()
  @Post(':token/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Payer via le lien (wallet client)',
    description:
      'Sans JWT. Alternative au scan du QR marchand : le client fournit son QR wallet, téléphone ou alias ; initiation PI-SPI.',
  })
  @ApiParam({ name: 'token' })
  @ApiBody({ type: PayPaymentLinkDto })
  async pay(
    @Param('token') token: string,
    @Body() dto: PayPaymentLinkDto,
  ) {
    return this.paymentLinksService.pay(token, dto);
  }
}
