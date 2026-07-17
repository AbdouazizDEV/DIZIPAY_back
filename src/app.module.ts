import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import appConfig from '@/config/app.config';
import databaseConfig from '@/config/database.config';
import pispiConfig from '@/config/pispi.config';
import redisConfig from '@/config/redis.config';
import { CacheModule } from '@/cache/cache.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '@/common/filters/prisma-exception.filter';
import { validationPipe } from '@/common/pipes/validation.pipe';
import { PrismaModule } from '@/database/prisma.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { PaymentsModule } from '@/modules/payments/payments.module';
import { PaymentLinksModule } from '@/modules/payment-links/payment-links.module';
import { WebhooksModule } from '@/modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, pispiConfig, redisConfig],
      envFilePath: ['.env', `.env.${process.env.NODE_ENV ?? 'development'}`],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10) * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
      },
    ]),
    PrismaModule,
    CacheModule,
    AuthModule,
    PaymentsModule,
    PaymentLinksModule,
    WebhooksModule,
  ],
  providers: [
    { provide: APP_PIPE, useValue: validationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
