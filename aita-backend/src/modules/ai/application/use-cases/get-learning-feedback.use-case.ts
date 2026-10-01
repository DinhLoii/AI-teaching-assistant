import { IAIService } from '../../../../shared/application/ports/ai-service.interface.js'
import { IAiRepository } from '../../domain/repositories/ai-repository.interface.js'

export class GetLearningFeedbackUseCase {
    constructor(
        private readonly aiService: IAIService,
        private readonly aiRepo: IAiRepository
    ) { }

    async execute(userId: string) {
        const result = await this.aiService.learningFeedback(userId)
        await this.aiRepo.logInteraction(userId, 'learning-feedback', userId, JSON.stringify(result))
        return result
    }
}
