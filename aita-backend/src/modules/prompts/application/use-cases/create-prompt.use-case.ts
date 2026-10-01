import type { IPromptTemplateRepository } from '../../domain/repositories/prompt-template-repository.interface.js'

export class CreatePromptUseCase {
  constructor(private readonly promptRepo: IPromptTemplateRepository) {}

  async execute(data: {
    name: string
    subjectId?: string
    projectTypeId?: string
    category?: string
    templateContent: string
    placeholderSchema?: string
    isDefault?: boolean
    isActive?: boolean
    createdBy?: string
  }) {
    return this.promptRepo.create(data)
  }
}
