// ──────────────────────────────────────────────────────────────
// Value Object: CriterionScore
// ──────────────────────────────────────────────────────────────

/**
 * Represents the score for a specific rubric criterion within a rule score.
 * Tracks both AI-generated and instructor-overridden scores.
 */
export class CriterionScore {
  readonly id: string
  readonly ruleScoreId: string | null
  readonly rubricCriterionId: string | null
  readonly aiScore: number | null
  readonly maxScore: number | null
  readonly aiReasoning: string | null
  readonly instructorScore: number | null
  readonly isOverridden: boolean | null
  readonly effectiveScore: number | null

  private constructor(
    id: string,
    ruleScoreId: string | null,
    rubricCriterionId: string | null,
    aiScore: number | null,
    maxScore: number | null,
    aiReasoning: string | null,
    instructorScore: number | null,
    isOverridden: boolean | null,
    effectiveScore: number | null
  ) {
    this.id = id
    this.ruleScoreId = ruleScoreId
    this.rubricCriterionId = rubricCriterionId
    this.aiScore = aiScore
    this.maxScore = maxScore
    this.aiReasoning = aiReasoning
    this.instructorScore = instructorScore
    this.isOverridden = isOverridden
    this.effectiveScore = effectiveScore
  }

  static create(
    id: string,
    ruleScoreId: string,
    rubricCriterionId: string,
    maxScore: number
  ): CriterionScore {
    return new CriterionScore(id, ruleScoreId, rubricCriterionId, null, maxScore, null, null, false, null)
  }

  static restore(
    id: string,
    ruleScoreId: string | null,
    rubricCriterionId: string | null,
    aiScore: number | null,
    maxScore: number | null,
    aiReasoning: string | null,
    instructorScore: number | null,
    isOverridden: boolean | null,
    effectiveScore: number | null
  ): CriterionScore {
    return new CriterionScore(id, ruleScoreId, rubricCriterionId, aiScore, maxScore, aiReasoning, instructorScore, isOverridden, effectiveScore)
  }

  equals(other: CriterionScore): boolean {
    return this.id === other.id
  }

  toJSON() {
    return {
      id: this.id,
      ruleScoreId: this.ruleScoreId,
      rubricCriterionId: this.rubricCriterionId,
      aiScore: this.aiScore,
      maxScore: this.maxScore,
      aiReasoning: this.aiReasoning,
      instructorScore: this.instructorScore,
      isOverridden: this.isOverridden,
      effectiveScore: this.effectiveScore,
    }
  }
}
