import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger/swagger-document';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // CORP same-origin (défaut Helmet) bloque la lecture des réponses par le front Vite (autre origine).
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());

  const corsOrigins = (process.env.CORS_ORIGIN?.split(',') ?? [])
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  // Fronts connus (local Vite + déploiement Vercel).
  // L’en-tête Origin du navigateur n’a JAMAIS de slash final.
  const builtinOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'https://dizipay-web.vercel.app',
  ];

  // Autoriser les origines builtin (sauf si CORS_ALLOW_BUILTIN=false).
  const allowBuiltin =
    (process.env.CORS_ALLOW_BUILTIN ?? 'true').toLowerCase() !== 'false';

  const allowedOrigins = [
    ...new Set([
      ...corsOrigins,
      ...(allowBuiltin ? builtinOrigins : []),
    ]),
  ];

  // Patterns dynamiques (Vercel preview : *.vercel.app).
  const wildcardPatterns = [
    /^https:\/\/dizipay-web[a-z0-9-]*\.vercel\.app$/,
  ];

  const corsOriginOption =
    allowedOrigins.length > 0 || wildcardPatterns.length > 0
      ? (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          if (!origin) {
            callback(null, true);
            return;
          }
          const normalized = origin.replace(/\/$/, '');
          const allowed =
            allowedOrigins.includes(normalized) ||
            wildcardPatterns.some((re) => re.test(normalized));
          callback(null, allowed);
        }
      : true;

  app.enableCors({
    origin: corsOriginOption,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
  });

  Logger.log(
    `CORS origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : '(any)'}`,
  );

  const port = parseInt(process.env.PORT ?? '3000', 10);
  setupSwagger(app, port);

  await app.listen(port);

  Logger.log(
    `HTTP ${port} — Swagger UI http://localhost:${port}/api — OpenAPI JSON http://localhost:${port}/api-json — préfixe routes /${apiPrefix}`,
  );
}

bootstrap();
