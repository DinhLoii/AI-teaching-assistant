import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Entity: RubricRule
// ──────────────────────────────────────────────────────────────

/**
 * Represents a rubric rule within an exam section.
 * Each rule defines a grading criterion with evaluation prompts and scoring.
 */
export class RubricRule extends AggregateRoot {
  id: string
  sectionId: string | null
  ruleCode: string | null
  description: string | null
  maxPoints: number | null
  evaluationPrompt: string | null
  referenceAnswer: string | null
  requireImageEvidence: boolean | null
  requireCodeEvidence: boolean | null
  isManualOnly: boolean | null
  sortOrder: number | null

  private constructor(
    id: string,
    sectionId: string | null,
    ruleCode: string | null,
    description: string | null,
    maxPoints: number | null,
    evaluationPrompt: string | null,
    referenceAnswer: string | null,
    requireImageEvidence: boolean | null,
    requireCodeEvidence: boolean | null,
    isManualOnly: boolean | null,
    sortOrder: number | null
  ) {
    super()
    this.id = id
    this.sectionId = sectionId
    this.ruleCode = ruleCode
    this.description = description
    this.maxPoints = maxPoints
    this.evaluationPrompt = evaluationPrompt
    this.referenceAnswer = referenceAnswer
    this.requireImageEvidence = requireImageEvidence
    this.requireCodeEvidence = requireCodeEvidence
    this.isManualOnly = isManualOnly
    this.sortOrder = sortOrder
  }

  // ── Factory Methods ──

  static create(
    id: string,
    sectionId: string,
    ruleCode: string,
    description: string,
    params?: {
      maxPoints?: number
      evaluationPrompt?: string
      referenceAnswer?: string
      requireImageEvidence?: boolean
      requireCodeEvidence?: boolean
      isManualOnly?: boolean
      sortOrder?: number
    }
  ): RubricRule {
    return new RubricRule(
      id, sectionId, ruleCode, description,
      params?.maxPoints ?? null,
      params?.evaluationPrompt ?? null,
      params?.referenceAnswer ?? null,
      params?.requireImageEvidence ?? false,
      params?.requireCodeEvidence ?? false,
      params?.isManualOnly ?? false,
      params?.sortOrder ?? null
    )
  }

  static restore(
    id: string,
    sectionId: string | null,
    ruleCode: string | null,
    description: string | null,
    maxPoints: number | null,
    evaluationPrompt: string | null,
    referenceAnswer: string | null,
    requireImageEvidence: boolean | null,
    requireCodeEvidence: boolean | null,
    isManualOnly: boolean | null,
    sortOrder: number | null
  ): RubricRule {
    return new RubricRule(
      id, sectionId, ruleCode, description, maxPoints,
      evaluationPrompt, referenceAnswer, requireImageEvidence,
      requireCodeEvidence, isManualOnly, sortOrder
    )
  }

  // ── Business Logic ──

  updateInfo(params: {
    description?: string
    maxPoints?: number
    evaluationPrompt?: string
    referenceAnswer?: string
  }): void {
    if (params.description !== undefined) this.description = params.description
    if (params.maxPoints !== undefined) this.maxPoints = params.maxPoints
    if (params.evaluationPrompt !== undefined) this.evaluationPrompt = params.evaluationPrompt
    if (params.referenceAnswer !== undefined) this.referenceAnswer = params.referenceAnswer
  }
}
