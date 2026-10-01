import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Entity: GradingProfile
// ──────────────────────────────────────────────────────────────

/**
 * Defines a grading pipeline profile with ordered steps.
 * Each profile is associated with a project type and contains
 * a sequence of GradingProfileSteps that define the grading workflow.
 */
export class GradingProfile extends AggregateRoot {
  id: string
  name: string | null
  projectTypeId: string | null
  description: string | null
  isActive: boolean | null

  private constructor(
    id: string,
    name: string | null,
    projectTypeId: string | null,
    description: string | null,
    isActive: boolean | null
  ) {
    super()
    this.id = id
    this.name = name
    this.projectTypeId = projectTypeId
    this.description = description
    this.isActive = isActive
  }

  // ── Factory Methods ──

  static create(
    id: string,
    name: string,
    projectTypeId: string,
    description?: string
  ): GradingProfile {
    return new GradingProfile(id, name, projectTypeId, description ?? null, true)
  }

  static restore(
    id: string,
    name: string | null,
    projectTypeId: string | null,
    description: string | null,
    isActive: boolean | null
  ): GradingProfile {
    return new GradingProfile(id, name, projectTypeId, description, isActive)
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
  }): void {
    if (params.name !== undefined) this.name = params.name
    if (params.description !== undefined) this.description = params.description
  }
}
