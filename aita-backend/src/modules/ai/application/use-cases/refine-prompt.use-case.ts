import { IAIService } from '../../../../shared/application/ports/ai-service.interface.js'
import { IAiRepository } from '../../domain/repositories/ai-repository.interface.js'

export class RefinePromptUseCase {
    constructor(
        private readonly aiService: IAIService,
        private readonly aiRepo: IAiRepository
    ) { }

    async execute(input: any) {
        const result = await this.aiService.refinePromptTemplate(input)
        if (input.userId) {
            await this.aiRepo.logInteraction(input.userId, 'prompt-refine', JSON.stringify(input), JSON.stringify(result))
        }
        return result
    }
}
