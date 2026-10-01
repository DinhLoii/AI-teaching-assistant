import { AggregateRoot, DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class ClassCreatedEvent extends DomainEvent {
  constructor(
    public readonly classId: string,
    public readonly classCode: string | null
  ) {
    super('ClassCreatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      classId: this.classId,
      classCode: this.classCode,
      occurredAt: this.occurredAt,
    }
  }
}

export class ClassArchivedEvent extends DomainEvent {
  constructor(public readonly classId: string) {
    super('ClassArchivedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      classId: this.classId,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Aggregate Root: Class
// ──────────────────────────────────────────────────────────────

/**
 * Represents a class/course instance linked to a subject and semester.
 * Mapped to Prisma Class model.
 */
export class Class extends AggregateRoot {
  id: string
  classCode: string | null
  subjectId: string | null
  semesterId: string | null
  status: string | null

  private constructor(
    id: string,
    classCode: string | null,
    subjectId: string | null,
    semesterId: string | null,
    status: string | null
  ) {
    super()
    this.id = id
    this.classCode = classCode
    this.subjectId = subjectId
    this.semesterId = semesterId
    this.status = status
  }

  // ── Factory Methods ──

  static create(
    id: string,
    classCode: string,
    subjectId: string,
    semesterId: string
  ): Class {
    const classEntity = new Class(id, classCode, subjectId, semesterId, 'Active')
    classEntity.addDomainEvent(new ClassCreatedEvent(classEntity.id, classEntity.classCode))
    return classEntity
  }

  static restore(
    id: string,
    classCode: string | null,
    subjectId: string | null,
    semesterId: string | null,
    status: string | null
  ): Class {
    return new Class(id, classCode, subjectId, semesterId, status)
  }

  // ── Business Logic ──

  isActive(): boolean {
    return this.status === 'Active'
  }

  archive(): void {
    this.status = 'Archived'
    this.addDomainEvent(new ClassArchivedEvent(this.id))
  }

  updateInfo(params: {
    classCode?: string
    subjectId?: string
    semesterId?: string
  }): void {
    if (params.classCode !== undefined) this.classCode = params.classCode
    if (params.subjectId !== undefined) this.subjectId = params.subjectId
    if (params.semesterId !== undefined) this.semesterId = params.semesterId
  }
}
