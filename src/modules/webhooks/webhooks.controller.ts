import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PispiWebhookDto } from './dto/pispi-webhook.dto';
import { WebhookAckDto } from './dto/webhook-ack.dto';
import { PispiWebhookSignatureGuard } from './guards/pispi-webhook-signature.guard';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@SkipThrottle()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('pispi')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PispiWebhookSignatureGuard)
  @ApiOperation({
    summary: 'Notification PI-SPI (statut de paiement)',
    description: [
      'Callback **sans JWT**. Utilisé quand PI-SPI notifie un changement (ex. paiement confirmé après scan du QR marchand).',
      '',
      '**Signature** : en-tête `x-pispi-signature` = HMAC-SHA256 (digest **hex**, 64 caractères) du **corps brut** JSON, clé = `PISPI_WEBHOOK_SECRET`.',
      'En développement, si le secret n’est pas défini (ou valeur par défaut), la signature est ignorée.',
      '',
      '**Tester dans Swagger** : avec un secret configuré, utilisez un client HTTP externe ou générez la signature avec `openssl` (voir description projet).',
    ].join('\n'),
  })
  @ApiHeader({
    name: 'x-pispi-signature',
    required: false,
    description:
      'HMAC-SHA256 hex du corps brut (obligatoire si PISPI_WEBHOOK_SECRET est défini en prod)',
    example:
      'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
  })
  @ApiBody({ type: PispiWebhookDto })
  @ApiOkResponse({
    description: 'Transaction mise à jour',
    type: WebhookAckDto,
  })
  @ApiBadRequestResponse({
    description: 'reference_externe / id_paiement manquants ou invalides',
  })
  @ApiNotFoundResponse({ description: 'Aucune transaction correspondante' })
  @ApiUnauthorizedResponse({
    description: 'Signature HMAC invalide ou corps brut manquant',
  })
  async pispi(@Body() dto: PispiWebhookDto) {
    return this.webhooksService.handlePispiWebhook(dto);
  }
}
