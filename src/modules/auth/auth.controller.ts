import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Connexion marchand / admin (JWT)',
    description:
      'Étape 1 du test Swagger : obtenir `access_token`, puis **Authorize** (icône cadenas) avec la valeur `Bearer <token>`. ' +
      'Compte démo après seed : `merchant@dizipay.local` / mot de passe dans `prisma/seed.ts`.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'JWT émis',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Identifiants incorrects ou profil marchand incomplet',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
