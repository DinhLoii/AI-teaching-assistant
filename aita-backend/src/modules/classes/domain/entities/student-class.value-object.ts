import { DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class StudentEnrolledEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly classId: string
  ) {
    super('StudentEnrolledEvent')
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

export class StudentUnenrolledEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly classId: string
  ) {
    super('StudentUnenrolledEvent')
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
// Value Object: StudentClass (junction table)
// ──────────────────────────────────────────────────────────────

/**
 * Represents a student enrollment in a class.
 * Composite key: (userId, classId).
 */
export class StudentClass {
  readonly userId: string
  readonly classId: string
  readonly enrolledAt: Date | null

  private constructor(userId: string, classId: string, enrolledAt: Date | null) {
    this.userId = userId
    this.classId = classId
    this.enrolledAt = enrolledAt
  }

  static create(userId: string, classId: string): StudentClass {
    return new StudentClass(userId, classId, new Date())
  }

  static restore(userId: string, classId: string, enrolledAt: Date | null): StudentClass {
    return new StudentClass(userId, classId, enrolledAt)
  }

  equals(other: StudentClass): boolean {
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
