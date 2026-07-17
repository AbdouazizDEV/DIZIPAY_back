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
import { Inject } from '@nestjs/common';
import { PayoutAccountType } from '@/domain/payments/enums/payout-account-type.enum';
import { Money } from '@/domain/payments/value-objects/money.vo';
import {
  createBankPayoutAccount,
  createMobileMoneyPayoutAccount,
} from '@/domain/payments/value-objects/payout-account';
import { PayoutProviderPort } from '@/domain/payments/ports/payout-provider.port';
import { PAYOUT_PROVIDER_PORT } from '@/domain/payments/tokens/payment-domain.tokens';
import { InitiatePayoutUseCase } from '@/application/payments/use-cases/initiate-payout.use-case';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { InitiatePayoutDto } from '@/presentation/payments/dto/initiate-payout.dto';

@ApiTags('Payouts')
@ApiBearerAuth('JWT-auth')
@ApiUnauthorizedResponse({ description: 'JWT requis' })
@Controller('payouts')
@UseGuards(JwtAuthGuard)
export class PayoutsController {
  constructor(
    private readonly initiatePayout: InitiatePayoutUseCase,
    @Inject(PAYOUT_PROVIDER_PORT)
    private readonly payoutProvider: PayoutProviderPort,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Initier un virement sortant (mobile money ou bancaire)',
    description:
      'Validation Strategy par type de compte, puis exécution via PSPI. ' +
      'Notification trésorier si succès immédiat.',
  })
  @ApiBody({ type: InitiatePayoutDto })
  @ApiOkResponse({ description: 'Résultat normalisé du virement' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: InitiatePayoutDto,
  ) {
    if (!user.merchantId) {
      throw new ForbiddenException('JWT marchand invalide: merchantId manquant');
    }

    const beneficiary =
      dto.accountType === PayoutAccountType.MOBILE_MONEY
        ? createMobileMoneyPayoutAccount({
            pispiAccountId: dto.pispiAccountId!,
            holderName: dto.holderName,
            phoneNumber: dto.phoneNumber,
          })
        : createBankPayoutAccount({
            iban: dto.iban!,
            holderName: dto.holderName,
            bic: dto.bic,
            bankName: dto.bankName,
            countryCode: dto.countryCode,
          });

    return this.initiatePayout.execute({
      beneficiary,
      debitAccount: dto.debitAccount,
      money: Money.create(dto.amount, dto.currency ?? 'XOF'),
      reference: dto.reference,
      description: dto.description,
    });
  }

  @Get(':providerPayoutId/status')
  @ApiOperation({ summary: 'Statut d’un virement côté fournisseur' })
  @ApiParam({ name: 'providerPayoutId' })
  async status(@Param('providerPayoutId') providerPayoutId: string) {
    return this.payoutProvider.getPayoutStatus(providerPayoutId);
  }
}
