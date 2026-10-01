import { AggregateRoot, DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type JobStatusValue = 'Queued' | 'Waiting' | 'Running' | 'Completed' | 'Failed' | 'Cancelled'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class GradingJobStartedEvent extends DomainEvent {
  constructor(
    public readonly jobId: string,
    public readonly engine: string | null
  ) {
    super('GradingJobStartedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      jobId: this.jobId,
      engine: this.engine,
      occurredAt: this.occurredAt,
    }
  }
}

export class GradingJobCompletedEvent extends DomainEvent {
  constructor(public readonly jobId: string) {
    super('GradingJobCompletedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      jobId: this.jobId,
      occurredAt: this.occurredAt,
    }
  }
}

export class GradingJobFailedEvent extends DomainEvent {
  constructor(
    public readonly jobId: string,
    public readonly errorMessage: string | null
  ) {
    super('GradingJobFailedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      jobId: this.jobId,
      errorMessage: this.errorMessage,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Entity: GradingJob
// ──────────────────────────────────────────────────────────────

/**
 * Represents a single grading job within a grading session.
 * Each job runs a specific engine (e.g., StaticAnalysis, AiCodeReview).
 */
export class GradingJob extends AggregateRoot {
  id: string
  gradingSessionId: string | null
  gradingProfileStepId: string | null
  engine: string | null
  priority: number | null
  status: JobStatusValue | null
  retryCount: number | null
  errorMessage: string | null
  startedAt: Date | null
  completedAt: Date | null
  workerNodeId: string | null

  private constructor(
    id: string,
    gradingSessionId: string | null,
    gradingProfileStepId: string | null,
    engine: string | null,
    priority: number | null,
    status: JobStatusValue | null,
    retryCount: number | null,
    errorMessage: string | null,
    startedAt: Date | null,
    completedAt: Date | null,
    workerNodeId: string | null
  ) {
    super()
    this.id = id
    this.gradingSessionId = gradingSessionId
    this.gradingProfileStepId = gradingProfileStepId
    this.engine = engine
    this.priority = priority
    this.status = status
    this.retryCount = retryCount
    this.errorMessage = errorMessage
    this.startedAt = startedAt
    this.completedAt = completedAt
    this.workerNodeId = workerNodeId
  }

  // ── Factory Methods ──

  static create(
    id: string,
    gradingSessionId: string,
    engine: string,
    params?: {
      gradingProfileStepId?: string
      priority?: number
    }
  ): GradingJob {
    return new GradingJob(
      id, gradingSessionId,
      params?.gradingProfileStepId ?? null,
      engine,
      params?.priority ?? 0,
      'Queued', 0, null, null, null, null
    )
  }

  static restore(
    id: string,
    gradingSessionId: string | null,
    gradingProfileStepId: string | null,
    engine: string | null,
    priority: number | null,
    status: JobStatusValue | null,
    retryCount: number | null,
    errorMessage: string | null,
    startedAt: Date | null,
    completedAt: Date | null,
    workerNodeId: string | null
  ): GradingJob {
    return new GradingJob(
      id, gradingSessionId, gradingProfileStepId, engine,
      priority, status, retryCount, errorMessage,
      startedAt, completedAt, workerNodeId
    )
  }

  // ── Business Logic ──

  start(workerNodeId?: string): void {
    this.status = 'Running'
    this.startedAt = new Date()
    if (workerNodeId) this.workerNodeId = workerNodeId
    this.addDomainEvent(new GradingJobStartedEvent(this.id, this.engine))
  }

  complete(): void {
    this.status = 'Completed'
    this.completedAt = new Date()
    this.addDomainEvent(new GradingJobCompletedEvent(this.id))
  }

  fail(errorMessage: string): void {
    this.status = 'Failed'
    this.errorMessage = errorMessage
    this.completedAt = new Date()
    this.addDomainEvent(new GradingJobFailedEvent(this.id, errorMessage))
  }

  cancel(): void {
    this.status = 'Cancelled'
    this.completedAt = new Date()
  }

  retry(): void {
    this.retryCount = (this.retryCount ?? 0) + 1
    this.status = 'Queued'
    this.errorMessage = null
    this.startedAt = null
    this.completedAt = null
  }

  isCompleted(): boolean {
    return this.status === 'Completed'
  }

  isFailed(): boolean {
    return this.status === 'Failed'
  }

  isRunning(): boolean {
    return this.status === 'Running'
  }
}
