import { DomainPaymentStatus } from '@/domain/payments/enums/payment-status.enum';
import type { PispiPaymentStatus } from '@/modules/payments/pispi/pispi.service';

/**
 * Mappe les statuts renvoyés par {@link PISPIService} vers le vocabulaire domaine.
 * Isolé pour rester indépendant du mapper Prisma ({@link mapPispiStatutToTransactionStatus}).
 */
export function mapPispiStatusToDomain(
  status: PispiPaymentStatus,
): DomainPaymentStatus {
  switch (status) {
    case 'SUCCESS':
      return DomainPaymentStatus.SUCCESS;
    case 'FAILED':
      return DomainPaymentStatus.FAILED;
    case 'PENDING':
    default:
      return DomainPaymentStatus.PENDING;
  }
}
