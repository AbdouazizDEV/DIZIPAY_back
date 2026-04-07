import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

type ReqWithRaw = Request & { rawBody?: Buffer };

@Injectable()
export class PispiWebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(PispiWebhookSignatureGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('PISPI_WEBHOOK_SECRET');
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
    const headerName = (
      this.config.get<string>('pispi.webhookSignatureHeader') ??
      'x-pispi-signature'
    ).toLowerCase();

    const placeholder =
      !secret ||
      secret === 'your_webhook_secret' ||
      secret === 'your_webhook_secret_change_me';

    if (placeholder) {
      if (nodeEnv === 'production') {
        throw new ForbiddenException(
          'PISPI_WEBHOOK_SECRET doit être configuré en production',
        );
      }
      this.logger.warn(
        'Webhook PI-SPI : signature non vérifiée (secret absent ou placeholder)',
      );
      return true;
    }

    const req = context.switchToHttp().getRequest<ReqWithRaw>();
    const raw = req.rawBody;
    if (!raw || raw.length === 0) {
      throw new UnauthorizedException(
        'Corps brut manquant — activer rawBody sur NestFactory (voir main.ts)',
      );
    }

    const sigRaw = req.headers[headerName];
    const signature = Array.isArray(sigRaw) ? sigRaw[0] : sigRaw;
    if (!signature || typeof signature !== 'string') {
      throw new UnauthorizedException(
        `En-tête de signature manquant (${headerName})`,
      );
    }

    const providedHex = signature.replace(/^sha256=/i, '').trim();
    const expectedHex = createHmac('sha256', secret).update(raw).digest('hex');

    let ok = false;
    try {
      const a = Buffer.from(expectedHex, 'hex');
      const b = Buffer.from(providedHex, 'hex');
      ok = a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
    } catch {
      ok = false;
    }

    if (!ok) {
      this.logger.warn('Webhook PI-SPI : signature HMAC invalide');
      throw new UnauthorizedException('Signature webhook invalide');
    }

    return true;
  }
}
