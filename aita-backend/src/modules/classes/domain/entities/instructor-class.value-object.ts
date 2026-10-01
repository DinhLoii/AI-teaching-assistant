import { DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class InstructorAssignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly classId: string
  ) {
    super('InstructorAssignedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      userId: this.userId,
      classId: this.classId,
      occurredAt: this.occurredAt,
    }
  }
}

export class InstructorRemovedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly classId: string
  ) {
    super('InstructorRemovedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      userId: this.userId,
      classId: this.classId,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Value Object: InstructorClass (junction table)
// ──────────────────────────────────────────────────────────────

/**
 * Represents an instructor assignment to a class.
 * Composite key: (userId, classId).
 */
export class InstructorClass {
  readonly userId: string
  readonly classId: string
  readonly enrolledAt: Date | null

  private constructor(userId: string, classId: string, enrolledAt: Date | null) {
    this.userId = userId
    this.classId = classId
    this.enrolledAt = enrolledAt
  }

  static create(userId: string, classId: string): InstructorClass {
    return new InstructorClass(userId, classId, new Date())
  }

  static restore(userId: string, classId: string, enrolledAt: Date | null): InstructorClass {
    return new InstructorClass(userId, classId, enrolledAt)
  }

  equals(other: InstructorClass): boolean {
    return this.userId === other.userId && this.classId === other.classId
  }

  toJSON() {
    return {
      userId: this.userId,
      classId: this.classId,
      enrolledAt: this.enrolledAt,
    }
  }
}
