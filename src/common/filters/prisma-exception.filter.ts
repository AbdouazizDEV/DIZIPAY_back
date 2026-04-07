import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

type PrismaErr =
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientUnknownRequestError
  | Prisma.PrismaClientInitializationError;

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientInitializationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: PrismaErr, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ url?: string }>();
    const isDev = process.env.NODE_ENV !== 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erreur base de données';
    let prismaCode: string | undefined;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      prismaCode = exception.code;
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Contrainte d’unicité violée';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Enregistrement introuvable';
      } else if (exception.code === 'P2022') {
        message = isDev
          ? exception.message
          : 'Schéma PostgreSQL désynchronisé — exécutez `npx prisma db push` ou `migrate dev` avec un utilisateur ayant les droits DDL.';
      } else if (isDev) {
        message = exception.message;
      }
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      prismaCode = exception.errorCode;
      message = isDev
        ? exception.message
        : 'Impossible de se connecter à la base de données';
    } else {
      prismaCode = 'UNKNOWN';
      message = isDev
        ? exception.message
        : 'Erreur base de données';
    }

    this.logger.error(
      `[${prismaCode ?? 'PRISMA'}] ${exception.message}`,
      exception.stack,
    );

    response.status(status).json({
      statusCode: status,
      message,
      prismaCode: prismaCode ?? 'UNKNOWN',
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(isDev
        ? {
            detail: exception.message,
            hint:
              'Vérifiez DATABASE_URL, `npx prisma migrate dev` ou `db push`, et les droits PostgreSQL (voir scripts/grant-databeez-public.sql).',
          }
        : {}),
    });
  }
}
