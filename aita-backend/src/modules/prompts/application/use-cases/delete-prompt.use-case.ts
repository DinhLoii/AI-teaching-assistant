import type { IPromptTemplateRepository } from '../../domain/repositories/prompt-template-repository.interface.js'

export class DeletePromptUseCase {
  constructor(private readonly promptRepo: IPromptTemplateRepository) {}

  async execute(id: string) {
    return this.promptRepo.delete(id)
  }
}
