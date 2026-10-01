import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Entity: PromptTemplate
// ──────────────────────────────────────────────────────────────

/**
 * Represents a reusable prompt template for AI-powered exam generation.
 * Templates can be scoped to subjects and project types.
 */
export class PromptTemplate extends AggregateRoot {
  id: string
  name: string | null
  subjectId: string | null
  projectTypeId: string | null
  category: string | null
  templateContent: string | null
  placeholderSchema: string | null
  isDefault: boolean | null
  isActive: boolean | null
  usageCount: number | null
  createdBy: string | null

  private constructor(
    id: string,
    name: string | null,
    subjectId: string | null,
    projectTypeId: string | null,
    category: string | null,
    templateContent: string | null,
    placeholderSchema: string | null,
    isDefault: boolean | null,
    isActive: boolean | null,
    usageCount: number | null,
    createdBy: string | null
  ) {
    super()
    this.id = id
    this.name = name
    this.subjectId = subjectId
    this.projectTypeId = projectTypeId
    this.category = category
    this.templateContent = templateContent
    this.placeholderSchema = placeholderSchema
    this.isDefault = isDefault
    this.isActive = isActive
    this.usageCount = usageCount
    this.createdBy = createdBy
  }

  // ── Factory Methods ──

  static create(
    id: string,
    name: string,
    templateContent: string,
    createdBy: string,
    params?: {
      subjectId?: string
      projectTypeId?: string
      category?: string
      placeholderSchema?: string
      isDefault?: boolean
    }
  ): PromptTemplate {
    return new PromptTemplate(
      id, name,
      params?.subjectId ?? null,
      params?.projectTypeId ?? null,
      params?.category ?? null,
      templateContent,
      params?.placeholderSchema ?? null,
      params?.isDefault ?? false,
      true, 0, createdBy
    )
  }

  static restore(
    id: string,
    name: string | null,
    subjectId: string | null,
    projectTypeId: string | null,
    category: string | null,
    templateContent: string | null,
    placeholderSchema: string | null,
    isDefault: boolean | null,
    isActive: boolean | null,
    usageCount: number | null,
    createdBy: string | null
  ): PromptTemplate {
    return new PromptTemplate(
      id, name, subjectId, projectTypeId, category,
      templateContent, placeholderSchema, isDefault,
      isActive, usageCount, createdBy
    )
  }

  // ── Business Logic ──

  incrementUsage(): void {
    this.usageCount = (this.usageCount ?? 0) + 1
  }

  deactivate(): void {
    this.isActive = false
  }

  activate(): void {
    this.isActive = true
  }

  markAsDefault(): void {
    this.isDefault = true
  }

  updateContent(params: {
    templateContent?: string
    placeholderSchema?: string
    category?: string
  }): void {
    if (params.templateContent !== undefined) this.templateContent = params.templateContent
    if (params.placeholderSchema !== undefined) this.placeholderSchema = params.placeholderSchema
    if (params.category !== undefined) this.category = params.category
  }
}
