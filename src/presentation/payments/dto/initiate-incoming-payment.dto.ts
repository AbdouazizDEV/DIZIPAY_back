import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';

/**
 * Initiation d'un paiement entrant avec choix explicite du fournisseur (PSPI | Wave).
 * Le payeur fournit un identifiant (téléphone, alias ou QR).
 */
export class InitiateIncomingPaymentDto {
  @ApiProperty({
    enum: PaymentProviderType,
    description: 'Mode de paiement choisi par le payeur',
    example: PaymentProviderType.PSPI,
  })
  @IsEnum(PaymentProviderType)
  paymentProvider!: PaymentProviderType;

  @ApiProperty({
    description: 'Compte créditeur (compte PI-SPI marchand)',
    example: '10188672388920614979',
  })
  @IsString()
  @MinLength(5)
  creditAccount!: string;

  @ApiProperty({ description: 'Montant en centimes XOF', example: 5000 })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'XOF', default: 'XOF' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({
    description: 'Référence externe unique (idéalement UUID transaction)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @MinLength(8)
  reference!: string;

  @ApiPropertyOptional({ example: 'Paiement boutique' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description: 'Type d’alias payeur',
    enum: ['PHONE', 'QR_CODE', 'PAYMENT_ADDRESS'],
    example: 'PHONE',
  })
  @IsOptional()
  @IsString()
  aliasType?: string;

  @ApiPropertyOptional({
    description: 'Valeur alias (téléphone, UUID, payload QR…)',
    example: '+221771234567',
  })
  @ValidateIf((o: InitiateIncomingPaymentDto) => !o.qrCode)
  @IsString()
  @MinLength(5)
  aliasValue?: string;

  @ApiPropertyOptional({
    description: 'Contenu QR brut (alternative à aliasType/aliasValue)',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  qrCode?: string;

  @ApiPropertyOptional({
    description: 'Libellé compte pour notification trésorier',
  })
  @IsOptional()
  @IsString()
  creditAccountLabel?: string;
}
