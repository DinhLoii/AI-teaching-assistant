import { AggregateRoot, DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class SemesterCreatedEvent extends DomainEvent {
  constructor(
    public readonly semesterId: string,
    public readonly code: string | null
  ) {
    super('SemesterCreatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      semesterId: this.semesterId,
      code: this.code,
      occurredAt: this.occurredAt,
    }
  }
}

export class SemesterActivatedEvent extends DomainEvent {
  constructor(public readonly semesterId: string) {
    super('SemesterActivatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      semesterId: this.semesterId,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Aggregate Root: Semester
// ──────────────────────────────────────────────────────────────

/**
 * Represents an academic semester with date range and activation status.
 */
export class Semester extends AggregateRoot {
  id: string
  code: string | null
  startDate: Date | null
  endDate: Date | null
  isActive: boolean | null

  private constructor(
    id: string,
    code: string | null,
    startDate: Date | null,
    endDate: Date | null,
    isActive: boolean | null
  ) {
    super()
    this.id = id
    this.code = code
    this.startDate = startDate
    this.endDate = endDate
    this.isActive = isActive
  }

  // ── Factory Methods ──

  static create(
    id: string,
    code: string,
    startDate: Date,
    endDate: Date
  ): Semester {
    const semester = new Semester(id, code, startDate, endDate, false)
    semester.addDomainEvent(new SemesterCreatedEvent(semester.id, semester.code))
    return semester
  }

  static restore(
    id: string,
    code: string | null,
    startDate: Date | null,
    endDate: Date | null,
    isActive: boolean | null
  ): Semester {
    return new Semester(id, code, startDate, endDate, isActive)
  }

  // ── Business Logic ──

  activate(): void {
    this.isActive = true
    this.addDomainEvent(new SemesterActivatedEvent(this.id))
  }

  deactivate(): void {
    this.isActive = false
  }

  isCurrent(): boolean {
    const now = new Date()
    const start = this.startDate ?? new Date(0)
    const end = this.endDate ?? new Date(9999, 11, 31)
    return now >= start && now <= end
  }

  updateDates(startDate: Date, endDate: Date): void {
    this.startDate = startDate
    this.endDate = endDate
  }
}
