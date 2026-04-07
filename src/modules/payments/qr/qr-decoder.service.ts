import { BadRequestException, Injectable, Logger } from '@nestjs/common';

export interface QRData {
  type: 'WAVE' | 'ORANGE_MONEY' | 'FREE_MONEY' | 'PISPI' | 'UNKNOWN';
  phone?: string;
  accountId?: string;
  merchantCode?: string;
  alias?: string;
  raw: string;
}

@Injectable()
export class QRDecoderService {
  private readonly logger = new Logger(QRDecoderService.name);

  decodeQR(qrContent: string): QRData {
    const preview =
      qrContent.length > 50 ? `${qrContent.substring(0, 50)}…` : qrContent;
    this.logger.log(`Decoding QR: ${preview}`);

    if (this.isPISPIFormat(qrContent)) {
      return this.decodePISPI(qrContent);
    }

    if (this.isWaveFormat(qrContent)) {
      return this.decodeWave(qrContent);
    }

    if (this.isOrangeMoneyFormat(qrContent)) {
      return this.decodeOrangeMoney(qrContent);
    }

    if (this.isFreeMoneyFormat(qrContent)) {
      return this.decodeFreeMoney(qrContent);
    }

    if (this.isPhoneNumber(qrContent)) {
      return this.decodePhone(qrContent);
    }

    throw new BadRequestException('Format de QR code non reconnu');
  }

  private isPISPIFormat(content: string): boolean {
    return /^0[01]0[12]/.test(content);
  }

  private decodePISPI(content: string): QRData {
    this.logger.log('Detected PI-SPI format (EMVCo)');

    try {
      const merchantAccountInfo = this.extractEMVCoTag(content, '26');
      const alias = this.extractEMVCoTag(content, '62');

      return {
        type: 'PISPI',
        raw: content,
        accountId: merchantAccountInfo ?? undefined,
        alias: alias ?? undefined,
      };
    } catch {
      throw new BadRequestException('QR PI-SPI invalide');
    }
  }

  private isWaveFormat(content: string): boolean {
    return (
      content.includes('wave.com') ||
      content.includes('pay.wave.com') ||
      content.startsWith('https://w.sn/')
    );
  }

  private decodeWave(content: string): QRData {
    this.logger.log('Detected Wave format');

    try {
      const url = new URL(content);
      const accountId = url.pathname.split('/').pop();
      const merchantCode = url.searchParams.get('m');

      return {
        type: 'WAVE',
        raw: content,
        accountId: accountId || undefined,
        merchantCode: merchantCode || undefined,
      };
    } catch {
      throw new BadRequestException('QR Wave invalide');
    }
  }

  private isOrangeMoneyFormat(content: string): boolean {
    return (
      content.includes('#144') ||
      content.toLowerCase().includes('orange') ||
      content.toLowerCase().includes('orangemoney')
    );
  }

  private decodeOrangeMoney(content: string): QRData {
    this.logger.log('Detected Orange Money format');

    const phoneMatch = content.match(/(\+221|221)?([0-9]{9})/);

    return {
      type: 'ORANGE_MONEY',
      raw: content,
      phone: phoneMatch ? `+221${phoneMatch[2]}` : undefined,
    };
  }

  private isFreeMoneyFormat(content: string): boolean {
    return content.includes('#150') || content.toLowerCase().includes('free');
  }

  private decodeFreeMoney(content: string): QRData {
    this.logger.log('Detected Free Money format');

    const phoneMatch = content.match(/(\+221|221)?([0-9]{9})/);

    return {
      type: 'FREE_MONEY',
      raw: content,
      phone: phoneMatch ? `+221${phoneMatch[2]}` : undefined,
    };
  }

  private isPhoneNumber(content: string): boolean {
    return /^(\+221|221)?[0-9]{9}$/.test(content.replace(/\s/g, ''));
  }

  private decodePhone(content: string): QRData {
    const cleaned = content.replace(/\s/g, '');
    const phone = cleaned.startsWith('+221')
      ? cleaned
      : cleaned.startsWith('221')
        ? `+${cleaned}`
        : `+221${cleaned}`;

    return {
      type: 'UNKNOWN',
      raw: content,
      phone,
    };
  }

  private extractEMVCoTag(content: string, tag: string): string | null {
    const tagIndex = content.indexOf(tag);

    if (tagIndex === -1) {
      return null;
    }

    const lengthStr = content.substring(tagIndex + 2, tagIndex + 4);
    const length = parseInt(lengthStr, 10);

    if (Number.isNaN(length)) {
      return null;
    }

    return content.substring(tagIndex + 4, tagIndex + 4 + length);
  }
}
