import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type ActionTypeValue = 'GenerateExam' | 'GenerateRubric' | 'GenerateTestCase' | 'GradeSubmission'

// ──────────────────────────────────────────────────────────────
// Entity: AiUsageLog
// ──────────────────────────────────────────────────────────────

/**
 * Tracks AI API usage for cost monitoring and analytics.
 * Records token usage, cost estimates, and request metadata.
 */
export class AiUsageLog extends AggregateRoot {
  id: string
  userId: string | null
  examId: string | null
  submissionId: string | null
  requestId: string | null
  provider: string | null
  actionType: ActionTypeValue | null
  modelUsed: string | null
  promptTokens: number | null
  completionTokens: number | null
  costEstimate: number | null
  durationMs: number | null
  isSuccess: boolean | null
  errorMessage: string | null
  createdAt: Date | null

  private constructor(
    id: string,
    userId: string | null,
    examId: string | null,
    submissionId: string | null,
    requestId: string | null,
    provider: string | null,
    actionType: ActionTypeValue | null,
    modelUsed: string | null,
    promptTokens: number | null,
    completionTokens: number | null,
    costEstimate: number | null,
    durationMs: number | null,
    isSuccess: boolean | null,
    errorMessage: string | null,
    createdAt: Date | null
  ) {
    super()
    this.id = id
    this.userId = userId
    this.examId = examId
    this.submissionId = submissionId
    this.requestId = requestId
    this.provider = provider
    this.actionType = actionType
    this.modelUsed = modelUsed
    this.promptTokens = promptTokens
    this.completionTokens = completionTokens
    this.costEstimate = costEstimate
    this.durationMs = durationMs
    this.isSuccess = isSuccess
    this.errorMessage = errorMessage
    this.createdAt = createdAt
  }

  // ── Factory Methods ──

  static create(
    id: string,
    userId: string,
    actionType: ActionTypeValue,
    params?: {
      examId?: string
      submissionId?: string
      requestId?: string
      provider?: string
      modelUsed?: string
    }
  ): AiUsageLog {
    return new AiUsageLog(
      id, userId,
      params?.examId ?? null,
      params?.submissionId ?? null,
      params?.requestId ?? null,
      params?.provider ?? null,
      actionType,
      params?.modelUsed ?? null,
      null, null, null, null, null, null, new Date()
    )
  }

  static restore(
    id: string,
    userId: string | null,
    examId: string | null,
    submissionId: string | null,
    requestId: string | null,
    provider: string | null,
    actionType: ActionTypeValue | null,
    modelUsed: string | null,
    promptTokens: number | null,
    completionTokens: number | null,
    costEstimate: number | null,
    durationMs: number | null,
    isSuccess: boolean | null,
    errorMessage: string | null,
    createdAt: Date | null
  ): AiUsageLog {
    return new AiUsageLog(
      id, userId, examId, submissionId, requestId, provider,
      actionType, modelUsed, promptTokens, completionTokens,
      costEstimate, durationMs, isSuccess, errorMessage, createdAt
    )
  }

  // ── Business Logic ──

  recordSuccess(params: {
    promptTokens: number
    completionTokens: number
    costEstimate: number
    durationMs: number
  }): void {
    this.isSuccess = true
    this.promptTokens = params.promptTokens
    this.completionTokens = params.completionTokens
    this.costEstimate = params.costEstimate
    this.durationMs = params.durationMs
  }

  recordFailure(errorMessage: string, durationMs?: number): void {
    this.isSuccess = false
    this.errorMessage = errorMessage
    if (durationMs !== undefined) this.durationMs = durationMs
  }

  getTotalTokens(): number {
    return (this.promptTokens ?? 0) + (this.completionTokens ?? 0)
  }
}
