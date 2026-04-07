import { ApiProperty } from '@nestjs/swagger';

export class WebhookAckDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ format: 'uuid' })
  transactionId!: string;

  @ApiProperty({
    example: 'SUCCESS',
    description: 'Statut transaction après mise à jour',
  })
  status!: string;
}
