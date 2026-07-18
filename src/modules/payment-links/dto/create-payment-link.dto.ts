import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePaymentLinkDto {
  @ApiProperty({
    description:
      'Montant en centimes XOF (ex. 150000 = 1 500 F CFA). Affiché /150 sur le front ; le QR EMV reçoit les francs.',
    example: 150000,
  })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({
    description: 'Libellé visible par le client',
    example: 'Consultation pharmacie',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({
    description: 'Durée de validité en minutes (défaut 1440 = 24 h, max 10080 = 7 j)',
    example: 1440,
    default: 1440,
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  expiresInMinutes?: number;

  @ApiPropertyOptional({
    description: 'Inclure le SVG du QR PI-SPI dans la réponse',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeSvg?: boolean;
}
