import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  PaymentOperationNotSupportedError,
  PaymentProviderUnavailableError,
  PayoutAccountValidationError,
} from '@/domain/payments/errors/domain.errors';

/**
 * Mappe les erreurs domaine paiement vers des réponses HTTP.
 * Les use cases restent agnostiques du protocole HTTP.
 */
@Catch(
  PaymentProviderUnavailableError,
  PaymentOperationNotSupportedError,
  PayoutAccountValidationError,
)
export class DomainPaymentExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainPaymentExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ url?: string }>();

    let status = HttpStatus.BAD_REQUEST;
    if (exception instanceof PaymentProviderUnavailableError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
    } else if (exception instanceof PaymentOperationNotSupportedError) {
      status = HttpStatus.NOT_IMPLEMENTED;
    }

    this.logger.warn(`${request.url} — ${status} — ${exception.message}`);

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error: exception.name,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
