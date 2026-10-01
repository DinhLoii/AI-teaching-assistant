export interface PromptTemplateEntity {
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
}

export interface IPromptTemplateRepository {
  findBySubjectId(subjectId: string): Promise<PromptTemplateEntity[]>
  findById(id: string): Promise<PromptTemplateEntity | null>
  create(data: {
    name: string
    subjectId?: string
    projectTypeId?: string
    category?: string
    templateContent: string
    placeholderSchema?: string
    isDefault?: boolean
    isActive?: boolean
    createdBy?: string
  }): Promise<PromptTemplateEntity>
  update(id: string, data: Partial<{
    name: string
    subjectId: string
    projectTypeId: string
    category: string
    templateContent: string
    placeholderSchema: string
    isDefault: boolean
    isActive: boolean
    usageCount: number
  }>): Promise<PromptTemplateEntity>
  delete(id: string): Promise<void>
  incrementUsage(id: string): Promise<void>
}
