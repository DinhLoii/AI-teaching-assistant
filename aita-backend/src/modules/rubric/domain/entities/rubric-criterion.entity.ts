import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type ValidationTypeValue = 'AI' | 'Static' | 'Http' | 'Vision' | 'TestCase'

// ──────────────────────────────────────────────────────────────
// Entity: RubricCriterion
// ──────────────────────────────────────────────────────────────

/**
 * Represents a specific criterion within a rubric rule.
 * Each criterion defines a measurable aspect of the grading with validation.
 */
export class RubricCriterion extends AggregateRoot {
  id: string
  rubricRuleId: string | null
  description: string | null
  maxPoints: number | null
  weight: number | null
  validationType: ValidationTypeValue | null
  validationConfig: string | null
  isCritical: boolean | null
  sortOrder: number | null

  private constructor(
    id: string,
    rubricRuleId: string | null,
    description: string | null,
    maxPoints: number | null,
    weight: number | null,
    validationType: ValidationTypeValue | null,
    validationConfig: string | null,
    isCritical: boolean | null,
    sortOrder: number | null
  ) {
    super()
    this.id = id
    this.rubricRuleId = rubricRuleId
    this.description = description
    this.maxPoints = maxPoints
    this.weight = weight
    this.validationType = validationType
    this.validationConfig = validationConfig
    this.isCritical = isCritical
    this.sortOrder = sortOrder
  }

  // ── Factory Methods ──

  static create(
    id: string,
    rubricRuleId: string,
    description: string,
    params?: {
      maxPoints?: number
      weight?: number
      validationType?: ValidationTypeValue
      validationConfig?: string
      isCritical?: boolean
      sortOrder?: number
    }
  ): RubricCriterion {
    return new RubricCriterion(
      id, rubricRuleId, description,
      params?.maxPoints ?? null,
      params?.weight ?? null,
      params?.validationType ?? null,
      params?.validationConfig ?? null,
      params?.isCritical ?? false,
      params?.sortOrder ?? null
    )
  }

  static restore(
    id: string,
    rubricRuleId: string | null,
    description: string | null,
    maxPoints: number | null,
    weight: number | null,
    validationType: ValidationTypeValue | null,
    validationConfig: string | null,
    isCritical: boolean | null,
    sortOrder: number | null
  ): RubricCriterion {
    return new RubricCriterion(
      id, rubricRuleId, description, maxPoints, weight,
      validationType, validationConfig, isCritical, sortOrder
    )
  }

  // ── Business Logic ──

  updateInfo(params: {
    description?: string
    maxPoints?: number
    weight?: number
    validationConfig?: string
  }): void {
    if (params.description !== undefined) this.description = params.description
    if (params.maxPoints !== undefined) this.maxPoints = params.maxPoints
    if (params.weight !== undefined) this.weight = params.weight
    if (params.validationConfig !== undefined) this.validationConfig = params.validationConfig
  }
}
