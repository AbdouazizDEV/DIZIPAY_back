import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';

/**
 * Paiement initié par le client via le lien :
 * soit un QR wallet (Wave / OM / Free / PI-SPI), soit un téléphone / alias.
 * Le client choisit son mode via {@link paymentProvider} avant initiation.
 */
export class PayPaymentLinkDto {
  @ApiPropertyOptional({
    enum: PaymentProviderType,
    description:
      'Mode de paiement choisi par le payeur (défaut: PSPI). Wave → 503 explicite (MVP).',
    example: PaymentProviderType.PSPI,
    default: PaymentProviderType.PSPI,
  })
  @IsOptional()
  @IsEnum(PaymentProviderType)
  paymentProvider?: PaymentProviderType;

  @ApiPropertyOptional({
    description: 'Contenu QR du wallet client (EMV ou payload PSP)',
    example: '000201010212...',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  qrCode?: string;

  @ApiPropertyOptional({
    description: 'Téléphone client (alias PHONE PI-SPI), ex. +22177...',
    example: '+221771234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  clientPhone?: string;

  @ApiPropertyOptional({
    description: 'Alias PI-SPI client (UUID) si connu',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientAlias?: string;
}
