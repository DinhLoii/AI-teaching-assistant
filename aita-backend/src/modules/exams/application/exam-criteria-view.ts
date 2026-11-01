export function criterionView(rule: any, criterion?: any) {
  let config: any = {}
  try { config = typeof criterion?.ValidationConfig === 'string' ? JSON.parse(criterion.ValidationConfig) : criterion?.ValidationConfig || {} } catch {}
  const strategies: Record<string, string> = { AI: 'AICodeReview', TEST: 'StdInOutProbe', TESTCASE: 'StdInOutProbe', STDINOUT: 'StdInOutProbe', STATIC: 'UniversalStatic', HTTP: 'HTTPProbe', VISION: 'AIVision', MANUAL: 'Manual' }
  const title = rule.Description || criterion?.Description || 'Tiêu chí'
  return {
    id: criterion?.Id || rule.Id,
    title, name: title,
    description: criterion?.Description || rule.Description || '',
    maxPoints: Number(criterion?.MaxPoints ?? rule.MaxPoints ?? 0),
    weight: Number(criterion?.MaxPoints ?? rule.MaxPoints ?? 0),
    scoringStrategy: rule.IsManualOnly ? 'Manual' : config.sqlProbe ? 'SqlExecutionProbe' : strategies[String(criterion?.ValidationType || '').toUpperCase()] || 'Manual',
    passCondition: config.passCondition || '', failCondition: config.failCondition || '',
  }
}

/** Hidden input/output is returned only to authenticated staff; never spread raw test records. */
export function examTestCasesView(tests: any[], staff: boolean) {
  return tests.filter(test => staff || (test.IsHidden ?? test.isHidden) === false).map((test, index) => ({
    id: test.Id || test.id || `TC${index + 1}`,
    questionId: test.questionId, entryFile: test.entryFile,
    input: test.Input ?? test.input ?? '',
    expectedOutput: test.ExpectedOutput ?? test.expectedOutput ?? '',
    points: Number(test.Points ?? test.points ?? 0),
    isHidden: (test.IsHidden ?? test.isHidden) !== false,
  }))
}
