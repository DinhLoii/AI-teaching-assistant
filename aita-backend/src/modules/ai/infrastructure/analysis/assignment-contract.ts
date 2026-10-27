import type { AdaptiveAnalysisOutput, AnalyzedRubricCriterion } from '../../domain/analysis/analysis.types.js'

export const assignmentLanguages = ['C', 'C++', 'Java', 'Python', 'SQL', 'C#', 'JavaScript', 'TypeScript', 'Kotlin', 'Dart', 'Swift', 'Go', 'Rust', 'PHP', 'Unknown'] as const
const languagePatterns: [string, RegExp][] = [
  ['Kotlin', /\bkotlin\b/i], ['Dart', /\bdart\b/i], ['Swift', /\bswift\b/i],
  ['TypeScript', /\btypescript\b/i], ['JavaScript', /\bjavascript\b/i],
  ['C++', /c\+\+|\bcpp\b/i], ['C#', /c#|\bcsharp\b/i], ['Python', /\bpython(?:3)?\b/i],
  ['Java', /\bjava\b/i], ['SQL', /\bsql\b/i], ['Go', /\bgolang\b|^go$/i], ['Rust', /\brust\b/i], ['PHP', /\bphp\b/i], ['C', /^c(?=$|[\s(])|^c(?:99|11|17|23)\b|\bansi c\b/i],
]
export function detectAssignmentProfile(text: string, filename = '') {
  const normalized = text.replaceAll('\r\n', '\n')
  const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean)
  const excludedQuotes = new Set(extractAssignmentRequirements(normalized).filter(row => row.level === 'excluded').map(row => row.sourceQuote))
  const positive = lines.filter(line => !excludedQuotes.has(line) && !/không bắt buộc|not required|optional|không yêu cầu/i.test(line)).join('\n')
  const explicit = positive.match(/(?:ngôn ngữ(?: lập trình)?|programming language|language)\s*[:|\n]+\s*([^\n|]+)/i)?.[1]?.trim()
  const extensions: Record<string, string> = { kt: 'Kotlin', kts: 'Kotlin', dart: 'Dart', swift: 'Swift', cpp: 'C++', cc: 'C++', c: 'C', cs: 'C#', java: 'Java', py: 'Python', sql: 'SQL', js: 'JavaScript', ts: 'TypeScript', go: 'Go', rs: 'Rust', php: 'PHP' }
  const direct = extensions[filename.split('.').pop()?.toLowerCase() || '']
  const mobile = /\bandroid\b|jetpack compose|\bflutter\b|\bios\b|swiftui/i.test(positive)
  const web = /spring boot|servlets?|asp\.net|\breact\b|\bnext\.js\b|\bdjango\b|\blaravel\b|ứng dụng web|web application|rest api|backend|frontend/i.test(positive)
  const desktop = /\bwpf\b|winforms|javafx|ứng dụng desktop/i.test(positive)
  // A later clause such as "compiler GCC; không chọn SQL" must not override "C (C11)".
  const explicitLang = explicit ? languagePatterns.find(([, pattern]) => pattern.test(explicit.split(/[;,]/)[0]))?.[0] : undefined
  let language = direct || explicitLang
  if (!language) {
    language = languagePatterns.filter(([name]) => name !== 'SQL' && name !== 'C').find(([, pattern]) => pattern.test(positive))?.[0]
  }
  if (!language && !mobile && !web && !desktop && /\bsql\b|\bselect\b[\s\S]*?\bfrom\b|\bcreate table\b/i.test(positive)) language = 'SQL'
  if (!language && /(?:ngôn ngữ|lập trình|programming)\s+c(?:\s|$)/i.test(positive)) language = 'C'
  if (!language && /\bnode\.js\b/i.test(positive)) language = 'JavaScript'
  if (!language && /asp\.net/i.test(positive)) language = 'C#'
  language ||= 'Unknown'
  const mode = mobile || web || desktop ? 'project' : language === 'SQL' ? 'sql' : /stdin|stdout|console|dòng lệnh|standard input|standard output|đầu vào|input\s*[:\n]/i.test(positive) ? 'console' : 'unknown'
  const platform = mobile ? (/flutter/i.test(positive) ? 'Flutter' : /android/i.test(positive) ? 'Android' : 'iOS') : web ? 'Web' : desktop ? 'Desktop' : mode === 'sql' ? 'Database' : mode === 'console' ? 'Console' : 'Chưa xác định'
  const evidence = explicitLang ? explicit! : direct ? filename : lines.find(line => languagePatterns.find(([name]) => name === language)?.[1].test(line)) || ''
  return { language, platform, mode, evidence, reviewNeeded: language === 'Unknown' || mode === 'unknown' }
}

export interface SourceRequirement { text: string; sourceQuote: string; level: 'required' | 'advanced' | 'excluded' }
export interface AcceptanceScenario { id: string; steps: string; expectedResult: string; sourceQuote: string; level: 'required' | 'advanced'; execution: 'manual_review' }
const normalize = (text: string) => text.replaceAll('\r\n', '\n').replace(/\s+/g, ' ').trim()
export function isRubricSummaryLine(line: string): boolean {
  const label = line.trim().replace(/^(?:#{1,6}\s*)?(?:(?:\d+|[IVXLCDM]+)[.)]\s*)?/i, '').replace(/^\|\s*/, '')
  return /^(?:thang\s*điểm|barem|rubric|grading criteria|marking scheme|tiêu chí chấm điểm|tổng(?:\s+cộng)?(?:\s+điểm)?|total(?:\s+(?:points?|marks?|score))?)(?=$|[\s:|(])/i.test(label)
}
export function extractDocumentRubric(text: string): AnalyzedRubricCriterion[] {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  const start = lines.findIndex(line => /^(?:#{1,6}\s*)?(?:\d+\.\s*)?(?:rubric|barem|grading criteria|marking scheme|tiêu chí chấm điểm)/i.test(line))
  if (start < 0) return []
  const criteria: AnalyzedRubricCriterion[] = []
  const numeric = /^(\d+(?:[.,]\d+)?)\s*(?:điểm|đ|points?|marks?)?$/i
  const add = (name: string, points: string, description: string, evidence: string) => {
    if (isRubricSummaryLine(name)) return
    if (/^(?:tổng|total|hạng mục|điểm|tiêu chí|stt)/i.test(name)) return
    criteria.push({ id: `rubric-source-${criteria.length + 1}`, name, description, maxPoints: Number(points.replace(',', '.')), method: 'ai_assessment', passCondition: description, failCondition: 'Không đáp ứng tiêu chí gốc; cần nêu bằng chứng từ bài nộp.', aiGuidance: `Chỉ chấm theo tiêu chí gốc: ${description}. Không bổ sung yêu cầu ngoài đề.`, source: 'EXTRACTED', evidence, reviewNeeded: false })
  }
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]
    if (/^(?:#{1,6}\s*)?(?:\d+\.\s*)?(?:tổng\b|total\b|quy định|quy trình|submission|(?:yêu cầu|hướng dẫn)\s+nộp|diễn giải)/i.test(line)) break
    if (line.includes('|') || line.includes('\t')) {
      const cols = line.split(/\||\t/).map(value => value.trim()).filter(Boolean)
      if (cols.length >= 3 && /^\d+[.)]?$/.test(cols[0])) cols.shift()
      const pointIndex = cols.findIndex(value => numeric.test(value))
      if (pointIndex > 0) add(cols[0], cols[pointIndex].match(numeric)![1], cols.filter((_, index) => index !== pointIndex && index !== 0).join(' | ') || cols[0], line)
    } else if (line.length > 5 && numeric.test(lines[i + 1] || '')) {
      const point = lines[i + 1].match(numeric)![1]
      const hasDescription = !!lines[i + 2] && !numeric.test(lines[i + 3] || '') && !/^(?:tổng|total|\d+\.\s)/i.test(lines[i + 2])
      const description = hasDescription ? lines[i + 2] : line
      add(line, point, description, [line, lines[i + 1], ...(hasDescription ? [description] : [])].join('\n'))
      i += hasDescription ? 2 : 1
    }
  }
  return criteria
}
export function extractAssignmentRequirements(text: string): SourceRequirement[] {
  const rows: SourceRequirement[] = []
  let level: SourceRequirement['level'] = 'required', active = false
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/^[-•]\s*/, '')
    if (!line) continue
    const heading = /^(?:#{1,6}\s*|\d+(?:\.\d+)*\.?\s+)/.test(line)
    if (heading) {
      if (/^(?:#{1,6}\s*)?\d+\.\d+/.test(line)) continue
      if (/nâng cao|advanced|bonus|optional/i.test(line)) { level = 'advanced'; active = true }
      else if (/không bắt buộc|not required|out of scope/i.test(line)) { level = 'excluded'; active = true }
      else if (/chức năng|functional|yêu cầu|requirements?|công nghệ|technolog|mô hình dữ liệu|data model|constraints?|ràng buộc/i.test(line)) { level = 'required'; active = true }
      else { active = false; level = 'required' }
      continue
    }
    if (/^(?:không bắt buộc|not required|out of scope)\s*[:|]?/i.test(line)) {
      const value = line.replace(/^(?:không bắt buộc|not required|out of scope)\s*[:|]?/i, '').trim()
      level = 'excluded'; active = true
      if (value) rows.push({ text: value, sourceQuote: raw.trim(), level })
      continue
    }
    if (/^(?:TC\s*\d+|\d{2}\*?\s*\|)/i.test(line)) { active = false; continue }
    if (line.length < 15 || /^\|?\s*[-:|]+\s*$/.test(line)) continue
    if (active || /^(?:sinh viên|students? (?:must|shall)|implement|build|create|phải|bắt buộc|không được|sử dụng)/i.test(line)) {
      if (!rows.some(row => row.sourceQuote === raw.trim())) rows.push({ text: line.replace(/^\|\s*|\s*\|$/g, ''), sourceQuote: raw.trim(), level })
    }
  }
  return rows.slice(0, 80)
}
export function extractAcceptanceScenarios(text: string): AcceptanceScenario[] {
  const rows: AcceptanceScenario[] = []
  // Accept actual table rows (Markdown, DOCX text tabs), never manufacture stdin/stdout.
  const lines = text.split('\n')
  let inTests = false
  let numericRowsAllowed = false
  let inCodeBlock = false
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim()
    if (/^```|^~~~/.test(line)) { inCodeBlock = !inCodeBlock; continue }
    if (inCodeBlock) continue
    if (/acceptance tests?|tình huống kiểm thử/i.test(line)) { inTests = true; numericRowsAllowed = true; continue }
    if (/^(?:#{1,6}\s*)?(?:\d+[.)]\s*)?test cases?\b/i.test(line)) { inTests = true; numericRowsAllowed = false; continue }
    if (/^(?:#{1,6}\s+|\d+[.)]\s+\p{L})/u.test(line)) { inTests = false; continue }
    if (!inTests) continue
    const match = line.match(/^\|?\s*(?:TC\s*)?(\d{1,3})(\*)?\s*(?:\||\t|$)(.*)$/i)
    if (!match) continue
    // A console input such as Q=4 or output 0 is not an acceptance-test ID.
    if (Number(match[1]) === 0 && !/^\|?\s*TC\s*0/i.test(line)) continue
    if (!numericRowsAllowed && !/^\|?\s*TC\s*\d/i.test(line) && !/^\|/.test(line) && !/^\d+\*?\s*(?:\||\t)/.test(line)) continue
    let values = match[3].split(/\||\t/).map(value => value.trim()).filter(Boolean)
    let quote = line
    if (!values.length) {
      const following: string[] = []
      let next = index + 1
      for (; next < lines.length && following.length < 2; next++) if (lines[next].trim()) following.push(lines[next].trim())
      if (following.length === 2 && !following.some(value => /^(?:TC\s*)?\d+\*?$|^#{1,6}\s|^\d+[.)]\s|^```|^~~~/i.test(value))) { values = following; quote = lines.slice(index, next).join('\n'); index = next - 1 }
    }
    if (values.length < 2) continue
    rows.push({ id: `TC${match[1].padStart(2, '0')}`, steps: values[0], expectedResult: values.slice(1).join(' | '), sourceQuote: quote, level: match[2] ? 'advanced' : 'required', execution: 'manual_review' })
  }
  return rows
}

/** Reconcile AI suggestions with the original assignment, without generic test/rubric fallbacks. */
export function enforceAssignmentContract(output: AdaptiveAnalysisOutput, text: string, filename: string | undefined, originalCriteria: AnalyzedRubricCriterion[], aiAvailable: boolean) {
  const profile = detectAssignmentProfile(text, filename)
  const requirements = extractAssignmentRequirements(text)
  const sourceText = normalize(text)
  const warnings: string[] = []
  const language = profile.language
  if (output.detectedLanguage !== language) warnings.push('Đã loại bỏ ngôn ngữ AI suy đoán trái với bằng chứng trong đề bài.')
  output.detectedLanguage = language
  output.allowedLanguages = language === 'Unknown' ? [] : [language]
  output.assignmentCategory = profile.mode === 'sql' ? 'sql' : 'standard'
  output.description = text.trim()
  output.sampleSolution = undefined
  output.requirements = requirements.filter(row => row.level === 'required').map(row => row.text)
  if (!output.requirements.length) output.requirements = ['Chưa tách được yêu cầu chắc chắn; giảng viên cần đối chiếu tài liệu gốc.']
  const runtime = output.runtimeConfig
  Object.assign(runtime, { language, category: output.assignmentCategory })
  if (profile.mode !== 'console' && profile.mode !== 'sql') {
    Object.assign(runtime, { version: `${profile.platform} · Cần cấu hình môi trường kiểm thử`, buildCommand: '', runCommand: '', submissionStyle: 'project_archive' })
    Object.assign(output.submissionFormat, { submissionType: 'project_archive', allowedFormats: ['.zip'], entryFile: '', directoryStructure: 'Dự án gốc theo cấu trúc và công nghệ trong đề bài.' })
  }
  output.submissionFormat.requiredLanguage = language
  if (profile.mode !== 'sql') output.sqlConfig = undefined
  else if (output.sqlConfig) {
    const ddl = [...text.matchAll(/\bCREATE\s+TABLE\b[\s\S]*?;/gi)].map(match => match[0]).join('\n')
    const seed = [...text.matchAll(/\bINSERT\s+INTO\b[\s\S]*?;/gi)].map(match => match[0]).join('\n')
    const dbms = /sql server|sqlserver|t-sql/i.test(text) ? 'sqlserver' : /mysql/i.test(text) ? 'mysql' : /sqlite/i.test(text) ? 'sqlite' : /postgres(?:ql)?/i.test(text) ? 'postgresql' : null
    Object.assign(output.sqlConfig, { schemaDdl: ddl, seedData: seed, expectedQuery: '', ...(dbms ? { dbms } : {}), constraintsNotes: 'Schema và dữ liệu chỉ lấy câu lệnh ghi trong đề. Cần giảng viên xác nhận DBMS và truy vấn kỳ vọng trước khi chạy kiểm thử.' })
    runtime.version = dbms || 'DBMS cần giảng viên xác nhận'
  }
  // Only actual source examples with exact I/O evidence can become executable cases.
  output.testCases = profile.mode === 'console' ? output.testCases.filter(test => test.source === 'EXTRACTED' && test.input.trim() && test.expectedOutput.trim() && sourceText.includes(normalize(test.input)) && sourceText.includes(normalize(test.expectedOutput))) : []
  if (!output.testCases.length) warnings.push('Chưa có bộ kiểm thử tự động đã xác minh. Tình huống acceptance cần giảng viên kiểm tra hoặc cấu hình runner phù hợp.')
  const excluded = requirements.filter(row => row.level === 'excluded').map(row => row.text)
  if (originalCriteria.length) {
    output.rubricCriteria = originalCriteria
  } else {
    // A proposal must cite actual source requirements, not a subject template or a RAG document.
    output.rubricCriteria = output.rubricCriteria.filter(criterion => criterion.source === 'AI_SUGGESTED' && !!criterion.evidence && sourceText.includes(normalize(criterion.evidence)) && !excluded.some(item => normalize(item) === normalize(criterion.evidence!)))
    if (!output.rubricCriteria.length) {
      output.rubricCriteria = requirements.filter(row => row.level !== 'excluded').slice(0, 24).map((row, index) => ({
        id: `source-${index + 1}`, name: row.text.slice(0, 120), description: row.text, maxPoints: 0,
        method: 'ai_assessment', passCondition: row.text, failCondition: 'Không đáp ứng yêu cầu được trích dẫn; cần nêu bằng chứng cụ thể.',
        aiGuidance: `Chỉ đánh giá yêu cầu này trên bài nộp. ${row.level === 'advanced' ? 'Đây là yêu cầu nâng cao; không biến thành điều kiện bắt buộc đạt điểm cơ bản.' : ''} Không bổ sung chức năng ngoài đề.`,
        source: 'AI_SUGGESTED', evidence: row.sourceQuote, reviewNeeded: true, notes: 'Trích yêu cầu gốc; điểm thành phần chưa được giảng viên xác nhận.',
      }))
    }
    for (const criterion of output.rubricCriteria) {
      criterion.reviewNeeded = true
      if (profile.mode !== 'console') criterion.method = 'ai_assessment'
    }
    output.provenanceReport.rubricSourceType = 'AI_GENERATED'
    warnings.push('Đề chưa có barem điểm đầy đủ. Đây là barem đề xuất, cần giảng viên duyệt trọng số và phạm vi.')
  }
  if (!aiAvailable) warnings.push('Dịch vụ AI chưa trả được phân tích hợp lệ. Chỉ hiển thị dữ liệu trích xuất từ đề; chưa xác nhận là phân tích AI hoàn tất.')
  if (profile.reviewNeeded) warnings.push('Chưa xác định chắc chắn ngôn ngữ hoặc cách thực thi. Cần giảng viên xác nhận, không tự chọn Java/C++ hay SQL.')
  const sum = output.rubricCriteria.reduce((total, criterion) => total + Number(criterion.maxPoints || 0), 0)
  output.provenanceReport.pointsSumDelta = Math.abs(sum - output.provenanceReport.targetTotalPoints)
  Object.assign(output.provenanceReport.fields.language, { value: language, evidence: profile.evidence, source: profile.evidence ? 'EXTRACTED' : 'DEFAULT', reviewNeeded: profile.reviewNeeded, confidence: profile.evidence ? .98 : 0, validationStatus: profile.reviewNeeded ? 'warning' : 'valid' })
  output.summaryExplanation = warnings.join('\n')
  if (!aiAvailable) output.modelUsed = 'Trích xuất tài liệu · AI chưa hoàn tất'
  return Object.assign(output, {
    analysisReview: { status: aiAvailable ? 'needs_teacher_review' : 'extraction_only', profile, warnings, acknowledged: false },
    requirementGroups: { required: requirements.filter(row => row.level === 'required'), advanced: requirements.filter(row => row.level === 'advanced'), excluded: requirements.filter(row => row.level === 'excluded') },
    acceptanceTests: extractAcceptanceScenarios(text),
  })
}
