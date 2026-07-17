import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { PaymentsApplicationModule } from '@/application/payments/payments-application.module';
import { PispiModule } from '@/modules/payments/pispi/pispi.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { QRDecoderService } from './qr/qr-decoder.service';
import { QRGeneratorService } from './qr/qr-generator.service';

@Module({
  imports: [AuthModule, PispiModule, PaymentsApplicationModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, QRDecoderService, QRGeneratorService],
  exports: [PaymentsService, PispiModule, QRDecoderService, QRGeneratorService],
})
export class PaymentsModule {}
