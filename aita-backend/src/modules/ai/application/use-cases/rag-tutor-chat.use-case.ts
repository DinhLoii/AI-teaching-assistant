import { RagEngineService } from '../../infrastructure/rag/rag-engine.service.js'
import { RagChatInput, RagChatOutput } from '../../domain/rag/rag.types.js'

export class RagTutorChatUseCase {
  constructor(private readonly ragEngine: RagEngineService = new RagEngineService()) {}

  async execute(input: RagChatInput): Promise<RagChatOutput> {
    return await this.ragEngine.chat(input)
  }
}
