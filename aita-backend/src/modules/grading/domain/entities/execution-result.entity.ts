import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type ExecutionStatusValue = 'Completed' | 'Failed'

// ──────────────────────────────────────────────────────────────
// Entity: ExecutionResult
// ──────────────────────────────────────────────────────────────

/**
 * Represents the result of a single execution within a grading job.
 * Each execution runs a specific engine against a submission.
 */
export class ExecutionResult extends AggregateRoot {
  id: string
  gradingJobId: string | null
  submissionId: string | null
  engineType: string | null
  executionLabel: string | null
  rawOutput: string | null
  score: number | null
  status: ExecutionStatusValue | null
  startedAt: Date | null
  completedAt: Date | null
  durationMs: number | null

  private constructor(
    id: string,
    gradingJobId: string | null,
    submissionId: string | null,
    engineType: string | null,
    executionLabel: string | null,
    rawOutput: string | null,
    score: number | null,
    status: ExecutionStatusValue | null,
    startedAt: Date | null,
    completedAt: Date | null,
    durationMs: number | null
  ) {
    super()
    this.id = id
    this.gradingJobId = gradingJobId
    this.submissionId = submissionId
    this.engineType = engineType
    this.executionLabel = executionLabel
    this.rawOutput = rawOutput
    this.score = score
    this.status = status
    this.startedAt = startedAt
    this.completedAt = completedAt
    this.durationMs = durationMs
  }

  // ── Factory Methods ──

  static create(
    id: string,
    gradingJobId: string,
    submissionId: string,
    engineType: string
  ): ExecutionResult {
    return new ExecutionResult(
      id, gradingJobId, submissionId, engineType,
      null, null, null, null, new Date(), null, null
    )
  }

  static restore(
    id: string,
    gradingJobId: string | null,
    submissionId: string | null,
    engineType: string | null,
    executionLabel: string | null,
    rawOutput: string | null,
    score: number | null,
    status: ExecutionStatusValue | null,
    startedAt: Date | null,
    completedAt: Date | null,
    durationMs: number | null
  ): ExecutionResult {
    return new ExecutionResult(
      id, gradingJobId, submissionId, engineType, executionLabel,
      rawOutput, score, status, startedAt, completedAt, durationMs
    )
  }

  // ── Business Logic ──

  complete(score: number, rawOutput: string): void {
    this.status = 'Completed'
    this.score = score
    this.rawOutput = rawOutput
    this.completedAt = new Date()
    if (this.startedAt) {
      this.durationMs = this.completedAt.getTime() - this.startedAt.getTime()
    }
  }

  fail(rawOutput: string): void {
    this.status = 'Failed'
    this.rawOutput = rawOutput
    this.completedAt = new Date()
    if (this.startedAt) {
      this.durationMs = this.completedAt.getTime() - this.startedAt.getTime()
    }
  }

  isCompleted(): boolean {
    return this.status === 'Completed'
  }

  isFailed(): boolean {
    return this.status === 'Failed'
  }
}
