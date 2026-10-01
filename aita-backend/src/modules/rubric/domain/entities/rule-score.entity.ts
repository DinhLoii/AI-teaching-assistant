import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Entity: RuleScore
// ──────────────────────────────────────────────────────────────

/**
 * Represents the score for a rubric rule within an execution result.
 * Tracks both AI-generated and instructor-assigned scores.
 */
export class RuleScore extends AggregateRoot {
  id: string
  executionResultId: string | null
  rubricRuleId: string | null
  aiScore: number | null
  maxScore: number | null
  aiReasoning: string | null
  instructorScore: number | null
  instructorComment: string | null
  isOverridden: boolean | null
  effectiveScore: number | null

  private constructor(
    id: string,
    executionResultId: string | null,
    rubricRuleId: string | null,
    aiScore: number | null,
    maxScore: number | null,
    aiReasoning: string | null,
    instructorScore: number | null,
    instructorComment: string | null,
    isOverridden: boolean | null,
    effectiveScore: number | null
  ) {
    super()
    this.id = id
    this.executionResultId = executionResultId
    this.rubricRuleId = rubricRuleId
    this.aiScore = aiScore
    this.maxScore = maxScore
    this.aiReasoning = aiReasoning
    this.instructorScore = instructorScore
    this.instructorComment = instructorComment
    this.isOverridden = isOverridden
    this.effectiveScore = effectiveScore
  }

  // ── Factory Methods ──

  static create(
    id: string,
    executionResultId: string,
    rubricRuleId: string,
    maxScore: number
  ): RuleScore {
    return new RuleScore(
      id, executionResultId, rubricRuleId,
      null, maxScore, null, null, null, false, null
    )
  }

  static restore(
    id: string,
    executionResultId: string | null,
    rubricRuleId: string | null,
    aiScore: number | null,
    maxScore: number | null,
    aiReasoning: string | null,
    instructorScore: number | null,
    instructorComment: string | null,
    isOverridden: boolean | null,
    effectiveScore: number | null
  ): RuleScore {
    return new RuleScore(
      id, executionResultId, rubricRuleId, aiScore, maxScore,
      aiReasoning, instructorScore, instructorComment,
      isOverridden, effectiveScore
    )
  }

  // ── Business Logic ──

  setAiScore(score: number, reasoning: string): void {
    this.aiScore = score
    this.aiReasoning = reasoning
    if (!this.isOverridden) {
      this.effectiveScore = score
    }
  }

  overrideWithInstructorScore(score: number, comment?: string): void {
    this.instructorScore = score
    this.instructorComment = comment ?? null
    this.isOverridden = true
    this.effectiveScore = score
  }

  getScore(): number | null {
    return this.effectiveScore
  }
}
