import { AggregateRoot, DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class NotificationCreatedEvent extends DomainEvent {
  constructor(
    public readonly notificationId: string,
    public readonly title: string | null,
    public readonly createdBy: string | null
  ) {
    super('NotificationCreatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      notificationId: this.notificationId,
      title: this.title,
      createdBy: this.createdBy,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Aggregate Root: Notification
// ──────────────────────────────────────────────────────────────

/**
 * Represents a system notification that can be sent to multiple recipients.
 */
export class Notification extends AggregateRoot {
  id: string
  title: string | null
  message: string | null
  type: string | null
  referenceId: string | null
  referenceType: string | null
  createdBy: string | null
  createdAt: Date | null

  private constructor(
    id: string,
    title: string | null,
    message: string | null,
    type: string | null,
    referenceId: string | null,
    referenceType: string | null,
    createdBy: string | null,
    createdAt: Date | null
  ) {
    super()
    this.id = id
    this.title = title
    this.message = message
    this.type = type
    this.referenceId = referenceId
    this.referenceType = referenceType
    this.createdBy = createdBy
    this.createdAt = createdAt
  }

  // ── Factory Methods ──

  static create(
    id: string,
    title: string,
    message: string,
    createdBy: string,
    params?: {
      type?: string
      referenceId?: string
      referenceType?: string
    }
  ): Notification {
    const notification = new Notification(
      id, title, message,
      params?.type ?? null,
      params?.referenceId ?? null,
      params?.referenceType ?? null,
      createdBy, new Date()
    )
    notification.addDomainEvent(
      new NotificationCreatedEvent(notification.id, notification.title, notification.createdBy)
    )
    return notification
  }

  static restore(
    id: string,
    title: string | null,
    message: string | null,
    type: string | null,
    referenceId: string | null,
    referenceType: string | null,
    createdBy: string | null,
    createdAt: Date | null
  ): Notification {
    return new Notification(id, title, message, type, referenceId, referenceType, createdBy, createdAt)
  }

  // ── Business Logic ──

  updateContent(params: {
    title?: string
    message?: string
  }): void {
    if (params.title !== undefined) this.title = params.title
    if (params.message !== undefined) this.message = params.message
  }
}
