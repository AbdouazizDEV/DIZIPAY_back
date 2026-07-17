import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { PaymentsModule } from '@/modules/payments/payments.module';
import { PaymentsApplicationModule } from '@/application/payments/payments-application.module';
import { PaymentProvidersController } from '@/presentation/payments/payment-providers.controller';
import { PayoutsController } from '@/presentation/payments/payouts.controller';

@Module({
  imports: [AuthModule, PaymentsModule, PaymentsApplicationModule],
  controllers: [PaymentProvidersController, PayoutsController],
})
export class PaymentsPresentationModule {}
