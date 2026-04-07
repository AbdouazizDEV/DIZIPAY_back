import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT à passer en Authorization: Bearer …',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIuLi4ifQ.signature',
  })
  access_token!: string;

  @ApiProperty({ example: 'Bearer', enum: ['Bearer'] })
  token_type!: 'Bearer';

  @ApiPropertyOptional({
    description: 'Présent si le compte est un marchand',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  merchantId?: string;
}
