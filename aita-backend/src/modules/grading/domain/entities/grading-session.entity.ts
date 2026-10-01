import { AggregateRoot, DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type SessionStatusValue = 'Running' | 'Completed' | 'Failed'
export type TriggerReasonValue = 'Initial' | 'Regrade' | 'SystemRetry'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class GradingSessionStartedEvent extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly submissionId: string | null
  ) {
    super('GradingSessionStartedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      sessionId: this.sessionId,
      submissionId: this.submissionId,
      occurredAt: this.occurredAt,
    }
  }
}

export class GradingSessionCompletedEvent extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly totalScore: number | null
  ) {
    super('GradingSessionCompletedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      sessionId: this.sessionId,
      totalScore: this.totalScore,
      occurredAt: this.occurredAt,
    }
  }
}

export class GradingSessionFailedEvent extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly reason?: string
  ) {
    super('GradingSessionFailedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      sessionId: this.sessionId,
      reason: this.reason,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Entity: GradingSession
// ──────────────────────────────────────────────────────────────

/**
 * Represents a complete grading session for a submission.
 * A session orchestrates multiple GradingJobs and tracks overall progress.
 */
export class GradingSession extends AggregateRoot {
  id: string
  submissionId: string | null
  version: number | null
  triggeredBy: string | null
  triggerReason: TriggerReasonValue | null
  status: SessionStatusValue | null
  totalScore: number | null
  startedAt: Date | null
  completedAt: Date | null

  private constructor(
    id: string,
    submissionId: string | null,
    version: number | null,
    triggeredBy: string | null,
    triggerReason: TriggerReasonValue | null,
    status: SessionStatusValue | null,
    totalScore: number | null,
    startedAt: Date | null,
    completedAt: Date | null
  ) {
    super()
    this.id = id
    this.submissionId = submissionId
    this.version = version
    this.triggeredBy = triggeredBy
    this.triggerReason = triggerReason
    this.status = status
    this.totalScore = totalScore
    this.startedAt = startedAt
    this.completedAt = completedAt
  }

  // ── Factory Methods ──

  static create(
    id: string,
    submissionId: string,
    triggeredBy: string,
    triggerReason: TriggerReasonValue = 'Initial'
  ): GradingSession {
    const session = new GradingSession(
      id, submissionId, 1, triggeredBy, triggerReason,
      'Running', null, new Date(), null
    )
    session.addDomainEvent(
      new GradingSessionStartedEvent(session.id, session.submissionId)
    )
    return session
  }

  static restore(
    id: string,
    submissionId: string | null,
    version: number | null,
    triggeredBy: string | null,
    triggerReason: TriggerReasonValue | null,
    status: SessionStatusValue | null,
    totalScore: number | null,
    startedAt: Date | null,
    completedAt: Date | null
  ): GradingSession {
    return new GradingSession(
      id, submissionId, version, triggeredBy, triggerReason,
      status, totalScore, startedAt, completedAt
    )
  }

  // ── Business Logic ──

  complete(totalScore: number): void {
    this.status = 'Completed'
    this.totalScore = totalScore
    this.completedAt = new Date()
    this.addDomainEvent(new GradingSessionCompletedEvent(this.id, totalScore))
  }

  fail(reason?: string): void {
    this.status = 'Failed'
    this.completedAt = new Date()
    this.addDomainEvent(new GradingSessionFailedEvent(this.id, reason))
  }

  isRunning(): boolean {
    return this.status === 'Running'
  }

  isCompleted(): boolean {
    return this.status === 'Completed'
  }

  isFailed(): boolean {
    return this.status === 'Failed'
  }

  getDurationMs(): number | null {
    if (!this.startedAt) return null
    const end = this.completedAt ?? new Date()
    return end.getTime() - this.startedAt.getTime()
  }
}
