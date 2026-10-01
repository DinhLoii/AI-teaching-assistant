import type { IPromptTemplateRepository } from '../../domain/repositories/prompt-template-repository.interface.js'

export class UpdatePromptUseCase {
  constructor(private readonly promptRepo: IPromptTemplateRepository) {}

  async execute(id: string, data: any) {
    return this.promptRepo.update(id, data)
  }
}
