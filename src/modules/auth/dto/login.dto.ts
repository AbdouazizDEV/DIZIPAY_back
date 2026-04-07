import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'merchant@dizipay.local',
    description: 'Compte seed après `npx prisma db seed`',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'DizipayDev1!',
    description: 'Mot de passe défini dans prisma/seed.ts',
    format: 'password',
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
