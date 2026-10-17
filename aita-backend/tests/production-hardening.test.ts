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
  const visible = studentAssignmentView({ id: 'x', sqlSetupScript: 'secret', testSuites: ['hidden'], stats: { averageScore: 7 }, rubric: { rules: [{ id: 'r', title: 'CRUD', weight: 3, referenceAnswer: 'secret', requiredEvidence: ['hidden'] }] } })
  assert.equal(JSON.stringify(visible).includes('secret'), false)
  assert.equal(JSON.stringify(visible).includes('hidden'), false)
  assert.equal(visible.rubric.rules[0].title, 'CRUD')
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
