import { DomainEvent } from '@/domain/payments/events/domain-event.interface';

/**
 * Port d'émission d'événements domaine.
 *
 * Contrat : les use cases publient des faits métier ; ils ne connaissent
 * ni les handlers (e-mail, SMS, audit) ni le bus technique.
 */
export interface DomainEventPublisherPort {
  publish(event: DomainEvent): Promise<void>;
}
