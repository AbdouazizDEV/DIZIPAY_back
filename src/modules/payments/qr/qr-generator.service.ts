import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildPayloadString,
  generateQrCodeSvg,
  isValidPispiQrPayload,
} from '@pi-spi/qrcode';
import type { QrPayloadInput } from '@pi-spi/qrcode';

/** Alias paiement PI-SPI = UUID v4 (cf. portail + SDK @pi-spi/qrcode) */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class QRGeneratorService {
  constructor(private readonly config: ConfigService) {}

  getDefaultCountryCode(): string {
    return this.config.get<string>('pispi.countryCode') ?? 'SN';
  }

  assertValidPaymentAlias(alias: string): void {
    if (!UUID_V4.test(alias.trim())) {
      throw new BadRequestException(
        'L’alias PI-SPI (pispiAlias) doit être un UUID v4 — voir le portail développeur PI-SPI / compte marchand.',
      );
    }
  }

  /** Payload EMVCo unique, scannable par tout wallet PI-SPI de la zone. */
  buildPayload(input: QrPayloadInput): string {
    return buildPayloadString(input);
  }

  async toSvg(input: QrPayloadInput, size = 280): Promise<string> {
    return generateQrCodeSvg(input, { size });
  }

  verifyPayload(payload: string) {
    return isValidPispiQrPayload(payload);
  }
}
