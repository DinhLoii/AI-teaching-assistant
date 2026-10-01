import { IAIService } from '../../../../shared/application/ports/ai-service.interface.js'
import { ILogger } from '../../../../shared/application/ports/logger.interface.js'

export interface GenerateRubricDto {
  topic: string
  difficulty?: string
  totalScore?: number
  file?: {
    filename: string
    buffer: Buffer
    mimetype: string
  }
}

export class GenerateRubricUseCase {
  constructor(
    private readonly aiService: IAIService,
    private readonly logger: ILogger
  ) {}

  async execute(dto: GenerateRubricDto) {
    this.logger.info(`[GenerateRubricUseCase] Generating rubric for topic: ${dto.topic}`)

    if (!dto.topic) {
      throw new Error('Topic is required for rubric generation')
    }

    try {
      const rubric = await this.aiService.generateRubric({
        topic: dto.topic,
        difficulty: dto.difficulty,
        totalScore: dto.totalScore,
        file: dto.file
      })
      
      return rubric
    } catch (error) {
      this.logger.error(`[GenerateRubricUseCase] Failed to generate rubric: ${(error as Error).message}`)
      throw error
    }
  }
}
