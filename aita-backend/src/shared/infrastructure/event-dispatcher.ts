import type { DomainEvent } from '../domain/domain-event.js'
import type { IEventDispatcher, IEventHandler } from '../application/ports/i-event-dispatcher.js'
import { Logger } from './logger.js'

/**
 * In-memory event dispatcher.
 * Dispatches domain events to registered handlers synchronously (in-process).
 * Can be replaced by a message-broker-backed implementation later.
 */
export class InMemoryEventDispatcher implements IEventDispatcher {
  private readonly handlers = new Map<string, IEventHandler[]>()
  private readonly logger = new Logger('EventDispatcher')

  register(eventType: string, handler: IEventHandler): void {
    const existing = this.handlers.get(eventType) ?? []
    existing.push(handler)
    this.handlers.set(eventType, existing)
    this.logger.debug(`Registered handler for event: ${eventType}`)
  }

  async dispatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.handlers.get(event.eventType) ?? []
      this.logger.debug(`Dispatching ${event.eventType} to ${handlers.length} handler(s)`)
      for (const handler of handlers) {
        try {
          await handler.handle(event)
        } catch (error) {
          this.logger.error(`Handler failed for event ${event.eventType}`, error as Error)
        }
      }
    }
  }
}
