import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type AssignmentTypeValue = 'Coding' | 'API' | 'Fullstack' | 'Mobile' | 'Diagram' | 'Algorithm' | 'GameDev' | 'WinForm'

// ──────────────────────────────────────────────────────────────
// Entity: AssignmentTemplate
// ──────────────────────────────────────────────────────────────

/**
 * Represents a reusable assignment template that can be used to create exams.
 */
export class AssignmentTemplate extends AggregateRoot {
  id: string
  subjectId: string | null
  name: string | null
  description: string | null
  assignmentType: AssignmentTypeValue | null
  defaultGradingProfileId: string | null
  defaultProjectTypeId: string | null
  sortOrder: number | null
  isActive: boolean | null

  private constructor(
    id: string,
    subjectId: string | null,
    name: string | null,
    description: string | null,
    assignmentType: AssignmentTypeValue | null,
    defaultGradingProfileId: string | null,
    defaultProjectTypeId: string | null,
    sortOrder: number | null,
    isActive: boolean | null
  ) {
    super()
    this.id = id
    this.subjectId = subjectId
    this.name = name
    this.description = description
    this.assignmentType = assignmentType
    this.defaultGradingProfileId = defaultGradingProfileId
    this.defaultProjectTypeId = defaultProjectTypeId
    this.sortOrder = sortOrder
    this.isActive = isActive
  }

  // ── Factory Methods ──

  static create(
    id: string,
    name: string,
    assignmentType: AssignmentTypeValue,
    params?: {
      subjectId?: string
      description?: string
      defaultGradingProfileId?: string
      defaultProjectTypeId?: string
      sortOrder?: number
    }
  ): AssignmentTemplate {
    return new AssignmentTemplate(
      id,
      params?.subjectId ?? null,
      name,
      params?.description ?? null,
      assignmentType,
      params?.defaultGradingProfileId ?? null,
      params?.defaultProjectTypeId ?? null,
      params?.sortOrder ?? null,
      true
    )
  }

  static restore(
    id: string,
    subjectId: string | null,
    name: string | null,
    description: string | null,
    assignmentType: AssignmentTypeValue | null,
    defaultGradingProfileId: string | null,
    defaultProjectTypeId: string | null,
    sortOrder: number | null,
    isActive: boolean | null
  ): AssignmentTemplate {
    return new AssignmentTemplate(
      id, subjectId, name, description, assignmentType,
      defaultGradingProfileId, defaultProjectTypeId, sortOrder, isActive
    )
  }

  // ── Business Logic ──

  deactivate(): void {
    this.isActive = false
  }

  activate(): void {
    this.isActive = true
  }

  updateInfo(params: {
    name?: string
    description?: string
    assignmentType?: AssignmentTypeValue
  }): void {
    if (params.name !== undefined) this.name = params.name
    if (params.description !== undefined) this.description = params.description
    if (params.assignmentType !== undefined) this.assignmentType = params.assignmentType
  }
}
