import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Paiement initié par le client via le lien :
 * soit un QR wallet (Wave / OM / Free / PI-SPI), soit un téléphone / alias.
 */
export class PayPaymentLinkDto {
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
