import type { IPromptTemplateRepository } from '../../domain/repositories/prompt-template-repository.interface.js'

export class ListPromptsBySubjectUseCase {
  constructor(private readonly promptRepo: IPromptTemplateRepository) {}

  async execute(subjectId: string) {
    return this.promptRepo.findBySubjectId(subjectId)
  }
}
