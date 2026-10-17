export function verifiedSourceSnippets(files: { relativePath: string; content: string }[], snippets: any[]): any[] {
  // Ignore formatting outside literals, preserving identifiers, operators and quoted values.
  const tokens = (text: string) => '\u0000' + (text.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[\p{L}\p{N}_$]+|===|!==|==|!=|<=|>=|&&|\|\||=>|->|\?\.|\?:|[^\s]/gu) || []).join('\u0000') + '\u0000'
  return (Array.isArray(snippets) ? snippets : []).flatMap(snippet => {
    if (typeof snippet?.filePath !== 'string') return []
    const requested = snippet.filePath.replaceAll('\\', '/').replace(/^\/+/, '')
    if (requested.split('/').includes('..')) return []
    const matches = files.filter(file => file.relativePath.replaceAll('\\', '/') === requested || file.relativePath.replaceAll('\\', '/').endsWith('/' + requested) || requested.endsWith('/' + file.relativePath.replaceAll('\\', '/')))
    if (matches.length === 1 && Number.isInteger(snippet.startLine) && Number.isInteger(snippet.endLine)) {
      const lines = matches[0].content.split(/\r?\n/)
      if (snippet.startLine > 0 && snippet.endLine >= snippet.startLine && snippet.endLine <= lines.length && snippet.endLine - snippet.startLine < 40) {
        const codeSnippet = lines.slice(snippet.startLine - 1, snippet.endLine).join('\n')
        if (codeSnippet.trim()) return [{ ...snippet, filePath: matches[0].relativePath, codeSnippet, verification: 'source_line_range' }]
      }
      return []
    }
    if (typeof snippet.codeSnippet !== 'string' || !snippet.codeSnippet.trim()) return []
    return matches.length === 1 && tokens(matches[0].content).includes(tokens(snippet.codeSnippet)) ? [{ ...snippet, filePath: matches[0].relativePath }] : []
  })
}

export function resolveCodeReviewResult(files: { relativePath: string; content: string }[], result: any): any {
  if (!result || typeof result.percentageComplete !== 'number' || !Number.isFinite(result.percentageComplete) || result.percentageComplete < 0 || result.percentageComplete > 1 || typeof result.reasoning !== 'string' || !result.reasoning.trim()) {
    throw new Error('AI_REVIEW_INVALID: AI chưa trả kết quả chấm hợp lệ theo tiêu chí.')
  }
  const rawSnippets = Array.isArray(result.relevantSnippets) ? result.relevantSnippets : []
  let snippets = verifiedSourceSnippets(files, rawSnippets).slice(0, 10)
  let reviewWarning = result.reviewWarning
  if (!snippets.length && result.percentageComplete > 0) {
    const references = [...(Array.isArray(result.relevantFiles) ? result.relevantFiles : []), ...rawSnippets.map((snippet: any) => snippet?.filePath)]
    snippets = referencedSourceSnippets(files, references)
    if (snippets.length) reviewWarning = 'Đã lấy mã gốc từ tệp AI tham chiếu trong ZIP. Giảng viên cần kiểm tra điểm đề xuất vì AI chưa chỉ được đoạn mã chính xác.'
  }
  if (result.percentageComplete > 0 && !snippets.length) {
    throw new Error('AI_CODE_EVIDENCE_MISSING: AI chưa chỉ ra mã nguồn hợp lệ trong ZIP để xác minh điểm.')
  }
  return { ...result, passed: result.percentageComplete >= 0.9, relevantSnippets: snippets, ...(reviewWarning ? { reviewWarning } : {}) }
}

export function referencedSourceSnippets(files: { relativePath: string; content: string }[], paths: unknown): any[] {
  if (!Array.isArray(paths)) return []
  return paths.slice(0, 3).flatMap(path => {
    if (typeof path !== 'string') return []
    const requested = path.replaceAll('\\', '/').replace(/^\/+/, '')
    if (requested.split('/').includes('..')) return []
    const matches = files.filter(file => file.relativePath === requested || file.relativePath.endsWith('/' + requested) || requested.endsWith('/' + file.relativePath))
    if (matches.length !== 1) return []
    return [{ filePath: matches[0].relativePath, codeSnippet: matches[0].content.slice(0, 6000), explanation: 'Mã trích trực tiếp từ tệp AI tham chiếu trong ZIP. Giảng viên cần đối chiếu nhận xét với tiêu chí.', verification: 'source_file_reference' }]
  })
}
