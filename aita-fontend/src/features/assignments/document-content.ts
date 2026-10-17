/** Read legacy HTML as text; the document viewer never executes lecturer-supplied markup. */
export function readableAssignmentText(content: unknown): string {
  if (typeof content !== 'string') return ''
  if (!/<(?:p|div|h[1-6]|ul|ol|table|br)\b/i.test(content)) return content
  return content.replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<h([1-6])\b[^>]*>/gi, (_, level) => '\n' + '#'.repeat(Number(level)) + ' ')
    .replace(/<li\b[^>]*>/gi, '\n- ').replace(/<br\s*\/?\s*>|<\/(?:p|div|h[1-6]|li|tr|table)>/gi, '\n')
    .replace(/<\/(?:td|th)>/gi, ' | ').replace(/<[^>]*>/g, '')
    .replaceAll('&nbsp;', ' ').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&')
    .replace(/\n{3,}/g, '\n\n').trim()
}
export function assignmentDocumentContent(summary: any, grading?: any): string {
  const candidates = [summary?.documentContent, summary?.description, grading?.metadata?.content, summary?.content, grading?.metadata?.description]
  return candidates.find(value => typeof value === 'string' && value.trim() && !/^Barem tiêu chí chấm điểm tự động và AI\.?$/i.test(value.trim())) || ''
}
