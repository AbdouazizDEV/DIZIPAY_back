import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PISPIService } from './pispi/pispi.service';
import { QRDecoderService } from './qr/qr-decoder.service';
import { QRGeneratorService } from './qr/qr-generator.service';

@Module({
  imports: [
    AuthModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PISPIService,
    QRDecoderService,
    QRGeneratorService,
  ],
  exports: [PaymentsService, PISPIService, QRDecoderService, QRGeneratorService],
})
export class PaymentsModule {}
