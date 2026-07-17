import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '@/domain/payments/events/domain-event.interface';
import { DomainEventPublisherPort } from '@/domain/payments/ports/domain-event-publisher.port';

/**
 * Publie les événements domaine via le bus NestJS EventEmitter2.
 *
 * Les handlers s'abonnent avec `@OnEvent(event.eventName)` —
 * le use case ne connaît que {@link DomainEventPublisherPort}.
 */
@Injectable()
export class NestDomainEventPublisher implements DomainEventPublisherPort {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.eventEmitter.emitAsync(event.eventName, event);
  }
}
