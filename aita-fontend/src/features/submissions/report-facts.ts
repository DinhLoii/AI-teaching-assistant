export function parseReport(raw: unknown): any {
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw && typeof raw === 'object' ? raw : null } catch { return null }
}
const finite = (value: unknown) => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
export function reportFacts(submission: any) {
  const report = parseReport(submission?.reportData ?? submission?.ReportData) || {}
  const identityMismatch = !!((report.submissionId && report.submissionId !== (submission?.id || submission?.submissionId)) || (report.assignmentId && (submission?.assignmentId || submission?.examId) && report.assignmentId !== (submission.assignmentId || submission.examId)))
  const rules = [...(report.passedRules || []).map((rule: any) => ({ ...rule, passed: true })), ...(report.failedRules || []).map((rule: any) => ({ ...rule, passed: false }))]
  const evaluations = rules.length ? rules : (submission?.ruleScores || []).map((rule: any) => ({ ruleId: rule.ruleId || rule.id, title: rule.ruleName || rule.title || rule.name, description: rule.description, weight: finite(rule.maxScore), earnedScore: finite(rule.score), passed: rule.passed, details: rule.explanation || rule.feedback, evidence: rule.evidence }))
  const tests: any[] = []
  const seen = new Set<string>()
  const add = (cases: any[], kind: string, ruleId = '') => {
    if (!Array.isArray(cases)) return
    cases.forEach((test, index) => {
      const key = `${ruleId}:${kind}:${test.caseId ?? test.id ?? test.name ?? index}`
      if (seen.has(key)) return
      seen.add(key)
      tests.push({ ...test, key, kind, ruleId, ruleIds: ruleId ? [ruleId] : [], name: test.name || test.title || test.caseId || test.id || `Case ${index + 1}`, passed: typeof test.passed === 'boolean' ? test.passed : typeof test.success === 'boolean' ? test.success : null,
        error: test.error || test.errorMessage || test.stderr, expected: test.expected ?? test.expectedOutput ?? (test.expectedRows ? {columns:test.expectedColumns,rows:test.expectedRows} : undefined), actual: test.actual ?? test.actualOutput ?? (test.actualRows ? {columns:test.actualColumns,rows:test.actualRows} : undefined) })
    })
  }
  for (const rule of evaluations) {
    add(rule.evidence?.ioTestCases, 'I/O', rule.ruleId)
    add(rule.evidence?.sqlTestCases, 'SQL', rule.ruleId)
    add(rule.evidence?.httpSteps, 'HTTP', rule.ruleId)
    add(rule.evidence?.unitTestCases, 'Unit test', rule.ruleId)
    add(rule.evidence?.desktopTestCases, 'Ứng dụng', rule.ruleId)
    for (const workflow of rule.evidence?.browserWorkflows || []) {
      if (workflow.type !== 'browser.workflow.completed' || !workflow.payload?.testId) continue
      const payload = workflow.payload
      const assertion = payload.failedStep || [...(payload.steps || [])].reverse().find((step: any) => /^(assert|waitFor)/.test(step.action || ''))
      const key = `Browser:${payload.testId}`
      const existing = tests.find(test => test.key === key)
      if (existing) {
        if (rule.ruleId && !existing.ruleIds.includes(rule.ruleId)) existing.ruleIds.push(rule.ruleId)
        continue
      }
      tests.push({ ...payload, caseId: payload.testId, key, kind: 'Trình duyệt', name: payload.testName || payload.testId, ruleId: '', ruleIds: rule.ruleId ? [rule.ruleId] : [],
        passed: payload.executionError ? null : typeof payload.success === 'boolean' ? payload.success : null,
        stepsExecuted: payload.stepsExecuted, executedAt: workflow.timestamp,
        expected: payload.expected ?? assertion?.expected, actual: payload.actual ?? assertion?.actual,
        error: payload.error || (payload.executionError ? 'Thực thi bị gián đoạn; cần chạy lại.' : undefined) })
    }
  }
  add(report.ioTestCases, 'I/O'); add(report.sqlTestCases, 'SQL'); add(report.httpSteps || report.probeSteps, 'HTTP')
  if (report.consoleVerification?.status === 'completed') add(report.consoleVerification.caseResults, 'I/O')
  if (!tests.length) add(report.testCases, 'Test')
  const buildEvidence = evaluations.map((rule: any) => rule.evidence?.compilationPassed).filter((value: unknown) => typeof value === 'boolean')
  return {
    report: identityMismatch ? {} : report, evaluations: identityMismatch ? [] : evaluations, tests: identityMismatch ? [] : tests, identityMismatch,
    score: identityMismatch || report.error ? null : finite(submission?.finalScore ?? submission?.score ?? report.totalScore),
    gradingError: report.error || report.lastGradingError || submission?.gradingError || null,
    maxScore: finite(report.maxPossibleScore ?? submission?.maxScore),
    testPassed: identityMismatch ? 0 : tests.filter(test => test.passed === true).length,
    testExecuted: identityMismatch ? 0 : tests.filter(test => test.passed !== null).length,
    compilation: identityMismatch ? null : typeof report.compilationSummary?.passed === 'boolean' ? report.compilationSummary.passed : buildEvidence.includes(false) ? false : buildEvidence.includes(true) ? true : null,
  }
}

interface AssessmentEvidence {
  browserWorkflows?: { type?: string; payload?: { testId?: string; success?: boolean; executionError?: boolean } }[]
  ioTestCases?: { passed?: boolean; success?: boolean }[]
  sqlTestCases?: { passed?: boolean; success?: boolean }[]
  httpSteps?: { passed?: boolean; success?: boolean }[]
  snippets?: unknown[]
  codeSnippet?: string
}
export function assessmentMethod(rule: { evidence?: AssessmentEvidence; scoringStrategy?: string }): string {
  const evidence = rule.evidence || {}
  if (evidence.browserWorkflows?.some(test => test.type === 'browser.workflow.completed' && test.payload?.testId && typeof test.payload.success === 'boolean')) return 'Kiểm thử giao diện bằng trình duyệt'
  if ([...(evidence.ioTestCases || []), ...(evidence.sqlTestCases || []), ...(evidence.httpSteps || [])].some(test => typeof test.passed === 'boolean' || typeof test.success === 'boolean')) return 'Kiểm thử thực thi'
  if (['UniversalStatic', 'StaticAnalysis'].includes(rule.scoringStrategy || '')) return 'Phân tích tĩnh'
  if (rule.scoringStrategy === 'AIVision') return 'AI đánh giá hình ảnh'
  if (rule.scoringStrategy === 'AiTextAnalysis') return 'AI đánh giá nội dung'
  if (evidence.snippets?.length || evidence.codeSnippet || rule.scoringStrategy === 'AICodeReview') return 'AI đánh giá mã nguồn'
  return 'Chưa xác định phương thức'
}

export function evidenceMatches(code: string, filePath: string | undefined, files: { path: string; content: string }[]) {
  if (!code?.trim() || !filePath) return false
  const normalize = (text: string) => text.replaceAll('\r\n', '\n').trim()
  const requested = filePath.replaceAll('\\', '/').replace(/^\/+/, '')
  const candidates = files.filter(file => file.path === requested || file.path.endsWith('/' + requested))
  const tokens = (text: string) => '\u0000' + (text.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[\p{L}\p{N}_$]+|===|!==|==|!=|<=|>=|&&|\|\||=>|->|\?\.|\?:|[^\s]/gu) || []).join('\u0000') + '\u0000'
  return candidates.length === 1 && (normalize(candidates[0].content).includes(normalize(code)) || tokens(candidates[0].content).includes(tokens(code)))
}
