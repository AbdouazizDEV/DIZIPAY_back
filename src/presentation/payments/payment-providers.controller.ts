import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';
import { InitiateIncomingPaymentUseCase } from '@/application/payments/use-cases/initiate-incoming-payment.use-case';
import { GetPaymentStatusUseCase } from '@/application/payments/use-cases/get-payment-status.use-case';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { InitiateIncomingPaymentDto } from '@/presentation/payments/dto/initiate-incoming-payment.dto';
import { QRDecoderService } from '@/modules/payments/qr/qr-decoder.service';

/**
 * Endpoints d'orchestration paiement — choix du provider par le payeur.
 * Complète (sans remplacer) les routes historiques `/payments/*` et `/payment-links/*`.
 */
@ApiTags('Payment Providers')
@Controller('payment-providers')
@UseGuards(JwtAuthGuard)
export class PaymentProvidersController {
  constructor(
    private readonly initiatePayment: InitiateIncomingPaymentUseCase,
    private readonly getPaymentStatus: GetPaymentStatusUseCase,
    private readonly qrDecoder: QRDecoderService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Lister les modes de paiement disponibles',
    description:
      'Le front affiche ces options avant redirection / initiation. Wave est listé mais indisponible (MVP).',
  })
  @ApiOkResponse({
    description: 'Liste des fournisseurs et leur disponibilité',
  })
  listProviders() {
    return {
      providers: [
        {
          type: PaymentProviderType.PSPI,
          label: 'PI-SPI (interopérable UEMOA)',
          available: true,
        },
        {
          type: PaymentProviderType.WAVE,
          label: 'Wave',
          available: false,
          reason: "Le fournisseur Wave n'est pas encore disponible.",
        },
      ],
    };
  }

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiUnauthorizedResponse({ description: 'JWT requis' })
  @ApiOperation({
    summary: 'Initier un paiement avec choix du fournisseur',
    description:
      'Le payeur (ou le marchand pour son compte) choisit PSPI ou Wave. ' +
      'Wave renvoie 503 explicite. Émet une notification trésorier si succès immédiat.',
  })
  @ApiBody({ type: InitiateIncomingPaymentDto })
  async initiate(@Body() dto: InitiateIncomingPaymentDto) {
    if (!dto.qrCode && !dto.aliasValue?.trim()) {
      throw new BadRequestException(
        'Fournissez qrCode ou aliasValue (avec aliasType) pour identifier le payeur.',
      );
    }
    const payer = this.resolvePayer(dto);
    return this.initiatePayment.execute({
      providerType: dto.paymentProvider,
      command: {
        payer,
        creditAccount: dto.creditAccount,
        amount: dto.amount,
        currency: dto.currency ?? 'XOF',
        reference: dto.reference,
        description: dto.description,
      },
      creditAccountLabel: dto.creditAccountLabel,
    });
  }

  @Get('status/:providerPaymentId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Statut d’un paiement auprès du fournisseur' })
  @ApiParam({ name: 'providerPaymentId' })
  @ApiQuery({
    name: 'provider',
    enum: PaymentProviderType,
    required: true,
  })
  async status(
    @Param('providerPaymentId') providerPaymentId: string,
    @Query('provider') provider: PaymentProviderType,
  ) {
    return this.getPaymentStatus.execute({
      providerType: provider ?? PaymentProviderType.PSPI,
      providerPaymentId,
    });
  }

  private resolvePayer(dto: InitiateIncomingPaymentDto) {
    if (dto.qrCode) {
      const qr = this.qrDecoder.decodeQR(dto.qrCode);
      if (qr.type === 'PISPI' && qr.alias) {
        return { aliasType: 'QR_CODE', aliasValue: qr.alias };
      }
      if (qr.phone) {
        return { aliasType: 'PHONE', aliasValue: qr.phone };
      }
      return { aliasType: 'QR_CODE', aliasValue: dto.qrCode };
    }
    return {
      aliasType: dto.aliasType ?? 'PHONE',
      aliasValue: dto.aliasValue!,
    };
  }
}
