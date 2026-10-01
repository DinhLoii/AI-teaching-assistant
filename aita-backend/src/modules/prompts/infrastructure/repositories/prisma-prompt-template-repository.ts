import type { IPromptTemplateRepository, PromptTemplateEntity } from '../../domain/repositories/prompt-template-repository.interface.js'

export class PrismaPromptTemplateRepository implements IPromptTemplateRepository {
  constructor(private readonly prisma: any) {}

  private mapToEntity(row: any): PromptTemplateEntity {
    return {
      id: row.Id,
      name: row.Name,
      subjectId: row.SubjectId,
      projectTypeId: row.ProjectTypeId,
      category: row.Category,
      templateContent: row.TemplateContent,
      placeholderSchema: row.PlaceholderSchema,
      isDefault: row.IsDefault,
      isActive: row.IsActive,
      usageCount: row.UsageCount,
      createdBy: row.CreatedBy,
    }
  }

  async findBySubjectId(subjectId: string): Promise<PromptTemplateEntity[]> {
    const rows = await this.prisma.promptTemplate.findMany({
      where: {
        OR: [
          { SubjectId: subjectId },
          { Subject: { SubjectCode: subjectId } }
        ]
      },
      orderBy: { Name: 'asc' }
    })
    return rows.map((r: any) => this.mapToEntity(r))
  }

  async findById(id: string): Promise<PromptTemplateEntity | null> {
    const row = await this.prisma.promptTemplate.findUnique({
      where: { Id: id }
    })
    return row ? this.mapToEntity(row) : null
  }

  async create(data: {
    name: string
    subjectId?: string
    projectTypeId?: string
    category?: string
    templateContent: string
    placeholderSchema?: string
    isDefault?: boolean
    isActive?: boolean
    createdBy?: string
  }): Promise<PromptTemplateEntity> {
    const row = await this.prisma.promptTemplate.create({
      data: {
        Name: data.name,
        SubjectId: data.subjectId || null,
        ProjectTypeId: data.projectTypeId || null,
        Category: data.category || 'Chung',
        TemplateContent: data.templateContent,
        PlaceholderSchema: data.placeholderSchema || null,
        IsDefault: data.isDefault ?? false,
        IsActive: data.isActive ?? true,
        UsageCount: 0,
        CreatedBy: data.createdBy || null,
      }
    })
    return this.mapToEntity(row)
  }

  async update(id: string, data: Partial<{
    name: string
    subjectId: string
    projectTypeId: string
    category: string
    templateContent: string
    placeholderSchema: string
    isDefault: boolean
    isActive: boolean
    usageCount: number
  }>): Promise<PromptTemplateEntity> {
    const updateData: any = {}
    if (data.name !== undefined) updateData.Name = data.name
    if (data.subjectId !== undefined) updateData.SubjectId = data.subjectId
    if (data.projectTypeId !== undefined) updateData.ProjectTypeId = data.projectTypeId
    if (data.category !== undefined) updateData.Category = data.category
    if (data.templateContent !== undefined) updateData.TemplateContent = data.templateContent
    if (data.placeholderSchema !== undefined) updateData.PlaceholderSchema = data.placeholderSchema
    if (data.isDefault !== undefined) updateData.IsDefault = data.isDefault
    if (data.isActive !== undefined) updateData.IsActive = data.isActive
    if (data.usageCount !== undefined) updateData.UsageCount = data.usageCount

    const row = await this.prisma.promptTemplate.update({
      where: { Id: id },
      data: updateData
    })
    return this.mapToEntity(row)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.promptTemplate.delete({
      where: { Id: id }
    })
  }

  async incrementUsage(id: string): Promise<void> {
    await this.prisma.promptTemplate.update({
      where: { Id: id },
      data: {
        UsageCount: { increment: 1 }
      }
    })
  }
}
