import { PgVectorRubricService, SimilarRubricSearchResult } from '../../infrastructure/rag/pgvector-rubric.service.js'

export interface SearchSimilarRubricsInput {
  query: string
  subjectCode?: string
  language?: string
  category?: string
  topK?: number
  requestingUserId?: string
  requestingUserRole?: string
  contentType?: 'RUBRIC_OVERVIEW' | 'CRITERION'
}

export class SearchSimilarRubricsUseCase {
  constructor(private readonly pgVectorService: PgVectorRubricService) {}

  public async execute(input: SearchSimilarRubricsInput): Promise<SimilarRubricSearchResult[]> {
    if (!input.query || !input.query.trim()) {
      return []
    }

    return await this.pgVectorService.searchSimilarRubrics({
      query: input.query,
      topK: input.topK || 5,
      subjectCode: input.subjectCode,
      language: input.language,
      category: input.category,
      requestingUserId: input.requestingUserId,
      contentType: input.contentType,
    })
  }
}
