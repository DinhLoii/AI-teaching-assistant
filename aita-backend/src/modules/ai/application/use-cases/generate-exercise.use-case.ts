import { IAIService } from '../../../../shared/application/ports/ai-service.interface.js'
import { IAiRepository } from '../../domain/repositories/ai-repository.interface.js'

export class GenerateExerciseUseCase {
    constructor(
        private readonly aiService: IAIService,
        private readonly aiRepo: IAiRepository
    ) { }

    async execute(input: any) {
        const result = await this.aiService.generateExercise(input)
        // Log interaction if possible (e.g., if we have a userId)
        if (input.userId) {
            await this.aiRepo.logInteraction(input.userId, 'exercise-gen', JSON.stringify(input), JSON.stringify(result))
        }
        return result
    }
}
