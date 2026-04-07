import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { merchant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.role === UserRole.MERCHANT && !user.merchant) {
      throw new UnauthorizedException('Profil marchand incomplet');
    }

    const merchantId = user.merchant?.id;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      merchantId,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      token_type: 'Bearer' as const,
      merchantId,
    };
  }
}
