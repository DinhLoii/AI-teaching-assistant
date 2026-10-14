import { RagEngineService } from '../../infrastructure/rag/rag-engine.service.js'
import { RagAssessmentOutput } from '../../domain/rag/rag.types.js'

export class RagCodeAssessmentUseCase {
  constructor(private readonly ragEngine: RagEngineService = new RagEngineService()) {}

  async execute(submissionId: string): Promise<RagAssessmentOutput> {
    return await this.ragEngine.assess(submissionId)
  }
}
