import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Payload notification PI-SPI (champs usuels — le simulateur peut en envoyer d’autres).
 */
export class PispiWebhookDto {
  @ApiPropertyOptional({
    description: 'Identifiant paiement côté PI-SPI',
    example: 'PISPI-PAY-2026-0001',
  })
  @IsOptional()
  @IsString()
  id_paiement?: string;

  @ApiPropertyOptional({
    description: 'Référence externe DiziPay (= id Transaction UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  reference_externe?: string;

  @ApiPropertyOptional({ example: 'REF-PI-SPI-ABC' })
  @IsOptional()
  @IsString()
  reference_pispi?: string;

  @ApiPropertyOptional({
    description: 'Statut métier (FR) — ex. SUCCES, ECHEC, EN_COURS',
    example: 'SUCCES',
  })
  @IsOptional()
  @IsString()
  statut?: string;

  @ApiPropertyOptional({ example: 'SUCCESS' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'PAIEMENT_CONFIRME' })
  @IsOptional()
  @IsString()
  type_evenement?: string;
}
