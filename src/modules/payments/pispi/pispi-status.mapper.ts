import { TransactionStatus } from '@prisma/client';

/** Statuts textuels renvoyés par PI-SPI (API / webhooks), alignés avec pispi.service */
export function mapPispiStatutToTransactionStatus(
  statut: string | undefined,
): TransactionStatus {
  if (!statut) {
    return TransactionStatus.PROCESSING;
  }
  const key = statut.trim().toUpperCase();
  const success = new Set(['SUCCES', 'REUSSI', 'SUCCESS', 'COMPLETED']);
  const failed = new Set(['ECHEC', 'REJETE', 'ANNULE', 'FAILED', 'CANCELLED']);
  const pending = new Set([
    'EN_ATTENTE',
    'EN_COURS',
    'PENDING',
    'PROCESSING',
    'INITIE',
  ]);
  if (success.has(key)) {
    return TransactionStatus.SUCCESS;
  }
  if (failed.has(key)) {
    return TransactionStatus.FAILED;
  }
  if (pending.has(key)) {
    return TransactionStatus.PROCESSING;
  }
  return TransactionStatus.PROCESSING;
}
