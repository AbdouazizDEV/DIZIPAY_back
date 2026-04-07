import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { createHash } from 'node:crypto';
import { firstValueFrom } from 'rxjs';
import { CacheService } from '@/cache/cache.service';
import { PISPI_HTTP_PATHS } from '@/modules/payments/pispi/pispi-endpoints.reference';

export interface ResolveAliasRequest {
  aliasType: 'PHONE' | 'QR_CODE' | 'PAYMENT_ADDRESS';
  aliasValue: string;
}

export interface AliasInfo {
  accountId: string;
  accountName: string;
  institution: string;
  country: string;
  available: boolean;
}

export interface InitiatePaymentRequest {
  debitAccount: string;
  creditAccount: string;
  amount: number;
  currency: string;
  reference: string;
  description?: string;
}

export type PispiPaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface PaymentResponse {
  id: string;
  status: PispiPaymentStatus;
  reference: string;
  pispiReference?: string;
}

@Injectable()
export class PISPIService {
  private readonly logger = new Logger(PISPIService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly institutionId: string;
  private readonly tokenUrl: string;
  private readonly apiKey?: string;

  constructor(
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
    private readonly cacheService: CacheService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('PISPI_BASE_URL');
    this.clientId = this.config.getOrThrow<string>('PISPI_CLIENT_ID');
    this.clientSecret = this.config.getOrThrow<string>('PISPI_CLIENT_SECRET');
    this.institutionId = this.config.getOrThrow<string>('PISPI_INSTITUTION_ID');
    this.tokenUrl = this.config.getOrThrow<string>('PISPI_TOKEN_URL');
    this.apiKey = this.config.get<string>('PISPI_API_KEY') || undefined;
  }

  private businessHeaders(
    token: string,
    contentTypeJson = false,
  ): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'X-Institution-Id': this.institutionId,
    };
    if (contentTypeJson) {
      h['Content-Type'] = 'application/json';
    }
    if (this.apiKey) {
      h['x-api-key'] = this.apiKey;
    }
    return h;
  }

  async resolveAlias(request: ResolveAliasRequest): Promise<AliasInfo> {
    this.logger.log(
      `Resolving alias: ${request.aliasType} — ${request.aliasValue}`,
    );

    try {
      const token = await this.getAccessToken();

      const response = await firstValueFrom(
        this.httpService.post<{
          compte_id: string;
          nom_titulaire: string;
          code_institution: string;
          pays: string;
          disponible: boolean;
        }>(
          `${this.baseUrl}${PISPI_HTTP_PATHS.resolveAlias}`,
          {
            type_alias: this.mapAliasType(request.aliasType),
            valeur_alias: request.aliasValue,
          },
          {
            headers: this.businessHeaders(token, true),
          },
        ),
      );

      return {
        accountId: response.data.compte_id,
        accountName: response.data.nom_titulaire,
        institution: response.data.code_institution,
        country: response.data.pays,
        available: response.data.disponible,
      };
    } catch (error) {
      const msg = this.formatAxiosError(error);
      this.logger.error(`Failed to resolve alias: ${msg}`);
      throw new HttpException(
        'Impossible de résoudre cet alias PI-SPI',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async initiatePayment(
    request: InitiatePaymentRequest,
  ): Promise<PaymentResponse> {
    this.logger.log(`Initiating PI-SPI payment: ${request.reference}`);

    try {
      const token = await this.getAccessToken();
      const idempotencyKey = this.generateIdempotencyKey(request.reference);

      const response = await firstValueFrom(
        this.httpService.post<{
          id_paiement: string;
          statut: string;
          reference_pispi?: string;
        }>(
          `${this.baseUrl}${PISPI_HTTP_PATHS.initiatePayment}`,
          {
            compte_debiteur: request.debitAccount,
            compte_crediteur: request.creditAccount,
            montant: request.amount,
            devise: request.currency,
            reference_externe: request.reference,
            motif: request.description ?? 'Paiement marchand DiziPay',
            mode_reglement: 'INSTANT',
          },
          {
            headers: {
              ...this.businessHeaders(token, true),
              'X-Idempotency-Key': idempotencyKey,
            },
          },
        ),
      );

      return {
        id: response.data.id_paiement,
        status: this.mapPaymentStatus(response.data.statut),
        reference: request.reference,
        pispiReference: response.data.reference_pispi,
      };
    } catch (error) {
      const axiosErr = error as AxiosError;
      if (axiosErr.response?.status === 409) {
        throw new HttpException(
          'Paiement déjà en cours de traitement',
          HttpStatus.CONFLICT,
        );
      }
      const msg = this.formatAxiosError(error);
      this.logger.error(`Failed to initiate payment: ${msg}`);
      throw new HttpException(
        "Échec de l'initiation du paiement PI-SPI",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPaymentStatus(pispiPaymentId: string): Promise<PaymentResponse> {
    this.logger.log(`Checking PI-SPI payment status: ${pispiPaymentId}`);

    try {
      const token = await this.getAccessToken();

      const response = await firstValueFrom(
        this.httpService.get<{
          id_paiement: string;
          statut: string;
          reference_externe: string;
          reference_pispi?: string;
        }>(
          `${this.baseUrl}${PISPI_HTTP_PATHS.paymentStatus(pispiPaymentId)}`,
          {
            headers: this.businessHeaders(token),
          },
        ),
      );

      return {
        id: response.data.id_paiement,
        status: this.mapPaymentStatus(response.data.statut),
        reference: response.data.reference_externe,
        pispiReference: response.data.reference_pispi,
      };
    } catch (error) {
      const msg = this.formatAxiosError(error);
      this.logger.error(`Failed to get payment status: ${msg}`);
      throw new HttpException(
        'Impossible de vérifier le statut du paiement',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getAccessToken(): Promise<string> {
    const cacheKey = 'pispi:access_token';

    const cachedToken = await this.cacheService.get(cacheKey);
    if (cachedToken) {
      return cachedToken;
    }

    this.logger.log('Fetching new PI-SPI access token');

    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          access_token: string;
          expires_in?: number;
        }>(
          this.tokenUrl,
          new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.clientId,
            client_secret: this.clientSecret,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      const token = response.data.access_token;
      const expiresIn = response.data.expires_in ?? 300;
      const ttl = Math.max(1, Math.floor(expiresIn - 30));
      await this.cacheService.set(cacheKey, token, ttl);

      return token;
    } catch (error) {
      const msg = this.formatAxiosError(error);
      this.logger.error(`Failed to get PI-SPI access token: ${msg}`);
      throw new HttpException(
        "Erreur d'authentification PI-SPI",
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private generateIdempotencyKey(reference: string): string {
    return createHash('sha256')
      .update(`${reference}-${Date.now()}`)
      .digest('hex')
      .substring(0, 32);
  }

  private mapAliasType(type: string): string {
    const mapping: Record<string, string> = {
      PHONE: 'TELEPHONE',
      QR_CODE: 'QR',
      PAYMENT_ADDRESS: 'ADRESSE_PAIEMENT',
    };
    return mapping[type] ?? type;
  }

  private mapPaymentStatus(pispiStatus: string): PispiPaymentStatus {
    const mapping: Record<string, PispiPaymentStatus> = {
      EN_ATTENTE: 'PENDING',
      EN_COURS: 'PENDING',
      SUCCES: 'SUCCESS',
      REUSSI: 'SUCCESS',
      ECHEC: 'FAILED',
      REJETE: 'FAILED',
      ANNULE: 'FAILED',
    };
    return mapping[pispiStatus] ?? 'PENDING';
  }

  private formatAxiosError(error: unknown): string {
    if (error && typeof error === 'object' && 'isAxiosError' in error) {
      const e = error as AxiosError<{ message?: string }>;
      return (
        e.response?.data?.message ??
        e.message ??
        JSON.stringify(e.response?.data)
      );
    }
    return error instanceof Error ? error.message : String(error);
  }
}
