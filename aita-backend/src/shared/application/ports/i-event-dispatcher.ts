import type { DomainEvent } from '../../domain/domain-event.js'

/**
 * Handler for a specific domain event type.
 */
export interface IEventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>
}

/**
 * Port interface for dispatching domain events.
 * Allows the application layer to publish events without knowing how they are delivered.
 */
export interface IEventDispatcher {
  /** Dispatch a list of domain events to registered handlers */
  dispatch(events: DomainEvent[]): Promise<void>

  /** Register a handler for a specific event type */
  register(eventType: string, handler: IEventHandler): void
}
