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
import { PayoutAccountType } from '@/domain/payments/enums/payout-account-type.enum';

/**
 * Virement sortant — bénéficiaire mobile money OU compte bancaire (discriminant `accountType`).
 */
export class InitiatePayoutDto {
  @ApiProperty({
    enum: PayoutAccountType,
    description: 'Type de compte destinataire',
    example: PayoutAccountType.MOBILE_MONEY,
  })
  @IsEnum(PayoutAccountType)
  accountType!: PayoutAccountType;

  @ApiProperty({
    description: 'Compte débiteur (plateforme / marchand PI-SPI)',
    example: '10188672388920614979',
  })
  @IsString()
  @MinLength(5)
  debitAccount!: string;

  @ApiProperty({ description: 'Montant en centimes', example: 25000 })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'XOF', default: 'XOF' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({ description: 'Référence externe unique' })
  @IsString()
  @MinLength(8)
  reference!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  // --- MOBILE_MONEY ---
  @ApiPropertyOptional({
    description: 'Identifiant compte PI-SPI (si MOBILE_MONEY)',
  })
  @ValidateIf(
    (o: InitiatePayoutDto) => o.accountType === PayoutAccountType.MOBILE_MONEY,
  )
  @IsString()
  @MinLength(10)
  pispiAccountId?: string;

  @ApiPropertyOptional({ description: 'Téléphone mobile money (optionnel)' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  // --- BANK_ACCOUNT ---
  @ApiPropertyOptional({ description: 'IBAN/RIB (si BANK_ACCOUNT)' })
  @ValidateIf(
    (o: InitiatePayoutDto) => o.accountType === PayoutAccountType.BANK_ACCOUNT,
  )
  @IsString()
  @MinLength(15)
  iban?: string;

  @ApiPropertyOptional({ description: 'BIC/SWIFT (optionnel)' })
  @IsOptional()
  @IsString()
  bic?: string;

  @ApiPropertyOptional({ description: 'Code pays ISO (ex. SN, FR)' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @ApiPropertyOptional({ description: 'Nom de la banque' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ description: 'Nom du titulaire' })
  @IsString()
  @MinLength(2)
  holderName!: string;
}
