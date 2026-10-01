import { DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class SubjectProjectTypeLinkedEvent extends DomainEvent {
  constructor(
    public readonly subjectId: string,
    public readonly projectTypeId: string
  ) {
    super('SubjectProjectTypeLinkedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      subjectId: this.subjectId,
      projectTypeId: this.projectTypeId,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Value Object: SubjectProjectType (junction table)
// ──────────────────────────────────────────────────────────────

/**
 * Represents the Subject-ProjectType association (Prisma model: SubjectProjectType).
 * Composite key: (subjectId, projectTypeId).
 */
export class SubjectProjectType {
  readonly subjectId: string
  readonly projectTypeId: string

  private constructor(subjectId: string, projectTypeId: string) {
    this.subjectId = subjectId
    this.projectTypeId = projectTypeId
  }

  // ── Factory Methods ──

  static create(subjectId: string, projectTypeId: string): SubjectProjectType {
    return new SubjectProjectType(subjectId, projectTypeId)
  }

  static restore(subjectId: string, projectTypeId: string): SubjectProjectType {
    return new SubjectProjectType(subjectId, projectTypeId)
  }

  // ── Equality ──

  equals(other: SubjectProjectType): boolean {
    return (
      this.subjectId === other.subjectId &&
      this.projectTypeId === other.projectTypeId
    )
  }

  toJSON() {
    return {
      subjectId: this.subjectId,
      projectTypeId: this.projectTypeId,
    }
  }
}
