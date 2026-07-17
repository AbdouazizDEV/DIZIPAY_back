import { Module } from '@nestjs/common';
import { PaymentsModule } from '@/modules/payments/payments.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { PaymentsApplicationModule } from '@/application/payments/payments-application.module';
import { PaymentLinksController } from './payment-links.controller';
import { PaymentLinksService } from './payment-links.service';

@Module({
  imports: [AuthModule, PaymentsModule, PaymentsApplicationModule],
  controllers: [PaymentLinksController],
  providers: [PaymentLinksService],
  exports: [PaymentLinksService],
})
export class PaymentLinksModule {}
