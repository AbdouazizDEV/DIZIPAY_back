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

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  setupSwagger(app, port);

  await app.listen(port);

  Logger.log(
    `HTTP ${port} — Swagger UI http://localhost:${port}/api — OpenAPI JSON http://localhost:${port}/api-json — préfixe routes /${apiPrefix}`,
  );
}

bootstrap();
