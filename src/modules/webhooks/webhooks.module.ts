import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PispiWebhookSignatureGuard } from './guards/pispi-webhook-signature.guard';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, PispiWebhookSignatureGuard],
})
export class WebhooksModule {}
