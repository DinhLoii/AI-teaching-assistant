import { detectAssignmentProfile } from '../../../../ai/infrastructure/analysis/assignment-contract.js'
import { examConfiguration } from '../../../../submissions/application/submission-language.js'
import { StdInOutProbeEngine } from './StdInOutProbeEngine.js'
import { executionFailureMessage, type ExecutionObserver } from './execution-events.js'

export function hasExecutableCriterionTests(rules: any[]): boolean {
  return rules.length > 0 && rules.every(rule => rule.scoringStrategy === 'StdInOutProbe' && rule.requiredEvidence?.some((e: any) => e.stdInOutProbe?.testCases?.length > 0))
}

/** Execution supplies functional scores within the approved rubric budget. */
export async function verifyConsoleTests(exam: any, rules: any[], submissionPath: string, onEvent?: ExecutionObserver) {
  const config = examConfiguration(exam)
  const profile = detectAssignmentProfile(exam.Description || '')
  if (profile.mode !== 'console') {
    onEvent?.({ stage: 2, status: 'info', message: `[Chọn runner] Đề được phân loại ${profile.mode}; không chạy như bài stdin/stdout. Các kiểm chứng dùng probe của từng tiêu chí.` })
    return null
  }
  if (hasExecutableCriterionTests(rules)) {
    onEvent?.({ stage: 2, status: 'info', message: '[Chọn runner] Testcase console sẽ chạy trong tiêu chí StdInOutProbe; không chạy trùng bộ kiểm chứng độc lập.' })
    return null
  }
  const tests = exam.TestCase?.length ? exam.TestCase : (config.testCases || []).map((test: any) => ({ Id: test.id, Input: test.input, ExpectedOutput: test.expectedOutput, IsHidden: test.isHidden === true }))
  if (!tests.length) {
    onEvent?.({ stage: 1, status: 'skipped', message: '[Runner console] Chưa khởi tạo vì đề không có testcase stdin/stdout đã lưu.' })
    onEvent?.({ stage: 2, status: 'skipped', message: '[Testcase] Đề chưa có testcase thực thi; giảng viên cần bổ sung input và expected output.' })
    return { status: 'missing_tests', configuredCount: 0, scoringImpact: 'functional', error: 'Chưa có testcase để chấm điểm chức năng.' }
  }
  const cases = tests.map((test: any, index: number) => ({
    entryFile: config.testCases?.[index]?.entryFile, questionId: config.testCases?.[index]?.questionId,
    id: config.testCases?.[index]?.id || test.Id, input: test.Input || '', expectedOutput: test.ExpectedOutput || '', isHidden: test.IsHidden !== false,
    comparisonMode: config.testCases?.[index]?.comparisonMode || 'exact', timeoutMs: test.TimeoutMs || 5000,
  }))
  const counted = /dòng đầu[^\n]*\bQ\b/i.test(exam.Description || '') && /(?:mỗi|mọi)[^\n]*một dòng|stdout[^\n]*một dòng/i.test(exam.Description || '')
  if (cases.some((test: any) => !test.input.trim() || !test.expectedOutput.trim() || (counted && (!/^\d+$/.test(test.input.split('\n')[0].trim()) || test.input.trim().split('\n').length !== Number(test.input.split('\n')[0]) + 1)))) {
    onEvent?.({ stage: 1, status: 'skipped', message: '[Runner console] Không khởi tạo vì bộ testcase chưa hợp lệ.' })
    onEvent?.({ stage: 2, status: 'warning', message: `[Testcase] ${cases.length} testcase đã lưu nhưng có input/output sai cấu trúc; cần đối chiếu lại đề gốc. Chưa chạy testcase.` })
    return { status: 'invalid_tests', configuredCount: cases.length, scoringImpact: 'functional', error: 'Testcase đã lưu không đúng định dạng stdin/stdout. Cần trích lại từ đề gốc; chưa thực thi.' }
  }
  try {
    const result = await new StdInOutProbeEngine().evaluateAsync(submissionPath, {
      description: 'Bộ testcase của giảng viên · kiểm chứng độc lập',
      requiredLanguage: config.submissionFormat?.requiredLanguage || config.runtimeConfig?.language || profile.language,
      testCases: cases,
    }, undefined, onEvent)
    return { status: 'completed', configuredCount: cases.length, scoringImpact: 'functional', executedAt: new Date().toISOString(), ...result }
  } catch (error) {
    return { status: 'blocked', configuredCount: cases.length, scoringImpact: 'functional', error: executionFailureMessage(error) }
  }
}
