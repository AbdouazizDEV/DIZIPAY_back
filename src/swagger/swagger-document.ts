import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication, port: number) {
  const config = new DocumentBuilder()
    .setTitle('DiziPay API')
    .setDescription(
      [
        '**Backend NestJS** — orchestration des paiements via **PI-SPI BCEAO** (API Business, QR EMVCo).',
        '',
        '### Authentification',
        '- **Auth** : `POST /auth/login` → récupérez `access_token`.',
        '- **Payments** : cliquez **Authorize** et saisissez `Bearer <access_token>`.',
        '- **Webhooks** : appelé par PI-SPI (pas de JWT) ; signature `x-pispi-signature` (HMAC-SHA256 du corps brut) si `PISPI_WEBHOOK_SECRET` est défini.',
        '',
        '### Parcours de test recommandé',
        '1. `POST /auth/login` (compte seed : `merchant@dizipay.local`).',
        '2. `POST /payments/merchant-presented-qr` — payload EMV pour QR marchand.',
        '3. `POST /payments/scan-and-pay` — marchand scanne le QR client.',
        '4. `GET /payments/status/{transactionId}` — suivi.',
        '5. `POST /webhooks/pispi` — simulation notification (avec signature si secret configuré).',
        '',
        '### Documentation externe',
        '- [Guides PI-SPI](https://developer.pispi.bceao.int/guides)',
        '- [Tutoriels](https://developer.pispi.bceao.int/tutoriels)',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .setContact(
      'DiziGroup',
      'https://developer.pispi.bceao.int',
      'support@example.com',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token obtenu via POST /auth/login (`access_token`)',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer(`http://localhost:${port}`, 'Machine locale')
    .addTag(
      'Auth',
      'Connexion et obtention du jeton JWT (aucune autorisation préalable)',
    )
    .addTag(
      'Payments',
      'Paiements et QR — **JWT + rôle marchand** (`merchantId` dans le token)',
    )
    .addTag(
      'Webhooks',
      'Notifications PI-SPI — **sans JWT** ; vérification HMAC optionnelle en dev',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'DiziPay API — Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      tryItOutEnabled: true,
      displayRequestDuration: true,
      syntaxHighlight: { activate: true, theme: 'monokai' },
    },
    jsonDocumentUrl: '/api-json',
  });
}
