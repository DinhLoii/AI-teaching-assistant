import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import express from 'express'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/aita_test'
process.env.JWT_SECRET = 'unit-tests-only-secret-that-is-at-least-32-characters'
const { assignmentScope, assertClassAccess, assertClassesMatchSubject, requireAssignmentAccess, studentAssignmentView } = await import('../src/modules/grading/engine/assignment/assignment-access.js')
const { requireRoles, authenticate } = await import('../src/middleware/auth.js')
const { protectSubmissionUploads, resolveSubmissionFile, readSubmissionFile } = await import('../src/modules/submissions/infrastructure/submission-storage.js')
const { safeLogData, safeUrl } = await import('../src/shared/infrastructure/redact-secrets.js')
const { canSeedDemoAccounts } = await import('../src/database/dev-seed-policy.js')
const { assertSubmissionLanguage, assertDirectorySubmissionLanguage, examConfiguration } = await import('../src/modules/submissions/application/submission-language.js')
const { criterionView, examTestCasesView } = await import('../src/modules/exams/application/exam-criteria-view.js')
const { studentReportView } = await import('../src/modules/submissions/application/student-report-view.js')

test('grading event snapshots belong to one run and contain only server-issued messages', async () => {
  const { globalJobManager } = await import('../src/modules/grading/engine/application/queue/SubmissionJobManager.js')
  const id = 'log-unit-test'
  try {
    globalJobManager.initJob(id, 'Queued', { requestVersion: 1, attempt: 1 })
    assert.equal(globalJobManager.getJob(id)?.logs?.length, 1)
    globalJobManager.updateProgress(id, 45, 'Compiling actual source')
    globalJobManager.updateProgress(id, 45, 'Compiling actual source')
    const events = globalJobManager.getJob(id)!.logs!
    assert.equal(events.length, 2)
    assert.ok(Number.isFinite(Date.parse(events[1].timestamp)))
    assert.equal(events[1].message, 'Compiling actual source')
    globalJobManager.recordEvent(id, { stage: 0, status: 'completed', message: 'Đã đọc đúng ZIP' })
    assert.equal(globalJobManager.getJob(id)?.logs?.at(-1)?.stage, 0)
    assert.equal(globalJobManager.getJob(id)?.logs?.at(-1)?.status, 'completed')
    for (let index = 0; index < 210; index++) globalJobManager.recordEvent(id, { stage: 2, status: 'info', message: 'Event ' + index })
    const retained = globalJobManager.getJob(id)!.logs!
    assert.equal(retained.length, 200)
    assert.equal(new Set(retained.map(event => event.id)).size, 200)
    globalJobManager.initJob(id, 'Retry', { requestVersion: 2, attempt: 1 })
    assert.equal(globalJobManager.getJob(id)?.logs?.length, 1)
    assert.equal(globalJobManager.getJob(id)?.logs?.[0].message, 'Retry')
    globalJobManager.receiveProgress({ submissionId: id, requestVersion: 1, attempt: 1, state: 'completed', currentTask: 'Old result', progressPercent: 100, logs: events })
    assert.equal(globalJobManager.getJob(id)?.currentTask, 'Retry')
    assert.equal('gradingLogs' in studentReportView({ gradingLogs: events }), false)
    assert.equal('lastGradingLogs' in studentReportView({ lastGradingLogs: events }), false)
  } finally { globalJobManager.clearJob(id) }
})

test('Docker unavailability emits a stage-2 cause and a stage-3 skip, without fabricated test outcomes', async () => {
  const { StdInOutProbeEngine } = await import('../src/modules/grading/engine/application/evaluator/StdInOutProbeEngine.js')
  const engine = new StdInOutProbeEngine() as any
  engine.detectLanguage = async () => ({ language: 'cpp', dockerImage: 'gcc:13' })
  engine.docker = { ping: async () => { throw new Error('connect ENOENT //./pipe/docker_engine') } }
  const previousFlag = process.env.STDIO_SANDBOX_ENABLED
  process.env.STDIO_SANDBOX_ENABLED = 'true'
  const events: any[] = []
  try {
    await assert.rejects(engine.evaluateAsync('mock-only', { requiredLanguage: 'C++', testCases: [] }, undefined, (event: any) => events.push(event)), /ENOENT/)
    assert.ok(events.some(event => event.stage === 1 && event.status === 'failed' && /Mở Docker Desktop/.test(event.message)))
    assert.ok(events.some(event => event.stage === 2 && event.status === 'skipped'))
    assert.equal(events.some(event => /PASS|Container.*Đã tạo/.test(event.message)), false)
  } finally { if (previousFlag === undefined) delete process.env.STDIO_SANDBOX_ENABLED; else process.env.STDIO_SANDBOX_ENABLED = previousFlag }
})

test('a later AI failure preserves the real console execution report instead of losing passed/failed cases', async () => {
  const { SubmissionController } = await import('../src/modules/grading/engine/modules/submissions/controllers/SubmissionController.js')
  const { prisma } = await import('../src/database/prisma.js')
  const { StdInOutProbeEngine } = await import('../src/modules/grading/engine/application/evaluator/StdInOutProbeEngine.js')
  const { globalJobManager } = await import('../src/modules/grading/engine/application/queue/SubmissionJobManager.js')
  const originalQuery = prisma.exam.findUnique
  const originalEvaluate = StdInOutProbeEngine.prototype.evaluateAsync
  const root = path.resolve('temp', 'ai-failure-evidence-' + Date.now())
  assert.ok(root.startsWith(path.resolve('temp') + path.sep))
  const saved: any[] = []
  const id = 'ai-partial-execution-test'
  try {
    await fs.mkdir(root, { recursive: true })
    await fs.writeFile(path.join(root, 'main.c'), 'int main(void) { return 0; }')
    ;(prisma.exam.findUnique as any) = async () => ({ Description: 'Ngôn ngữ C. Đọc stdin và ghi stdout.', AiGeneratedContent: JSON.stringify({ runtimeConfig: { language: 'C' } }), TestCase: [{ Id: 'TC01', Input: '1', ExpectedOutput: '2', IsHidden: false }] })
    StdInOutProbeEngine.prototype.evaluateAsync = async () => ({ compilationPassed: true, passed: false, confidence: .5, totalCases: 2, passedCases: 1, caseResults: [{ caseId: 'TC01', passed: true }, { caseId: 'TC02', passed: false }] } as any)
    const controller = new SubmissionController({ stopAsync: async () => {} } as any, {} as any, { evaluateAsync: async () => { throw new Error('AI_CODE_EVIDENCE_MISSING: mock provider invalid reference') } } as any) as any
    controller.historyRepo = { saveAsync: async (record: any) => saved.push(record) }
    globalJobManager.initJob(id)
    await controller.enqueueSubmissionJob(id, { id: 'exam', metadata: { projectType: 'algorithm' }, rubric: { rules: [{ scoringStrategy: 'AICodeReview' }], totalWeight: 10 } }, { assignmentId: 'exam', studentId: 'student' }, root, null)
    assert.equal(saved.length, 1)
    assert.match(saved[0].report.error, /AI_CODE_EVIDENCE_MISSING/)
    assert.equal(saved[0].report.consoleVerification.passedCases, 1)
    assert.equal(saved[0].report.consoleVerification.caseResults.length, 2)
    assert.equal(saved[0].report.compilationSummary.passed, true)
    assert.ok(saved[0].report.gradingLogs.length)
  } finally {
    prisma.exam.findUnique = originalQuery
    StdInOutProbeEngine.prototype.evaluateAsync = originalEvaluate
    globalJobManager.clearJob(id)
    await fs.rm(root, { recursive: true, force: true })
  }
})

test('published student reports retain hidden-case outcomes without exposing hidden input/output or compiler diagnostics', () => {
  const source = { consoleVerification: { caseResults: [{ caseId: 'hidden', isHidden: true, passed: false, input: 'secret-input', expected: 'secret-answer', actual: 'secret-output', stderr: 'secret-path' }, { caseId: 'public', isHidden: false, passed: true, input: '1', expected: '2' }] } }
  const view = studentReportView(source)
  assert.equal(JSON.stringify(view).includes('secret'), false)
  assert.equal(view.consoleVerification.caseResults[0].passed, false)
  assert.equal(view.consoleVerification.caseResults[1].expected, '2')
  assert.equal(source.consoleVerification.caseResults[0].input, 'secret-input')
})

test('console tests execute for an AI-only rubric as verification without changing the rubric score budget', async () => {
  const { verifyConsoleTests } = await import('../src/modules/grading/engine/application/evaluator/console-verification.js')
  const { StdInOutProbeEngine } = await import('../src/modules/grading/engine/application/evaluator/StdInOutProbeEngine.js')
  const original = StdInOutProbeEngine.prototype.evaluateAsync
  let calls = 0
  StdInOutProbeEngine.prototype.evaluateAsync = async () => { calls++; return { passed: false, totalCases: 1, passedCases: 0, confidence: 0, caseResults: [] } }
  try {
    const exam = { Description: 'Ngôn ngữ: C++\nĐọc stdin, ghi stdout một dòng.\nDòng đầu chứa số nguyên Q.', AiGeneratedContent: JSON.stringify({ runtimeConfig: { language: 'C++' } }), TestCase: [{ Id: 't1', Input: '1\nTOTAL', ExpectedOutput: 'TOTAL 0', IsHidden: false }] }
    const result = await verifyConsoleTests(exam, [{ scoringStrategy: 'AICodeReview', weight: 10 }], 'fixture')
    assert.equal(result?.status, 'completed')
    assert.equal(result?.scoringImpact, 'functional')
    assert.equal(calls, 1)
    exam.TestCase[0].Input = 'mô tả đề bài bị trích nhầm'
    assert.equal((await verifyConsoleTests(exam, [], 'fixture'))?.status, 'invalid_tests')
    assert.equal(calls, 1)
    assert.equal(await verifyConsoleTests(exam, [{ scoringStrategy: 'StdInOutProbe', requiredEvidence: [{ stdInOutProbe: { testCases: [{ id: 'test' }] } }] }], 'fixture'), null)
  } finally { StdInOutProbeEngine.prototype.evaluateAsync = original }
})

test('declared assignment language rejects C for C++, Java for Python and headers without implementation', () => {
  const cpp = examConfiguration({ AiGeneratedContent: JSON.stringify({ submissionFormat: { requiredLanguage: 'C++', entryFile: 'main.cpp' } }) })
  assert.throws(() => assertSubmissionLanguage(cpp, ['src/main.c']), /yêu cầu C\+\+/)
  assert.throws(() => assertSubmissionLanguage(cpp, ['include/main.hpp']), /Sai ngôn ngữ/)
  assert.throws(() => assertSubmissionLanguage(cpp, ['node_modules/fake/main.cpp', 'main.c']), /Sai ngôn ngữ/)
  assert.doesNotThrow(() => assertSubmissionLanguage(cpp, ['project/main.cpp', 'project/helpers.c']))
  assert.throws(() => assertSubmissionLanguage({ runtimeConfig: { language: 'Python' } }, ['Main.java']), /yêu cầu Python/)
  assert.throws(() => assertSubmissionLanguage({ runtimeConfig: { language: 'C' } }, ['main.cpp']), /yêu cầu C,/)
  assert.doesNotThrow(() => assertSubmissionLanguage({ runtimeConfig: { language: 'Java' } }, ['src/Main.java']))
  assert.doesNotThrow(() => assertSubmissionLanguage({}, ['legacy.txt']))
})

test('worker verifies extracted source and C++ runner never chooses a C program from a mixed ZIP', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aita-language-'))
  try {
    await fs.writeFile(path.join(root, 'main.c'), 'int main(){return 0;}')
    await assert.rejects(assertDirectorySubmissionLanguage({ runtimeConfig: { language: 'C++' } }, root), /Sai ngôn ngữ/)
    await fs.writeFile(path.join(root, 'main.cpp'), 'int main(){return 0;}')
    await assertDirectorySubmissionLanguage({ runtimeConfig: { language: 'C++' } }, root)
    const { StdInOutProbeEngine } = await import('../src/modules/grading/engine/application/evaluator/StdInOutProbeEngine.js')
    const engine = new StdInOutProbeEngine() as any
    const detection = await engine.detectLanguage(root, 'C++')
    assert.equal(detection.language, 'cpp')
    const candidates = await engine.findProgramCandidates(root, detection)
    assert.deepEqual(candidates.map((candidate: any) => candidate.label), ['main.cpp'])
    assert.match(candidates[0].buildCommand, /^g\+\+/)
  } finally {
    assert.ok(root.startsWith(path.resolve(os.tmpdir()) + path.sep))
    await fs.rm(root, { recursive: true, force: true })
  }
})

test('saved tests survive staff API projection; students cannot see hidden input/output and AI is not labelled manual', () => {
  const tests = [{ Id: 'public', Input: '1', ExpectedOutput: '2', IsHidden: false }, { Id: 'hidden', Input: 'secret-input', ExpectedOutput: 'secret-answer', IsHidden: true }, { Id: 'unknown', Input: 'private', IsHidden: null }]
  assert.equal(examTestCasesView(tests, true).length, 3)
  assert.deepEqual(examTestCasesView(tests, false).map(test => test.id), ['public'])
  const rule = { Id: 'r', Description: 'Inventory', MaxPoints: 2 }
  assert.equal(criterionView(rule, { ValidationType: 'AI', MaxPoints: 2 }).scoringStrategy, 'AICodeReview')
  assert.equal(criterionView(rule, { ValidationType: 'TestCase', MaxPoints: 2 }).scoringStrategy, 'StdInOutProbe')
  assert.equal(criterionView({ ...rule, IsManualOnly: true }, { ValidationType: 'AI' }).scoringStrategy, 'Manual')
})

test('assignment HTTP authorization blocks student writes and foreign instructor IDs before controller execution', async () => {
  let writes = 0
  const db = { exam: { findFirst: async ({ where }: any) => {
    const id = where.AND[0].Id
    const scope = where.AND[1]
    return id === 'owned' || Object.keys(scope).length === 0 ? { Id: id } : null
  } } }
  const app = express()
  app.use((req, _res, next) => { (req as any).user = { id: 'teacher', role: req.headers['x-role'] || 'STUDENT' }; next() })
  app.put('/:id', requireRoles('ADMIN', 'LECTURER'), requireAssignmentAccess(true, false, db), (_req, res) => { writes++; res.json({ saved: true }) })
  app.use((err: any, _req: any, res: any, _next: any) => res.status(err.statusCode || 500).json({ error: 'denied' }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${(server.address() as any).port}`
  try {
    assert.equal((await fetch(base + '/owned', { method: 'PUT', headers: { 'x-role': 'STUDENT' } })).status, 403)
    assert.equal((await fetch(base + '/foreign', { method: 'PUT', headers: { 'x-role': 'LECTURER' } })).status, 404)
    assert.equal(writes, 0)
    assert.equal((await fetch(base + '/owned', { method: 'PUT', headers: { 'x-role': 'LECTURER' } })).status, 200)
    assert.equal((await fetch(base + '/foreign', { method: 'PUT', headers: { 'x-role': 'ADMIN' } })).status, 200)
    assert.equal(writes, 2)
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})

test('publishing validates every class; student views never expose hidden tests, answer keys or class grades', async () => {
  const teacher = { id: 'teacher', role: 'LECTURER', email: '', fullName: '' }
  await assert.rejects(assertClassAccess(['own', 'foreign'], teacher, { class: { count: async () => 1 } }), /phụ trách/)
  await assert.rejects(assertClassAccess([], teacher), /lớp học/)
  await assert.rejects(assertClassesMatchSubject(['class'], 'wrong-subject', { class: { count: async () => 0 } }), /không khớp/)
  assert.throws(() => assignmentScope({ ...teacher, role: 'STUDENT' }, true))
  const visible = studentAssignmentView({ id: 'x', metadata: { totalPoints: 20 }, sqlSetupScript: 'secret', testSuites: ['hidden'], stats: { averageScore: 7 }, rubric: { rules: [{ id: 'r', title: 'CRUD', weight: 3, passCondition: 'Data persists offline', failCondition: 'Data lost on restart', referenceAnswer: 'secret', requiredEvidence: ['hidden'] }] } })
  assert.equal(JSON.stringify(visible).includes('secret'), false)
  assert.equal(JSON.stringify(visible).includes('hidden'), false)
  assert.equal(visible.rubric.rules[0].title, 'CRUD')
  assert.equal(visible.rubric.rules[0].passCondition, 'Data persists offline')
  assert.equal(visible.rubric.rules[0].failCondition, 'Data lost on restart')
  assert.equal(visible.metadata.totalPoints, 20)
})

test('legacy public ZIP URLs are blocked, including encoded paths; public avatars still work', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aita-private-test-'))
  const app = express()
  await fs.mkdir(path.join(root, 'submissions'))
  await fs.writeFile(path.join(root, 'submissions', 'private.zip'), 'private')
  await fs.writeFile(path.join(root, 'legacy.zip'), 'private legacy archive')
  await fs.writeFile(path.join(root, 'avatar.png'), 'avatar')
  app.use('/uploads', protectSubmissionUploads, express.static(root))
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${(server.address() as any).port}`
  try {
    for (const url of ['/uploads/submissions/private.zip', '/uploads/%73ubmissions/private.zip', '/uploads/submissions%2Fprivate.zip', '/uploads/legacy.zip', '/uploads/legacy%2Ezip']) assert.equal((await fetch(base + url)).status, 404)
    assert.equal((await fetch(base + '/uploads/avatar.png')).status, 200)
    process.env.PRIVATE_SUBMISSION_DIR = root
    assert.equal((await readSubmissionFile('/private-submissions/avatar.png')).toString(), 'avatar')
    await assert.rejects(resolveSubmissionFile('/private-submissions/../outside.zip'))
    await assert.rejects(readSubmissionFile('http://127.0.0.1/private.zip'), /không hợp lệ/)
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()))
    assert.ok(root.startsWith(path.resolve(os.tmpdir()) + path.sep))
    await fs.rm(root, { recursive: true, force: true })
    delete process.env.PRIVATE_SUBMISSION_DIR
  }
})

test('JWT query parameters cannot authenticate; logs recursively redact credentials', () => {
  let error: any
  authenticate({ headers: {}, query: { token: 'secret' } } as any, {} as any, value => { error = value })
  assert.equal(error.statusCode, 401)
  assert.equal(safeUrl('/stream?token=secret&x=1').includes('secret'), false)
  const safe = JSON.stringify(safeLogData({ nested: { password: 'secret', refreshToken: 'secret', apiKey: 'secret' }, url: '/stream?token=secret' }))
  assert.equal(safe.includes('secret'), false)
})

test('demo seed needs explicit local opt-in and is forbidden for production and shared databases', () => {
  const env = { NODE_ENV: 'development', ENABLE_DEV_SEED: 'true', DATABASE_URL: 'postgresql://user:password@localhost:5432/local' }
  assert.equal(canSeedDemoAccounts(env), true)
  assert.equal(canSeedDemoAccounts({ ...env, NODE_ENV: 'production' }), false)
  assert.equal(canSeedDemoAccounts({ ...env, ENABLE_DEV_SEED: 'false' }), false)
  assert.equal(canSeedDemoAccounts({ ...env, DATABASE_URL: 'postgresql://user:password@shared.example/db' }), false)
})

test('Android Gradle projects are never executed as Maven/Spring Boot servers', async () => {
  const { ExecutionSandboxService } = await import('../src/modules/grading/engine/application/sandbox/ExecutionSandboxService.js')
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aita-android-test-'))
  try {
    await fs.writeFile(path.join(root, 'build.gradle.kts'), 'plugins { id("com.android.application") }')
    const sandbox = new ExecutionSandboxService()
    const result = await sandbox.startAsync(root, 'mobile')
    assert.equal(result.runtimeStack, 'android')
    assert.equal(result.isReady, false)
    assert.equal(result.containerId, null)
    assert.match(result.crashLogs!, /not.*executed/i)
  } finally {
    assert.ok(root.startsWith(path.resolve(os.tmpdir()) + path.sep))
    await fs.rm(root, { recursive: true, force: true })
  }
})

test('result API never fabricates zero after failure and reads a remote worker result from the database', async () => {
  const { SubmissionController } = await import('../src/modules/grading/engine/modules/submissions/controllers/SubmissionController.js')
  const { prisma } = await import('../src/database/prisma.js')
  const { globalJobManager } = await import('../src/modules/grading/engine/application/queue/SubmissionJobManager.js')
  const delegate = prisma.submission as any
  const original = delegate.findUnique
  const id = 'fixture-result-api'
  let row: any = { Id: id, ExamId: 'exam', StudentId: 'student', ReviewStatus: 'DRAFT', FinalScore: 0, TotalScore: 10, Exam: { CreatedBy: 'admin' }, ReportData: JSON.stringify({ error: 'AI unavailable' }) }
  delegate.findUnique = async () => row
  const controller = new SubmissionController(null as any, null as any, null as any)
  let payload: any
  const response: any = { status() { return this }, json(value: any) { payload = value.Data } }
  const request: any = { params: { id }, user: { id: 'admin', role: 'ADMIN' } }
  try {
    await controller.getResult(request, response)
    assert.equal(payload.score, null)
    assert.equal(payload.gradingError, 'AI unavailable')
    row = { ...row, FinalScore: 7.5, ReportData: JSON.stringify({ totalScore: 7.5, maxPossibleScore: 10, passedRules: [{ ruleId: 'r1' }] }) }
    globalJobManager.receiveProgress({ submissionId: id, state: 'completed', progressPercent: 100, currentTask: 'remote worker' })
    await controller.getResult(request, response)
    assert.equal(payload.score, 7.5)
    assert.equal(payload.gradingError, null)
  } finally { delegate.findUnique = original; globalJobManager.clearJob(id) }
})
