// Isolated audit probes. Database and AI collaborators are replaced with fixtures.
// No real accounts, submissions, grades, emails or external AI requests are changed.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createServer } from 'node:http'
import { SaveAiAssignmentUseCase } from '../../aita-backend/src/modules/ai/application/use-cases/save-ai-assignment.use-case.ts'
import { AssessSubmissionUseCase } from '../../aita-backend/src/modules/ai/application/use-cases/assess-submission.use-case.ts'
import { StudentPortalController } from '../../aita-backend/src/modules/student-portal/presentation/student-portal.controller.ts'
import { createApp } from '../../aita-backend/src/app.ts'
import { container } from '../../aita-backend/src/shared/infrastructure/di-container.ts'
import { TOKENS } from '../../aita-backend/src/shared/infrastructure/tokens.ts'
import { JwtTokenService } from '../../aita-backend/src/shared/infrastructure/jwt-token-service.ts'
import { prisma } from '../../aita-backend/src/database/prisma.ts'
import { PrismaUnitOfWork } from '../../aita-backend/src/shared/infrastructure/prisma-unit-of-work.ts'
import { GeminiAiProvider } from '../../aita-backend/src/modules/grading/engine/infrastructure/ai/GeminiAiProvider.ts'
import { AiClientManager } from '../../aita-backend/src/modules/grading/engine/infrastructure/ai/AiClientManager.ts'

const results = []
const record = (id, title, evidence) => results.push({ id, title, confirmed: true, evidence })
const silent = { debug() {}, info() {}, warn() {}, error() {} }

const writes = []
const fakeClient = {
  class: { findUnique: async () => ({ SubjectId: 'foreign-subject' }) },
  exam: { create: async ({ data }) => { writes.push(data); return data } },
  examClass: { create: async ({ data }) => { writes.push(data); return data } },
}
const save = new SaveAiAssignmentUseCase({ runInTransaction: fn => fn({ getClient() { throw Error('transaction client is never used') } }), getClient: () => fakeClient })
await save.execute({ dto: { title: 'Audit fixture', classId: 'foreign-class', publish: true }, creatorId: 'student-fixture' })
assert.equal(writes[0].CreatedBy, 'student-fixture')
assert.equal(writes[0].Status, 'Published')
assert.equal(writes[1].ClassId, 'foreign-class')
record('AUTH-AI-SAVE', 'Student identity can create and publish an AI assignment for an arbitrary class', { creatorRole: 'STUDENT', published: true, foreignClassAccepted: true, transactionClientIgnored: true })

const grade = { Id: 'other-student-submission', StudentId: 'other-student', FinalScore: 9, RawScore: 9, ReviewStatus: 'PUBLISHED', GradingStatus: 'Graded', ReportData: 'original report' }
const assess = new AssessSubmissionUseCase({
  resolve: () => ({ findById: async () => grade }),
  prisma: { submission: { update: async ({ data }) => Object.assign(grade, data) } },
}, {}, { logInteraction: async () => {} }, {
  execute: async () => ({ aiScore: 4, rubricSource: 'OFFICIAL_TEACHER_RUBRIC', overallVerdict: 'fixture', strengths: [], areasForImprovement: [] }),
})
await assess.execute(grade.Id)
assert.equal(grade.FinalScore, 4)
assert.equal(grade.ReviewStatus, 'PUBLISHED')
assert.equal(grade.GradingStatus, 'GRADED_BY_AI')
record('GRADE-AI-OVERWRITE', 'Latent update branch overwrites published grades without resetting publication; exercised only with an injected fixture client', { runtimeScope: 'injected-fixture-client-not-current-production-DI', oldScore: 9, newScore: grade.FinalScore, stillPublished: grade.ReviewStatus === 'PUBLISHED', statusIncompatibleWithGradebook: grade.GradingStatus })

const realUow = new PrismaUnitOfWork({})
realUow.registerFactory(TOKENS.SubmissionRepository, () => ({ findById: async () => grade }))
const brokenAssessment = new AssessSubmissionUseCase(realUow, {}, { logInteraction: async () => {} }, { execute: async () => ({ aiScore: 4 }) })
await assert.rejects(() => brokenAssessment.execute(grade.Id), /No repository factory registered for token: Symbol\(PrismaClient\)/)
record('AI-ASSESS-DI', 'Current UoW wiring fails after assessment because PrismaClient has no registered factory', { actualUowClass: 'PrismaUnitOfWork', error: 'No repository factory registered for token: Symbol(PrismaClient)' })

const originalAi = AiClientManager.executeWithFallback
try {
  AiClientManager.executeWithFallback = async () => ({ choices: [{ message: { content: JSON.stringify({ p1: { type: 'stdio', config: {
    javascriptSolver: 'function solve(input) { return process.version; }', testCases: [{ input: 'fixture', expectedOutput: '' }],
  } } }) } }] })
  const rules = await new GeminiAiProvider().generateRubricRulesAsync([{ id: 'p1', title: 'Audit fixture', description: 'Fixture', marks: 10 }], 'algorithm')
  assert.equal(rules[0].requiredEvidence[0].stdInOutProbe.testCases[0].expectedOutput, process.version)
  record('AI-HOST-EXECUTION', 'Model-produced reference solver runs in the backend process and can access the process global', { benignProbeOnly: true, readHostNodeVersion: true, noTimeoutBoundary: true })
} finally { AiClientManager.executeWithFallback = originalAi }

const portal = new StudentPortalController(silent, {
  class: { findFirst: async () => ({ Id: 'foreign-class', ClassCode: 'FOREIGN', Subject: null, Semester: null, InstructorClass: [], ExamClass: [], StudentClass: [{ UserId: 'victim', User: { Id: 'victim', FullName: 'Fixture Student', Email: 'fixture@example.invalid', StudentCode: 'FIXTURE' } }] }) },
  notification: { findMany: async () => [] },
})
let response
const res = { status() { return this }, json(value) { response = value; return this } }
await portal.getClassDetail({ user: { id: 'not-enrolled-student', role: 'STUDENT' }, params: { id: 'foreign-class' } }, res)
const portalData = response.data ?? response.Data
assert.equal(portalData.students[0].email, 'fixture@example.invalid')
record('ROSTER-IDOR', 'A non-enrolled student receives another class roster and contact information', { nonEnrolledCaller: true, rosterRowsReturned: portalData.students.length, contactInformationReturned: true })

const ai = container.get('AiController'), classes = container.get('ClassController'), auth = container.get(TOKENS.AuthController)
const originals = [ai.saveAssignmentFromAI, ai.assessSubmission, classes.update, auth.login]
ai.saveAssignmentFromAI = async (_req, res) => res.status(201).json({ reached: true })
ai.assessSubmission = async (_req, res) => res.status(200).json({ reached: true })
classes.update = async (_req, res) => res.status(200).json({ reached: true })
auth.login = async (_req, res) => res.status(200).json({ fixture: true })
const server = createServer(createApp())
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}/api`
  const tokens = new JwtTokenService()
  const student = tokens.sign({ userId: 'student-fixture', role: 'STUDENT', email: 'fixture@example.invalid', fullName: 'Fixture' })
  const lecturer = tokens.sign({ userId: 'lecturer-fixture', role: 'LECTURER', email: 'fixture@example.invalid', fullName: 'Fixture' })
  async function request(path, method = 'GET', token) {
    const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, ...(method !== 'GET' ? { body: '{}' } : {}) })
    await res.arrayBuffer(); return res.status
  }
  const saveStatus = await request('/ai/save-assignment', 'POST', student)
  const assessStatus = await request('/ai/assess/other-submission', 'POST', student)
  const foreignClassStatus = await request('/classes/foreign-class', 'PATCH', lecturer)
  const gradebookDenied = await request('/classes/foreign-class/gradebook', 'GET', student)
  assert.equal(saveStatus, 201); assert.equal(assessStatus, 200); assert.equal(foreignClassStatus, 200); assert.equal(gradebookDenied, 403)
  record('HTTP-ROLES', 'Actual HTTP middleware permits student AI writes and any lecturer class updates while gradebook denies students', { studentAiSave: saveStatus, studentAiAssess: assessStatus, lecturerForeignClassUpdate: foreignClassStatus, studentGradebook: gradebookDenied })
  const loginStatuses = []
  for (let i = 0; i < 120; i++) loginStatuses.push(await request('/auth/login', 'POST'))
  assert.ok(loginStatuses.every(status => status === 200))
  record('AUTH-RATE-LIMIT', 'Authentication route has no active rate limit', { attemptsInOneProcess: 120, acceptedByMiddleware: loginStatuses.length, rateLimited: loginStatuses.filter(s => s === 429).length })
} finally {
  ;[ai.saveAssignmentFromAI, ai.assessSubmission, classes.update, auth.login] = originals
  await new Promise(resolve => server.close(resolve))
  await prisma.$disconnect()
}

const summary = { date: '2026-10-31', mode: 'isolated-fixtures-no-live-writes', probes: results }
await fs.writeFile(new URL('./readiness-probes.json', import.meta.url), JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary, null, 2))
