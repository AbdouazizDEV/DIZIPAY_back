import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * URL publique de l’API pour Swagger « Try it out » (sans slash final).
 * Render définit `RENDER_EXTERNAL_URL` ; sinon définir `SWAGGER_PUBLIC_URL` manuellement.
 */
function swaggerPublicBaseUrl(): string | undefined {
  const raw =
    process.env.SWAGGER_PUBLIC_URL?.trim() ||
    process.env.RENDER_EXTERNAL_URL?.trim();
  if (!raw) {
    return undefined;
  }
  return raw.replace(/\/$/, '');
}

export function setupSwagger(app: INestApplication, port: number) {
  const builder = new DocumentBuilder()
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
        '2. `GET /payment-providers` — modes de paiement disponibles (PSPI actif, Wave bientôt).',
        '3. `POST /payment-links` — créer un lien partageable (montant + description).',
        '4. `GET /payment-links/{token}` — page publique client (sans JWT).',
        '5. Client paie via QR **ou** `POST /payment-links/{token}/pay` avec `paymentProvider`.',
        '6. `GET /payment-links/{token}/status` — polling.',
        '7. Virement : `POST /payouts` (MOBILE_MONEY ou BANK_ACCOUNT).',
        '8. Alternatif QR : `POST /payments/merchant-presented-qr` / `scan-and-pay`.',
        '9. `POST /webhooks/pispi` — simulation notification.',
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
    .addTag(
      'Auth',
      'Connexion et obtention du jeton JWT (aucune autorisation préalable)',
    )
    .addTag(
      'Payment Links',
      'Liens de paiement partageables — création JWT marchand ; consultation / paiement **public**',
    )
    .addTag(
      'Payment Providers',
      'Choix du mode de paiement (PSPI / Wave) — liste publique + initiation JWT',
    )
    .addTag(
      'Payouts',
      'Virements sortants (mobile money / IBAN) — JWT marchand',
    )
    .addTag(
      'Payments',
      'Paiements et QR — **JWT + rôle marchand** (`merchantId` dans le token)',
    )
    .addTag(
      'Webhooks',
      'Notifications PI-SPI — **sans JWT** ; vérification HMAC optionnelle en dev',
    );

  const publicBase = swaggerPublicBaseUrl();
  if (publicBase) {
    builder.addServer(publicBase, 'Déploiement (URL publique)');
  }
  builder.addServer(`http://localhost:${port}`, 'Machine locale');

  const config = builder.build();

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
