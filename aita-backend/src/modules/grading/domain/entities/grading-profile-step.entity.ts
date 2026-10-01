import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type EngineTypeValue =
  | 'StaticAnalysis'
  | 'DynamicTest'
  | 'HttpProbe'
  | 'AiCodeReview'
  | 'AiVision'
  | 'AiTextAnalysis'
  | 'Manual'

// ──────────────────────────────────────────────────────────────
// Entity: GradingProfileStep
// ──────────────────────────────────────────────────────────────

/**
 * Represents a single step in a grading profile pipeline.
 * Each step specifies an engine type, configuration, and execution order.
 */
export class GradingProfileStep extends AggregateRoot {
  id: string
  gradingProfileId: string | null
  engineType: EngineTypeValue | null
  stepOrder: number | null
  configJson: string | null
  isRequired: boolean | null
  timeoutSeconds: number | null

  private constructor(
    id: string,
    gradingProfileId: string | null,
    engineType: EngineTypeValue | null,
    stepOrder: number | null,
    configJson: string | null,
    isRequired: boolean | null,
    timeoutSeconds: number | null
  ) {
    super()
    this.id = id
    this.gradingProfileId = gradingProfileId
    this.engineType = engineType
    this.stepOrder = stepOrder
    this.configJson = configJson
    this.isRequired = isRequired
    this.timeoutSeconds = timeoutSeconds
  }

  // ── Factory Methods ──

  static create(
    id: string,
    gradingProfileId: string,
    engineType: EngineTypeValue,
    stepOrder: number,
    params?: {
      configJson?: string
      isRequired?: boolean
      timeoutSeconds?: number
    }
  ): GradingProfileStep {
    return new GradingProfileStep(
      id, gradingProfileId, engineType, stepOrder,
      params?.configJson ?? null,
      params?.isRequired ?? true,
      params?.timeoutSeconds ?? null
    )
  }

  static restore(
    id: string,
    gradingProfileId: string | null,
    engineType: EngineTypeValue | null,
    stepOrder: number | null,
    configJson: string | null,
    isRequired: boolean | null,
    timeoutSeconds: number | null
  ): GradingProfileStep {
    return new GradingProfileStep(
      id, gradingProfileId, engineType, stepOrder,
      configJson, isRequired, timeoutSeconds
    )
  }

  // ── Business Logic ──

  updateConfig(configJson: string): void {
    this.configJson = configJson
  }

  updateOrder(newOrder: number): void {
    this.stepOrder = newOrder
  }
}
