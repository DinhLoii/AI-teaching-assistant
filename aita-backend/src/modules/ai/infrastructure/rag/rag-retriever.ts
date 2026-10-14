import { RagChunk, RagDocumentType } from '../../domain/rag/rag.types.js'

export class RagRetriever {
  /**
   * Tokenize query and code strings into searchable terms.
   * Handles camelCase, snake_case, file extensions, and punctuation.
   */
  private tokenize(text: string): string[] {
    if (!text) return []
    // Split camelCase into separate tokens as well as keeping the full word
    const expanded = text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_\-./\\]/g, ' ')
      .toLowerCase()

    const rawTokens = expanded.split(/\W+/).filter(t => t.length > 2)
    return Array.from(new Set(rawTokens))
  }

  /**
   * Score and rank candidate chunks against query terms with BM25/TF-IDF heuristics.
   */
  retrieveRelevantChunks(query: string, candidateChunks: RagChunk[], topK = 7): RagChunk[] {
    if (!candidateChunks || candidateChunks.length === 0) return []

    const queryTokens = this.tokenize(query)
    const lowerQuery = query.toLowerCase()

    // Query intent flags
    const isErrorOrTestQuery = /lỗi|error|fail|exception|crash|test|bug|không chạy|chết/i.test(lowerQuery)
    const isRubricOrGradeQuery = /rubric|barem|điểm|tiêu chí|chấm|criteria|grade|score/i.test(lowerQuery)
    const isAssignmentSpecQuery = /đề bài|yêu cầu|spec|hạn|deadline|mô tả|bài tập/i.test(lowerQuery)
    const isCodeOrAlgorithmQuery = /code|mã|thuật toán|hàm|class|method|tối ưu|bst|tree|api|mvvm/i.test(lowerQuery)

    const scoredChunks = candidateChunks.map(chunk => {
      let score = 0
      const contentLower = chunk.content.toLowerCase()
      const titleLower = chunk.title.toLowerCase()

      // 1. Term frequency overlap
      let matches = 0
      for (const token of queryTokens) {
        if (titleLower.includes(token)) {
          matches += 3
        } else if (contentLower.includes(token)) {
          matches += 1
        }
      }
      score += matches * 10

      // 2. Exact phrase match bonus
      if (lowerQuery.length > 5 && contentLower.includes(lowerQuery)) {
        score += 40
      }

      // 3. Domain Intent Boosts
      if (isErrorOrTestQuery) {
        if (chunk.docType === RagDocumentType.EXECUTION_LOG) score += 35
        if (chunk.docType === RagDocumentType.TEST_SPECIFICATION) score += 25
      }

      if (isRubricOrGradeQuery) {
        if (chunk.docType === RagDocumentType.RUBRIC_CRITERIA) score += 35
      }

      if (isAssignmentSpecQuery) {
        if (chunk.docType === RagDocumentType.ASSIGNMENT_SPEC) score += 35
      }

      if (isCodeOrAlgorithmQuery) {
        if (chunk.docType === RagDocumentType.STUDENT_SOURCE_FILE) score += 25
        if (chunk.docType === RagDocumentType.REFERENCE_SOLUTION) score += 20
        if (chunk.docType === RagDocumentType.SYLLABUS_CONCEPT) score += 15
      }

      // 4. Inherent metadata weight
      const weight = chunk.metadata.importanceWeight || 1
      score += weight * 5

      return {
        ...chunk,
        score
      }
    })

    // Sort by score descending and take topK
    const sorted = scoredChunks
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, topK)

    return sorted
  }

  /**
   * Assemble retrieved chunks into a clean, structured context string for prompt injection.
   */
  assembleContext(chunks: RagChunk[], maxChars = 24000): {
    assembledContext: string
    sourcesUsed: Array<{ docType: RagDocumentType; title: string; sourceRef: string }>
  } {
    if (!chunks || chunks.length === 0) {
      return {
        assembledContext: 'Không có tài liệu ngữ cảnh bổ sung.',
        sourcesUsed: []
      }
    }

    const sourcesUsed: Array<{ docType: RagDocumentType; title: string; sourceRef: string }> = []
    let contextStr = '═══════════════════════════════════════════════════════════\n'
    contextStr += 'TÀI LIỆU NGỮ CẢNH ĐƯỢC HỆ THỐNG RAG TRÍCH XUẤT (GROUND TRUTH):\n'
    contextStr += '═══════════════════════════════════════════════════════════\n\n'

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const chunkHeader = `[TÀI LIỆU #${i + 1} | Loại: ${chunk.docType} | Nguồn: ${chunk.title}]\n`
      const chunkBody = `${chunk.content.trim()}\n\n---\n\n`

      if (contextStr.length + chunkHeader.length + chunkBody.length > maxChars) {
        contextStr += `\n[... Một số nội dung phụ được cắt gọn để tối ưu độ dài ngữ cảnh ...]\n`
        break
      }

      contextStr += chunkHeader + chunkBody
      sourcesUsed.push({
        docType: chunk.docType,
        title: chunk.title,
        sourceRef: chunk.sourceRef
      })
    }

    return {
      assembledContext: contextStr,
      sourcesUsed
    }
  }
}
