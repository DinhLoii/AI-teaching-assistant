import type { IPromptTemplateRepository } from '../../domain/repositories/prompt-template-repository.interface.js'

export class IncrementPromptUsageUseCase {
  constructor(private readonly promptRepo: IPromptTemplateRepository) {}

  async execute(id: string) {
    return this.promptRepo.incrementUsage(id)
  }
}
