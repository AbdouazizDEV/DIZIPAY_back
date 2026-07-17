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
    .map((o) => o.trim())
    .filter(Boolean);

  // Ports Vite locaux (le front tourne souvent sur 5173 ou 5174).
  const viteLocalOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ];

  // Toujours autoriser le front Vite local en plus de CORS_ORIGIN
  // (sauf si CORS_ALLOW_LOCALHOST=false).
  const allowLocalhost =
    (process.env.CORS_ALLOW_LOCALHOST ?? 'true').toLowerCase() !== 'false';

  const allowedOrigins = [
    ...new Set([
      ...corsOrigins,
      ...(allowLocalhost ? viteLocalOrigins : []),
    ]),
  ];

  // Si aucune origine configurée et localhost désactivé → tout autoriser (mobile / outils).
  const corsOriginOption =
    allowedOrigins.length > 0
      ? (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          if (!origin) {
            callback(null, true);
            return;
          }
          callback(null, allowedOrigins.includes(origin));
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

  const port = parseInt(process.env.PORT ?? '3000', 10);
  setupSwagger(app, port);

  await app.listen(port);

  Logger.log(
    `HTTP ${port} — Swagger UI http://localhost:${port}/api — OpenAPI JSON http://localhost:${port}/api-json — préfixe routes /${apiPrefix}`,
  );
}

bootstrap();
