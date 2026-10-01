/**
 * Domain Event base class
 * Used for domain events that track important business events
 */
export abstract class DomainEvent {
  occurredAt: Date
  eventType: string

  constructor(eventType: string, occurredAt: Date = new Date()) {
    this.eventType = eventType
    this.occurredAt = occurredAt
  }

  abstract toJSON(): Record<string, any>
}

/**
 * Aggregate root with domain events
 * Tracks events that occur in the aggregate
 */
export abstract class AggregateRoot {
  private domainEvents: DomainEvent[] = []

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event)
  }

  public getDomainEvents(): DomainEvent[] {
    return this.domainEvents
  }

  public clearDomainEvents(): void {
    this.domainEvents = []
  }
}
