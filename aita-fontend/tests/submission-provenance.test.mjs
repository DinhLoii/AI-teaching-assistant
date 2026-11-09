import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { createLoader } from './helpers/load-typescript.mjs'

const load = createLoader()
const { reportFacts, evidenceMatches } = load('features/submissions/report-facts.ts')
const { normalizeSubmissionRow } = load('lib/api/normalizers/submission.ts')
test('independent console verification exposes real test outcomes without adding rubric criteria or changing score', () => {
  const facts = reportFacts({ id: 's', finalScore: 1.3, reportData: { submissionId: 's', compilationSummary: { passed: true }, consoleVerification: { status: 'completed', scoringImpact: 'none', caseResults: [{ caseId: 'TC01', passed: true }, { caseId: 'TC02', passed: false }, { caseId: 'TC03', passed: null }] } } })
  assert.equal(facts.testExecuted, 2)
  assert.equal(facts.testPassed, 1)
  assert.equal(facts.compilation, true)
  assert.equal(facts.score, 1.3)
  assert.equal(facts.evaluations.length, 0)
})
const backend = path.resolve('../aita-backend')
function backendModule(file, mocks = {}, runtime = {}) {
  const filename = path.join(backend, 'src', file)
  const require = createRequire(filename)
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(filename).href))
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(`(function(require,module,exports){${output}\n})`, { Buffer, URL, AbortSignal, AbortController, setTimeout, clearTimeout, process: { ...process, env: {} }, console, ...runtime })(name => {
    if (name in mocks) return mocks[name]
    if (name.startsWith('../application/use-cases/')) return {}
    const target = path.resolve(path.dirname(filename), name.replace(/\.js$/, '.ts'))
    if (name.startsWith('.') && fs.existsSync(target)) return backendModule(path.relative(path.join(backend, 'src'), target), mocks, runtime)
    return require(name)
  }, module, module.exports)
  return module.exports
}
test('demo AI mode is refused for real grading', () => {
  const { assertRealGradingMode } = backendModule('modules/grading/engine/config/grading-mode.ts')
  assert.throws(() => assertRealGradingMode(true), /AI_STUB_MODE/)
  assert.doesNotThrow(() => assertRealGradingMode(false))
})
test('AI provider failures and missing keys cannot silently synthesize grading responses', async () => {
  let stubs = 0
  const ai = { stubMode: false, geminiKeys: [], githubToken: '', groqKey: '', githubModel: 'test', githubBaseUrl: 'https://example.invalid', timeoutMs: 1 }
  const { AiClientManager } = backendModule('modules/grading/engine/infrastructure/ai/AiClientManager.ts', {
    '../../config/index.js': { config: { ai } },
    '../../../../../database/prisma.js': { prisma: {} },
    './StubAiGenerator.js': { StubAiGenerator: { generate() { stubs++; return '{}' } } },
    '../../../../../shared/application/app.error.js': { AppError: class extends Error { constructor(code, message, status) { super(message); this.code = code; this.status = status } } },
  })
  await assert.rejects(AiClientManager.executeWithFallback(async () => ({})), error => error.code === 'AI_NOT_CONFIGURED')
  ai.githubToken = 'test-key'
  await assert.rejects(AiClientManager.executeWithFallback(async () => { throw new Error('provider down') }), error => error.code === 'AI_UNAVAILABLE')
  await assert.rejects(AiClientManager.executeWithFallback(async () => { throw new Error('AI_CODE_EVIDENCE_MISSING: repair required') }), /AI_CODE_EVIDENCE_MISSING/)
  assert.equal(stubs, 0)
})
test('grading evidence excludes invented snippets even if the AI claims they passed', () => {
  const { verifiedSourceSnippets } = backendModule('modules/grading/engine/application/evaluator/source-evidence.ts')
  const result = verifiedSourceSnippets([{ relativePath: 'src/Main.kt', content: 'println("real")' }], [
    { filePath: 'src/Main.kt', codeSnippet: 'println("real")' },
    { filePath: 'src/Main.kt', codeSnippet: 'println("invented")' },
    { filePath: 'System/AI_Evaluation_Fallback', codeSnippet: '// verified by AI' },
  ])
  assert.equal(result.length, 1)
  assert.equal(result[0].filePath, 'src/Main.kt')
})

test('Gemini uses the configured request timeout and caller cancellation; timeouts retain a retryable code', async () => {
  let requestOptions, fail = false
  const ai = { stubMode: false, geminiKeys: ['fixture-sdk-key'], geminiModel: 'fixture-model', timeoutMs: 45000 }
  const { AiClientManager } = backendModule('modules/grading/engine/infrastructure/ai/AiClientManager.ts', {
    '../../config/index.js': { config: { ai } },
    '@google/generative-ai': { GoogleGenerativeAI: class { getGenerativeModel() { return { generateContent: async (_request, options) => {
      requestOptions = options
      if (fail) throw new Error('SDK timed out')
      return { response: { text: () => 'fixture response' } }
    } } } } },
    '../../../../../database/prisma.js': { prisma: { aiUsageLog: { create: async () => ({}) } } },
    './StubAiGenerator.js': {},
    '../../../../../shared/application/app.error.js': { AppError: class extends Error { constructor(code, message, statusCode) { super(message); Object.assign(this, { code, statusCode }) } } },
  })
  const controller = new AbortController()
  const call = client => client.chat.completions.create({ messages: [{ role: 'user', content: 'fixture request' }] }, { signal: controller.signal })
  await AiClientManager.executeWithFallback(call)
  assert.equal(requestOptions.timeout, 45000)
  assert.equal(requestOptions.signal, controller.signal)
  fail = true
  await assert.rejects(AiClientManager.executeWithFallback(call), error => error.code === 'AI_TIMEOUT')
  assert.equal(AiClientManager.lastFailureDiagnostic.kind, 'TIMEOUT')
})
test('evidence accepts formatting and archive prefixes but rejects altered literals and ambiguous paths', () => {
  const { verifiedSourceSnippets, referencedSourceSnippets } = backendModule('modules/grading/engine/application/evaluator/source-evidence.ts')
  const files = [{ relativePath: 'app/Main.kt', content: 'fun main() {\n  println("a b")\n}' }]
  assert.equal(verifiedSourceSnippets(files, [{ filePath: 'project/app/Main.kt', codeSnippet: 'fun main(){println("a b")}' }]).length, 1)
  assert.equal(verifiedSourceSnippets(files, [{ filePath: 'Main.kt', codeSnippet: 'println("ab")' }]).length, 0)
  assert.equal(referencedSourceSnippets(files, ['project/app/Main.kt'])[0].codeSnippet, files[0].content)
  assert.equal(referencedSourceSnippets(files, ['invented.kt']).length, 0)
})
test('failed evaluation is not a zero grade; a previous completed grade survives a failed regrade', () => {
  const { failedGradingUpdate } = backendModule('modules/grading/engine/infrastructure/file-system/grading-failure.ts')
  const update = failedGradingUpdate({ RawScore: 0, FinalScore: 0 }, 'AI unavailable', { totalScore: 0 })
  assert.equal(update.GradingStatus, 'Error'); assert.equal(update.RawScore, null); assert.equal(update.FinalScore, null)
  const facts = reportFacts({ score: 0, reportData: JSON.parse(update.ReportData) })
  assert.equal(facts.score, null); assert.equal(facts.gradingError, 'AI unavailable')
  const preserved = failedGradingUpdate({ ReportData: JSON.stringify({ totalScore: 6, passedRules: [{ ruleId: 'R1' }] }) }, 'Retry failed')
  assert.equal('FinalScore' in preserved, false)
  assert.equal(JSON.parse(preserved.ReportData).totalScore, 6)
})

test('AI line references extract original source; malformed scores and invented references are rejected', () => {
  const { resolveCodeReviewResult } = backendModule('modules/grading/engine/application/evaluator/source-evidence.ts')
  const files = [{ relativePath: 'app/Main.kt', content: 'class Main {\n  val amount = 120000\n}' }]
  const review = { percentageComplete: 0.75, reasoning: 'Đáp ứng một phần tiêu chí.', relevantSnippets: [{ filePath: 'app/Main.kt', startLine: 2, endLine: 2 }] }
  assert.equal(resolveCodeReviewResult(files, review).relevantSnippets[0].codeSnippet, '  val amount = 120000')
  const legacy = resolveCodeReviewResult(files, { ...review, relevantSnippets: [{ filePath: 'app/Main.kt', codeSnippet: 'invalid rewritten excerpt' }] })
  assert.equal(legacy.relevantSnippets[0].codeSnippet, files[0].content)
  assert.ok(legacy.reviewWarning)
  assert.throws(() => resolveCodeReviewResult(files, { ...review, relevantSnippets: [{ filePath: 'missing.kt', startLine: 1, endLine: 2 }] }), /AI_CODE_EVIDENCE_MISSING/)
  for (const percentageComplete of [undefined, NaN, -1, 10, '0.75']) assert.throws(() => resolveCodeReviewResult(files, { ...review, percentageComplete }), /AI_REVIEW_INVALID/)
})

test('Windows ZIP references recover original evidence consistently across languages and legacy provider formats', () => {
  const { resolveCodeReviewResult, normalizeSourcePath } = backendModule('modules/grading/engine/application/evaluator/source-evidence.ts')
  for (const extension of ['c', 'cpp', 'java', 'kt', 'py', 'cs', 'ts', 'sql']) {
    const relative = 'Bài nộp/src/main.' + extension
    const content = 'first real line\r\nsecond real line\r\nthird real line'
    const files = [{ relativePath: '\\' + relative.replaceAll('/', '\\'), fileId: 'F1', content }]
    const base = { percentageComplete: .6, reasoning: 'Đáp ứng một phần tiêu chí theo mã nguồn.' }
    const ranged = resolveCodeReviewResult(files, { ...base, relevantSnippets: [{ filePath: './' + relative, startLine: 'L2', endLine: '2' }] })
    assert.equal(ranged.relevantSnippets[0].codeSnippet, 'second real line')
    assert.equal(ranged.relevantSnippets[0].filePath, relative)
    const fallback = resolveCodeReviewResult(files, { ...base, relevantSnippets: [{ filePath: relative, startLine: 1, endLine: 99 }], relevantFiles: [relative] })
    assert.equal(fallback.relevantSnippets[0].codeSnippet, content)
    assert.ok(fallback.reviewWarning)
    const byId = resolveCodeReviewResult(files, { ...base, relevantSnippets: [{ fileId: 'F1', startLine: 1, endLine: 2 }] })
    assert.equal(byId.relevantSnippets[0].filePath, relative)
    assert.throws(() => resolveCodeReviewResult(files, { ...base, relevantSnippets: [{ fileId: 'F99', startLine: 1, endLine: 2 }] }), /AI_CODE_EVIDENCE_MISSING/)
    assert.throws(() => resolveCodeReviewResult(files, { ...base, relevantSnippets: [{ fileId: 'F1', filePath: '../main.' + extension, startLine: 1, endLine: 2 }] }), /AI_CODE_EVIDENCE_MISSING/)
  }
  assert.equal(normalizeSourcePath('../bad.c'), null)
  assert.equal(normalizeSourcePath('C:\\private\\main.c'), null)
})

test('an exact archive path wins over a nested basename; file IDs cannot contradict the cited file', () => {
  const { resolveCodeReviewResult } = backendModule('modules/grading/engine/application/evaluator/source-evidence.ts')
  const files = [{ fileId: 'F1', relativePath: 'src/Main.java', content: 'first' }, { fileId: 'F2', relativePath: 'other/src/Main.java', content: 'second' }]
  const base = { percentageComplete: 1, reasoning: 'Đã đối chiếu mã gốc.' }
  assert.equal(resolveCodeReviewResult(files, { ...base, relevantFiles: ['src/Main.java'] }).relevantSnippets[0].codeSnippet, 'first')
  assert.throws(() => resolveCodeReviewResult(files, { ...base, relevantFiles: ['Main.java'] }), /AI_CODE_EVIDENCE_MISSING/)
  assert.throws(() => resolveCodeReviewResult(files, { ...base, relevantSnippets: [{ fileId: 'F2', filePath: 'src/Main.java', startLine: 1, endLine: 1 }] }), /AI_CODE_EVIDENCE_MISSING/)
})

test('missing evidence is repaired before the full six-criterion rubric completes', async () => {
  const evidence = backendModule('modules/grading/engine/application/evaluator/source-evidence.ts')
  let calls = 0
  const keys = [], cached = new Map()
  const { AICodeReviewEngine } = backendModule('modules/grading/engine/application/evaluator/AICodeReviewEngine.ts', {
    '../../config': {}, './source-evidence.js': evidence,
    '../../infrastructure/ai/AiClientManager': { AiClientManager: { executeWithFallback: async (callback, key) => {
      keys.push(key)
      const result = await callback({ chat: { completions: { create: async ({ messages }) => {
        calls++
        assert.match(messages[0].content, /\[L2\]/)
        return { choices: [{ message: { content: JSON.stringify({ percentageComplete: 1, confidence: 0.9, reasoning: 'Đạt yêu cầu theo mã nguồn.', relevantSnippets: calls === 1 ? [] : [{ filePath: 'app/Main.kt', startLine: 2, endLine: 2 }], relevantFiles: [] }) } }] }
      } } } }, 'fixture-model')
      cached.set(key, result)
      return result
    } } },
  })
  const unused = class { async cleanupSessionAsync() {} }
  const { RubricEvaluator } = backendModule('modules/grading/engine/application/evaluator/RubricEvaluator.ts', {
    './AICodeReviewEngine': { AICodeReviewEngine },
    './HTTPProbeEngine': { HTTPProbeEngine: unused }, './StdInOutProbeEngine': { StdInOutProbeEngine: unused },
    './SqlExecutionProbeEngine': { SqlExecutionProbeEngine: unused }, './UniversalStaticAnalyzer': { UniversalStaticAnalyzer: unused },
    './AiTextAnalysisEngine': { AiTextAnalysisEngine: unused },
    '../queue/SubmissionJobManager': { globalJobManager: { getJob: () => null } },
    '../../core/domain/rubric/SubjectProjectTypes': { normaliseSubjectCode: value => value },
    '../../config/index.js': { config: { ai: { stubMode: false } } },
    '../../config/grading-mode.js': { assertRealGradingMode() {} },
  })
  const rubric = { title: 'Personal Expense Tracker', totalWeight: 10, passThreshold: 0.5, rules: [3, 1.5, 1.5, 1, 1.5, 1.5].map((weight, index) => ({ id: `R${index}`, title: `Tiêu chí ${index}`, description: 'Kotlin Room logic', weight, scoringStrategy: 'AICodeReview' })) }
  const report = await new RubricEvaluator({ generateOverallFeedbackAsync: async () => 'Nhận xét thử nghiệm.' }, {}).evaluateAsync('submission', 'exam', 'student', rubric, { sourceSnapshot: { projectType: 'kotlin', files: [{ relativePath: 'app/Main.kt', content: 'class Main {\n  val amount = 120000\n}' }] }, evidencePool: [] })
  assert.equal(calls, 7)
  assert.equal(keys.length, 7)
  assert.equal(cached.size, 6)
  assert.notEqual(keys[0], keys[1])
  assert.equal(report.totalScore, 10)
  assert.equal(report.passedRules.length, 6)
  assert.ok(report.passedRules.every(rule => rule.evidence.snippets[0].codeSnippet === '  val amount = 120000'))
})

test('missing results never manufacture grades, criteria, tests or compilation success', () => {
  const facts = reportFacts(normalizeSubmissionRow({ id: 'a', totalScore: 10 }))
  assert.equal(facts.score, null)
  assert.equal(facts.compilation, null)
  assert.equal(facts.evaluations.length, 0)
  assert.equal(facts.testExecuted, 0)
  assert.equal(reportFacts({ score: 0, maxScore: 10 }).score, 0)
})

test('failed reports expose staff diagnostics without leaking unpublished reports or inventing zero grades', () => {
  const { SubmissionResponseDto } = backendModule('modules/submissions/application/dtos/submission.dto.ts')
  const failed = { Id: 'failed', ReviewStatus: 'DRAFT', GradingStatus: null, RawScore: 0, FinalScore: 0, ReportData: JSON.stringify({ error: 'AI_CODE_EVIDENCE_MISSING', totalScore: 0 }) }
  const staff = SubmissionResponseDto.from(failed, 'lecturer')
  assert.equal(staff.gradingStatus, 'Error')
  assert.equal(staff.score, null)
  assert.equal(staff.reportData.error, 'AI_CODE_EVIDENCE_MISSING')
  const student = SubmissionResponseDto.from(failed, 'student')
  assert.equal(student.reportData, null)
  assert.equal(student.score, null)
  assert.equal(student.gradingError.includes('AI_CODE_EVIDENCE_MISSING'), false)
  const normalized = normalizeSubmissionRow(staff)
  for (const key of ['score', 'rawScore', 'finalScore', 'aiScore', 'totalScore']) assert.equal(normalized[key], null)
})
test('only recorded execution outcomes count; an AI assessment is not a passed testcase', () => {
  const facts = reportFacts({ reportData: { passedRules: [{ ruleId: 'R1', evidence: { ioTestCases: [{ caseId: 'one', passed: true }, { caseId: 'two', passed: false }, { caseId: 'unknown', details: 'looks correct' }] } }] } })
  assert.equal(facts.tests.length, 3)
  assert.equal(facts.testPassed, 1)
  assert.equal(facts.testExecuted, 2)
  assert.equal(facts.tests[2].passed, null)
})
test('report belonging to another upload or assignment cannot supply scores or evidence', () => {
  for (const identity of [{ submissionId: 'other' }, { assignmentId: 'other' }]) {
    const facts = reportFacts({ id: 'upload', assignmentId: 'exam', score: 6, reportData: { ...identity, compilationSummary: { passed: true }, passedRules: [{ ruleId: 'R1' }] } })
    assert.equal(facts.identityMismatch, true)
    assert.equal(facts.score, null)
    assert.equal(facts.compilation, null)
    assert.equal(facts.evaluations.length, 0)
  }
})
test('code evidence must match both a unique ZIP path and its content', () => {
  const files = [{ path: 'project/src/Main.kt', content: 'fun main() {\r\n  println("real")\r\n}' }]
  assert.equal(evidenceMatches('println("real")', 'src/Main.kt', files), true)
  assert.equal(evidenceMatches('println("invented")', 'src/Main.kt', files), false)
  assert.equal(evidenceMatches('println("real")', 'Other.kt', files), false)
  assert.equal(evidenceMatches('println("real")', 'Main.kt', [...files, { ...files[0], path: 'other/Main.kt' }]), false)
})
test('ZIP preview reads submitted Kotlin paths and hashes actual archive bytes', () => {
  const AdmZip = createRequire(path.join(backend, 'package.json'))('adm-zip')
  const { inspectSourceArchive } = backendModule('modules/submissions/infrastructure/source-archive.ts')
  const zip = new AdmZip()
  zip.addFile('project/src/Main.kt', Buffer.from('fun main() = println("ZIP")'))
  zip.addFile('project/.git/config', Buffer.from('ignored'))
  zip.addFile('project/node_modules/a/index.js', Buffer.from('ignored'))
  const buffer = zip.toBuffer()
  const result = inspectSourceArchive(buffer)
  assert.equal(result.files.length, 1)
  assert.equal(result.files[0].path, 'project/src/Main.kt')
  assert.equal(result.files[0].content, 'fun main() = println("ZIP")')
  assert.equal(result.skipped, 2)
  assert.equal(result.archiveSha256, createHash('sha256').update(buffer).digest('hex'))
  assert.throws(() => inspectSourceArchive(Buffer.from('not a zip')))
  const oversized = new AdmZip()
  oversized.addFile('huge.kt', Buffer.alloc(2 * 1024 * 1024 + 1, 65))
  assert.equal(inspectSourceArchive(oversized.toBuffer()).files.length, 0)
})
test('new attempts retain old ZIP, report and grade; sequence is locked before insert', async () => {
  const { PrismaSubmissionRepository } = backendModule('modules/submissions/infrastructure/repositories/prisma-submission-repository.ts', {
    '../mappers/submission.mapper.js': { SubmissionMapper: { toPersistence: row => ({ Id: row.id, AttemptNumber: row.attemptNumber, ZipFileUrl: row.zipFileUrl, IsLatest: row.isLatest }) } },
  })
  const old = { Id: 'old', AttemptNumber: 1, ZipFileUrl: 'old.zip', ReportData: 'old report', FinalScore: 6, IsLatest: true }
  const rows = [old], calls = []
  const tx = {
    $executeRaw: async strings => calls.push(strings.join('').includes('SubmissionGradingTask') ? 'queue' : 'lock'),
    exam: { findUnique: async () => ({ GradingStrategy: 'CONTINUOUS_QUEUE' }) },
    submission: {
      aggregate: async () => { calls.push('aggregate'); return { _max: { AttemptNumber: Math.max(...rows.map(row => row.AttemptNumber)) } } },
      updateMany: async ({ data }) => rows.forEach(row => Object.assign(row, data)),
      create: async ({ data }) => rows.push(data),
    },
  }
  const repository = new PrismaSubmissionRepository({ $transaction: async fn => fn(tx) })
  for (const id of ['second', 'third']) await repository.createAttempt({ id, studentId: 'student', examId: 'exam', classId: 'class', zipFileUrl: `${id}.zip` })
  assert.equal(old.ZipFileUrl, 'old.zip'); assert.equal(old.ReportData, 'old report'); assert.equal(old.FinalScore, 6)
  assert.equal(old.IsLatest, false)
  assert.deepEqual(rows.map(row => row.AttemptNumber), [1, 2, 3])
  assert.equal(rows[2].IsLatest, true)
  assert.deepEqual(calls, ['lock', 'aggregate', 'queue', 'lock', 'aggregate', 'queue'])
})
test('source and history require authorization before accessing ZIP or other attempts', async () => {
  let reads = 0
  const { SubmissionsController } = backendModule('modules/submissions/presentation/submissions.controller.ts', {
    '../infrastructure/source-archive.js': { readSubmissionArchive: async () => { reads++; return {} } },
    '../../../database/prisma.js': { prisma: { submission: { findMany: async () => { reads++; return [] } } } },
    '../../../shared/presentation/base-controller.js': { BaseController: class { ok(res, data) { res.json(data) } } },
    '../../../shared/constants/messages.js': { MESSAGES: {} },
    '../../../shared/infrastructure/memory-cache.js': { memoryCache: {} },
    '../application/dtos/submission.dto.js': {},
  })
  const denied = { execute: async () => { throw new Error('Forbidden') } }
  const controller = new SubmissionsController(null, null, denied)
  for (const method of ['source', 'history']) await assert.rejects(controller[method]({ params: { id: 'foreign' }, user: { id: 'student' } }, {}), /Forbidden/)
  assert.equal(reads, 0)
})
test('attempt history stays in the same student/exam/class scope and hides unpublished scores', async () => {
  let where, response
  const { SubmissionsController } = backendModule('modules/submissions/presentation/submissions.controller.ts', {
    '../infrastructure/source-archive.js': {},
    '../../../database/prisma.js': { prisma: { submission: { findMany: async query => {
      where = query.where
      return [{ Id: 'old', AttemptNumber: 1, ZipFileUrl: '/uploads/old.zip', FinalScore: 9, ReviewStatus: 'DRAFT' }, { Id: 'current', AttemptNumber: 2, ZipFileUrl: '/uploads/current.zip', FinalScore: 0, ReviewStatus: 'PUBLISHED', Exam: { TotalPoints: 10 } }]
    } } } },
    '../../../shared/presentation/base-controller.js': { BaseController: class { ok(res, data) { res.json(data) } } },
    '../../../shared/constants/messages.js': { MESSAGES: {} },
    '../../../shared/infrastructure/memory-cache.js': { memoryCache: {} },
    '../application/dtos/submission.dto.js': {},
  })
  const controller = new SubmissionsController(null, null, { execute: async () => ({ id: 'current', studentId: 'student', examId: 'exam', classId: null }) })
  await controller.history({ params: { id: 'current' }, user: { id: 'student', role: 'student' } }, { setHeader() {}, json(data) { response = data } })
  assert.equal(where.StudentId, 'student'); assert.equal(where.ExamId, 'exam'); assert.equal(where.ClassId, null)
  assert.equal(response[0].score, null)
  assert.equal(response[1].score, 0)
})

test('AI overload respects Retry-After and does not clear key cooldown on another request', async () => {
  let now = 100000, calls = 0
  const waits = []
  class Clock extends Date { static now() { return now } }
  const { AiClientManager } = backendModule('modules/grading/engine/infrastructure/ai/AiClientManager.ts', {
    '../../config/index.js': { config: { ai: { stubMode: false, geminiKeys: ['fixture-key'], geminiModel: 'test', timeoutMs: 1000 } } },
    '../../../../../database/prisma.js': { prisma: { aiUsageLog: { create: async () => ({}) } } },
  }, { Date: Clock, setTimeout: (fn, ms) => { waits.push(ms); now += ms; queueMicrotask(fn); return 0 } })
  const unavailable = async () => { calls++; throw Object.assign(new Error('high demand'), { status: 503, headers: { 'retry-after': '120' } }) }
  await assert.rejects(AiClientManager.executeWithFallback(unavailable), e => e.code === 'AI_UNAVAILABLE')
  assert.equal(calls, 1, 'must not contact the provider during its cooldown')
  assert.deepEqual(waits, [30000, 30000])
  await assert.rejects(AiClientManager.executeWithFallback(unavailable), e => e.code === 'AI_UNAVAILABLE')
  assert.equal(calls, 2, 'only retry when the full 120 second cooldown has expired')
})

test('transient AI failure recovers with bounded backoff and caches only successful results', async () => {
  let now = 100000, calls = 0
  const waits = []
  class Clock extends Date { static now() { return now } }
  const { AiClientManager } = backendModule('modules/grading/engine/infrastructure/ai/AiClientManager.ts', {
    '../../config/index.js': { config: { ai: { stubMode: false, geminiKeys: ['fixture-key'], geminiModel: 'test', timeoutMs: 1000 } } },
    '../../../../../database/prisma.js': { prisma: { aiUsageLog: { create: async () => ({}) } } },
  }, { Date: Clock, setTimeout: (fn, ms) => { waits.push(ms); now += ms; queueMicrotask(fn); return 0 } })
  const callback = async () => { if (++calls === 1) throw Object.assign(new Error('overload'), { status: 503 }); return { verified: true } }
  assert.equal((await AiClientManager.executeWithFallback(callback, 'recovery-cache')).verified, true)
  await AiClientManager.executeWithFallback(callback, 'recovery-cache')
  assert.equal(calls, 2)
  assert.deepEqual(waits, [5000])
})

test('provider outage leaves evaluator repair loop immediately and preserves its retryable error code', async () => {
  let calls = 0
  const failure = Object.assign(new Error('temporary outage'), { code: 'AI_UNAVAILABLE', statusCode: 503 })
  const { AICodeReviewEngine } = backendModule('modules/grading/engine/application/evaluator/AICodeReviewEngine.ts', {
    '../../infrastructure/ai/AiClientManager': { AiClientManager: { executeWithFallback: async () => { calls++; throw failure } } },
  })
  await assert.rejects(new AICodeReviewEngine().evaluateAsync({ projectType: 'frontend', files: [{ relativePath: 'src/App.jsx', content: 'export default function App(){ return null }' }] }, 'Check frontend form'), e => e === failure)
  assert.equal(calls, 1)
})
