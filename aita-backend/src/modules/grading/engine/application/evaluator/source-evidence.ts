type SourceFile = { relativePath: string; content: string; fileId?: string }

/** Match archive paths consistently on Windows/Linux; reject traversal and ambiguous basenames. */
export function normalizeSourcePath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const path = value.trim().replaceAll('\\', '/')
  if (/^[a-z]:|^[a-z]+:\/\//i.test(path) || path.includes('\u0000')) return null
  const parts = path.split('/').filter(part => part !== '' && part !== '.')
  if (!parts.length || parts.includes('..')) return null
  return parts.join('/')
}

function referencedFile(files: SourceFile[], path: unknown, fileId?: unknown): SourceFile | null {
  const idMatches = typeof fileId === 'string' ? files.filter(file => file.fileId === fileId) : []
  if (typeof fileId === 'string' && idMatches.length !== 1) return null
  const requested = normalizeSourcePath(path)
  if (!requested) return path == null && idMatches.length === 1 ? idMatches[0] : null
  const exact = files.filter(file => normalizeSourcePath(file.relativePath) === requested)
  const matches = exact.length ? exact : files.filter(file => {
    const actual = normalizeSourcePath(file.relativePath)
    return actual && (actual.endsWith('/' + requested) || requested.endsWith('/' + actual))
  })
  if (matches.length !== 1 || (idMatches.length && idMatches[0] !== matches[0])) return null
  return matches[0]
}

const lineNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null
  return typeof value === 'string' && /^(?:L)?\d+$/.test(value) ? Number(value.replace(/^L/, '')) : null
}

export function verifiedSourceSnippets(files: SourceFile[], snippets: any[]): any[] {
  // Ignore formatting outside literals, preserving identifiers, operators and quoted values.
  const tokens = (text: string) => '\u0000' + (text.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[\p{L}\p{N}_$]+|===|!==|==|!=|<=|>=|&&|\|\||=>|->|\?\.|\?:|[^\s]/gu) || []).join('\u0000') + '\u0000'
  return (Array.isArray(snippets) ? snippets : []).flatMap(snippet => {
    const match = referencedFile(files, snippet?.filePath, snippet?.fileId)
    if (!match) return []
    const startLine = lineNumber(snippet.startLine), endLine = lineNumber(snippet.endLine)
    if (startLine !== null && endLine !== null) {
      const lines = match.content.split(/\r?\n/)
      if (startLine > 0 && endLine >= startLine && endLine <= lines.length && endLine - startLine < 40) {
        const codeSnippet = lines.slice(startLine - 1, endLine).join('\n')
        if (codeSnippet.trim()) return [{ ...snippet, startLine, endLine, filePath: normalizeSourcePath(match.relativePath), codeSnippet, verification: 'source_line_range' }]
      }
      return []
    }
    if (typeof snippet.codeSnippet !== 'string' || !snippet.codeSnippet.trim()) return []
    return tokens(match.content).includes(tokens(snippet.codeSnippet)) ? [{ ...snippet, filePath: normalizeSourcePath(match.relativePath) }] : []
  })
}

export function resolveCodeReviewResult(files: SourceFile[], result: any): any {
  if (!result || typeof result.percentageComplete !== 'number' || !Number.isFinite(result.percentageComplete) || result.percentageComplete < 0 || result.percentageComplete > 1 || typeof result.reasoning !== 'string' || !result.reasoning.trim()) {
    throw new Error('AI_REVIEW_INVALID: AI chưa trả kết quả chấm hợp lệ theo tiêu chí.')
  }
  const rawSnippets = Array.isArray(result.relevantSnippets) ? result.relevantSnippets : []
  let snippets = verifiedSourceSnippets(files, rawSnippets).slice(0, 10)
  let reviewWarning = result.reviewWarning
  if (!snippets.length && result.percentageComplete > 0) {
    const references = [...(Array.isArray(result.relevantFiles) ? result.relevantFiles : []), ...rawSnippets.map((snippet: any) => ({ filePath: snippet?.filePath, fileId: snippet?.fileId }))]
    snippets = referencedSourceSnippets(files, references)
    if (snippets.length) reviewWarning = 'Đã lấy mã gốc từ tệp AI tham chiếu trong ZIP. Giảng viên cần kiểm tra điểm đề xuất vì AI chưa chỉ được đoạn mã chính xác.'
  }
  if (result.percentageComplete > 0 && !snippets.length) {
    throw new Error('AI_CODE_EVIDENCE_MISSING: AI chưa chỉ ra mã nguồn hợp lệ trong ZIP để xác minh điểm.')
  }
  return { ...result, passed: result.percentageComplete >= 0.9, relevantSnippets: snippets, ...(reviewWarning ? { reviewWarning } : {}) }
}

export function referencedSourceSnippets(files: SourceFile[], paths: unknown): any[] {
  if (!Array.isArray(paths)) return []
  const seen = new Set<SourceFile>()
  return paths.flatMap(reference => {
    const match = typeof reference === 'string' ? referencedFile(files, reference) : referencedFile(files, reference?.filePath, reference?.fileId)
    if (!match || seen.has(match) || seen.size >= 3 || !match.content.trim()) return []
    seen.add(match)
    return [{ filePath: normalizeSourcePath(match.relativePath), codeSnippet: match.content.slice(0, 6000), explanation: 'Mã trích trực tiếp từ tệp AI tham chiếu trong ZIP. Giảng viên cần đối chiếu nhận xét với tiêu chí.', verification: 'source_file_reference' }]
  })
}
