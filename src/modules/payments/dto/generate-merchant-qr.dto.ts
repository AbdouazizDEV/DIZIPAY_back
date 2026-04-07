import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class GenerateMerchantQrDto {
  @ApiPropertyOptional({
    description:
      'Montant en centimes XOF (si renseigné → QR DYNAMIQUE avec montant figé)',
    example: 5775,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Libellé de référence EMV (max 25 caractères)',
    maxLength: 25,
    example: 'CAISSE_01',
  })
  @IsOptional()
  @IsString()
  @MaxLength(25)
  referenceLabel?: string;

  @ApiPropertyOptional({
    enum: ['STATIC', 'DYNAMIC'],
    description:
      'STATIC = QR réutilisable sans montant ; DYNAMIC = montant (et souvent référence) intégrés',
  })
  @IsOptional()
  @IsIn(['STATIC', 'DYNAMIC'])
  qrType?: 'STATIC' | 'DYNAMIC';

  @ApiPropertyOptional({
    description: 'Inclure le rendu SVG du QR (pour affichage direct)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeSvg?: boolean;

  @ApiPropertyOptional({ description: 'Taille du QR SVG en pixels', default: 280 })
  @IsOptional()
  @IsInt()
  @Min(120)
  svgSize?: number;
}
