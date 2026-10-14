import { RagEngineService } from '../../infrastructure/rag/rag-engine.service.js'
import { RagDiagnoseInput, RagDiagnoseOutput } from '../../domain/rag/rag.types.js'

export class RagCodeDiagnosticsUseCase {
  constructor(private readonly ragEngine: RagEngineService = new RagEngineService()) {}

  async execute(input: RagDiagnoseInput): Promise<RagDiagnoseOutput> {
    return await this.ragEngine.diagnose(input)
  }
}
