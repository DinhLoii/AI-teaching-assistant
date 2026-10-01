// ──────────────────────────────────────────────────────────────
// Value Object: ProjectTypeComposition
// ──────────────────────────────────────────────────────────────

/**
 * Represents a parent-child relationship between project types.
 * Composite key: (parentProjectTypeId, childProjectTypeId).
 */
export class ProjectTypeComposition {
  readonly parentProjectTypeId: string
  readonly childProjectTypeId: string
  readonly role: string | null
  readonly isRequired: boolean | null
  readonly sortOrder: number | null

  private constructor(
    parentProjectTypeId: string,
    childProjectTypeId: string,
    role: string | null,
    isRequired: boolean | null,
    sortOrder: number | null
  ) {
    this.parentProjectTypeId = parentProjectTypeId
    this.childProjectTypeId = childProjectTypeId
    this.role = role
    this.isRequired = isRequired
    this.sortOrder = sortOrder
  }

  static create(
    parentProjectTypeId: string,
    childProjectTypeId: string,
    params?: {
      role?: string
      isRequired?: boolean
      sortOrder?: number
    }
  ): ProjectTypeComposition {
    return new ProjectTypeComposition(
      parentProjectTypeId, childProjectTypeId,
      params?.role ?? null,
      params?.isRequired ?? false,
      params?.sortOrder ?? null
    )
  }

  static restore(
    parentProjectTypeId: string,
    childProjectTypeId: string,
    role: string | null,
    isRequired: boolean | null,
    sortOrder: number | null
  ): ProjectTypeComposition {
    return new ProjectTypeComposition(parentProjectTypeId, childProjectTypeId, role, isRequired, sortOrder)
  }

  equals(other: ProjectTypeComposition): boolean {
    return (
      this.parentProjectTypeId === other.parentProjectTypeId &&
      this.childProjectTypeId === other.childProjectTypeId
    )
  }

  toJSON() {
    return {
      parentProjectTypeId: this.parentProjectTypeId,
      childProjectTypeId: this.childProjectTypeId,
      role: this.role,
      isRequired: this.isRequired,
      sortOrder: this.sortOrder,
    }
  }
}
