import { detectAssignmentProfile } from '../../../../ai/infrastructure/analysis/assignment-contract.js'
import { examConfiguration } from '../../../../submissions/application/submission-language.js'
import { StdInOutProbeEngine } from './StdInOutProbeEngine.js'

/** Verification is separate from rubric scoring: never award a second score budget. */
export async function verifyConsoleTests(exam: any, rules: any[], submissionPath: string) {
  const config = examConfiguration(exam)
  const profile = detectAssignmentProfile(exam.Description || '')
  if (profile.mode !== 'console' || rules.some(rule => rule.scoringStrategy === 'StdInOutProbe')) return null
  const tests = exam.TestCase?.length ? exam.TestCase : (config.testCases || []).map((test: any) => ({ Id: test.id, Input: test.input, ExpectedOutput: test.expectedOutput, IsHidden: test.isHidden === true }))
  if (!tests.length) return null
  const cases = tests.map((test: any, index: number) => ({
    id: config.testCases?.[index]?.id || test.Id, input: test.Input || '', expectedOutput: test.ExpectedOutput || '', isHidden: test.IsHidden !== false,
    comparisonMode: config.testCases?.[index]?.comparisonMode || 'exact', timeoutMs: test.TimeoutMs || 5000,
  }))
  const counted = /dòng đầu[^\n]*\bQ\b/i.test(exam.Description || '') && /(?:mỗi|mọi)[^\n]*một dòng|stdout[^\n]*một dòng/i.test(exam.Description || '')
  if (cases.some((test: any) => !test.input.trim() || !test.expectedOutput.trim() || (counted && (!/^\d+$/.test(test.input.split('\n')[0].trim()) || test.input.trim().split('\n').length !== Number(test.input.split('\n')[0]) + 1)))) {
    return { status: 'invalid_tests', configuredCount: cases.length, scoringImpact: 'none', error: 'Testcase đã lưu không đúng định dạng stdin/stdout. Cần trích lại từ đề gốc; chưa thực thi.' }
  }
  try {
    const result = await new StdInOutProbeEngine().evaluateAsync(submissionPath, {
      description: 'Bộ testcase của giảng viên · kiểm chứng độc lập',
      requiredLanguage: config.submissionFormat?.requiredLanguage || config.runtimeConfig?.language || profile.language,
      testCases: cases,
    })
    return { status: 'completed', configuredCount: cases.length, scoringImpact: 'none', executedAt: new Date().toISOString(), ...result }
  } catch (error) {
    return { status: 'blocked', configuredCount: cases.length, scoringImpact: 'none', error: error instanceof Error ? error.message : 'Không khởi động được môi trường kiểm thử.' }
  }
}
