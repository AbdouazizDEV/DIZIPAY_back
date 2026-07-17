import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';

export class ScanQRDto {
  @ApiPropertyOptional({
    enum: PaymentProviderType,
    description:
      'Fournisseur d’initiation (défaut: PSPI). Wave → 503 explicite (MVP).',
    example: PaymentProviderType.PSPI,
    default: PaymentProviderType.PSPI,
  })
  @IsOptional()
  @IsEnum(PaymentProviderType)
  paymentProvider?: PaymentProviderType;

  @ApiProperty({
    description:
      'Chaîne brute lue sur le QR (EMVCo, lien Wave, texte téléphone, etc.)',
    example:
      '00020101021226370009WAVE_SN010811234567890211+221771234567520400005303952540557756.00630489',
  })
  @IsString()
  @MinLength(1)
  qrCode!: string;

  @ApiProperty({
    description: 'Montant en centimes XOF (ex: 5775 = 57,75 FCFA)',
    example: 5775,
  })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'Achat boutique' })
  @IsOptional()
  @IsString()
  description?: string;
}
