/**
 * Contrat minimal d'un événement domaine.
 *
 * Les handlers (notifications, audit…) s'abonnent à ces événements
 * sans coupler le use case au canal de notification.
 */
export interface DomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
}
