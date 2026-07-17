import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PISPIService } from '@/modules/payments/pispi/pispi.service';

/**
 * Module technique PI-SPI (client HTTP).
 * Isolé pour éviter les cycles DI entre PaymentsModule et PaymentsInfrastructureModule.
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
  ],
  providers: [PISPIService],
  exports: [PISPIService],
})
export class PispiModule {}
