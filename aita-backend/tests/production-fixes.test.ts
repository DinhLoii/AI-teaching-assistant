import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import path from 'node:path'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/aita_test'
process.env.JWT_SECRET = 'production-regression-tests-only-secret-32chars'
const { createAuthenticate } = await import('../src/middleware/auth.js')
const { credentialVersion, newRefreshToken, refreshMatchesCredentials } = await import('../src/modules/auth/application/credential-version.js')
const { UserMapper } = await import('../src/modules/users/infrastructure/mappers/user.mapper.js')
const { PrismaUserRepository } = await import('../src/modules/users/infrastructure/repositories/prisma-user-repository.js')
const { PasswordResetAttempts } = await import('../src/modules/auth/application/password-reset-attempts.js')
const { assertAiSubmissionAccess } = await import('../src/modules/ai/application/ai-access.js')
const { AssessSubmissionUseCase } = await import('../src/modules/ai/application/use-cases/assess-submission.use-case.js')
const { ForgotPasswordUseCase } = await import('../src/modules/auth/application/use-cases/forgot-password.use-case.js')

const user = { Id: 'u1', Email: 'student@example.invalid', PasswordHash: 'test-hash', Status: 'Active', RequirePasswordChange: false, UserRole: [{ Role: { RoleName: 'STUDENT' } }] }
const actor = { id: 'u1', role: 'STUDENT', email: user.Email, fullName: 'Test' }
const payload = { userId: user.Id, role: 'STUDENT', email: user.Email, fullName: 'Test', credentialVersion: credentialVersion(user.PasswordHash), issuedAt: Date.now() }
async function authenticate(record: any = user, claims: any = payload, revoked = 0, url = '/api/classes') {
  const db = { user: { findUnique: async () => record }, systemConfig: { findUnique: async () => ({ Value: String(revoked) }) } }
  const req: any = { headers: { authorization: 'Bearer fixture' }, originalUrl: url }
  let error: any
  await createAuthenticate(db, { verify: () => claims } as any)(req, {} as any, (e?: any) => { error = e })
  return { req, error }
}

test('current active credential authenticates; password, status and role changes revoke existing access', async () => {
  assert.equal((await authenticate()).req.user.id, 'u1')
  for (const changed of [null, { ...user, Status: 'Inactive' }, { ...user, PasswordHash: 'rotated' }, { ...user, UserRole: [] }]) {
    assert.equal((await authenticate(changed)).error.statusCode, 401)
  }
  assert.equal((await authenticate(user, payload, payload.issuedAt)).error.statusCode, 401)
  assert.equal((await authenticate(user, { ...payload, credentialVersion: undefined })).error.statusCode, 401)
})

test('forced password change allows only account recovery routes and cannot be dismissed', async () => {
  const forced = { ...user, RequirePasswordChange: true }
  assert.equal((await authenticate(forced)).error.statusCode, 403)
  assert.equal((await authenticate(forced, payload, 0, '/api/auth/change-password')).error, undefined)
  assert.equal((await authenticate(forced, payload, 0, '/api/auth/dismiss-password-change')).error.statusCode, 403)
  const { DismissPasswordChangeUseCase } = await import('../src/modules/auth/application/use-cases/dismiss-password-change.use-case.js')
  await assert.rejects(new DismissPasswordChangeUseCase({ findById: async () => ({ requirePasswordChange: true }) } as any).execute('u1'), { statusCode: 403 })
})

test('authentication fails closed with 503 when account state cannot be checked', async () => {
  let error: any
  await createAuthenticate({ user: { findUnique: async () => { throw new Error('db down') } }, systemConfig: { findUnique: async () => null } }, { verify: () => payload } as any)(
    { headers: { authorization: 'Bearer fixture' }, originalUrl: '/api/classes' } as any, {} as any, (e: any) => { error = e })
  assert.equal(error.statusCode, 503)
})

test('password update revokes refresh and access sessions in the same transaction; stale credentials conflict', async () => {
  const calls: string[] = []
  let where: any
  const db: any = { user: { findUnique: async () => user, update: async (q: any) => { where = q.where; calls.push('user') } }, refreshToken: { updateMany: async () => calls.push('refresh') }, systemConfig: { upsert: async () => calls.push('access') } }
  db.$transaction = async (fn: any) => { calls.push('begin'); await fn(db); calls.push('commit') }
  const entity = UserMapper.toDomain(user as any)
  entity.changePassword('rotated')
  await new PrismaUserRepository(db).save(entity)
  assert.deepEqual(calls, ['begin', 'user', 'refresh', 'access', 'commit'])
  assert.equal(where.PasswordHash, 'test-hash')
  db.user.update = async () => { throw { code: 'P2025' } }
  await assert.rejects(new PrismaUserRepository(db).save(entity), { statusCode: 409 })
})

test('refresh tokens are tied to credentials and atomic consumption permits only one rotation', async () => {
  const token = newRefreshToken('old-hash')
  assert.equal(refreshMatchesCredentials(token, 'old-hash'), true)
  assert.equal(refreshMatchesCredentials(token, 'new-hash'), false)
  const { PrismaRefreshTokenRepository } = await import('../src/modules/auth/infrastructure/repositories/prisma-refresh-token.repository.js')
  let consumed = false
  const repo = new PrismaRefreshTokenRepository({ refreshToken: { updateMany: async (q: any) => { assert.equal(q.where.IsRevoked, false); const count = consumed ? 0 : 1; consumed = true; return { count } } } } as any)
  assert.deepEqual(await Promise.all([repo.consume('token-id'), repo.consume('token-id')]), [true, false])
})

test('OTP attempts persist between service instances and reject the sixth attempt', async () => {
  let Value: string | undefined
  let locks = 0
  const db: any = { systemConfig: { findUnique: async () => Value ? { Value } : null, upsert: async (q: any) => { Value = q.update.Value } }, $executeRaw: async () => { locks++ } }
  db.$transaction = async (fn: any) => fn(db)
  for (let i = 0; i < 5; i++) await new PasswordResetAttempts(db).consume('u1')
  await assert.rejects(new PasswordResetAttempts(db).consume('u1'), { statusCode: 429 })
  assert.equal(locks, 6)
  assert.equal(JSON.parse(Value!).count, 5)
})

test('password recovery stores only the OTP digest and does not report failed delivery as success', async () => {
  const entity = UserMapper.toDomain(user as any)
  let body = ''
  const uc = new ForgotPasswordUseCase({ findByEmail: async () => entity, save: async () => {} } as any, { sendEmail: async (_to: any, _subject: any, html: string) => { body = html; return false } })
  await assert.rejects(uc.execute({ dto: { email: user.Email } } as any), { statusCode: 503 })
  const otp = body.match(/\b\d{6}\b/)?.[0]
  assert.ok(otp)
  assert.equal(entity.resetPasswordOtp, createHash('sha256').update(otp).digest('hex'))
  assert.notEqual(entity.resetPasswordOtp, otp)
})

test('AI reads scope students to their published submissions; writes require authorized staff', async () => {
  let query: any
  const db = { submission: { findFirst: async (q: any) => { query = q; return null } } }
  await assert.rejects(assertAiSubmissionAccess('foreign', actor, false, db), { statusCode: 404 })
  assert.deepEqual(query.where.AND[1], { StudentId: 'u1', ReviewStatus: 'PUBLISHED' })
  await assert.rejects(assertAiSubmissionAccess('own', actor, true, db), { statusCode: 403 })
  let queued = 0
  const queue = { enqueue: async () => { queued++; return { state: 'QUEUED' } } }
  const uc = new AssessSubmissionUseCase({ getClient: () => db } as any, {} as any, {} as any, queue as any)
  await assert.rejects(uc.execute('foreign', { ...actor, role: 'LECTURER' }), { statusCode: 404 })
  assert.equal(queued, 0)
  db.submission.findFirst = async () => ({ Id: 'own' }) as any
  assert.deepEqual(await uc.execute('own', { ...actor, role: 'ADMIN' }), { state: 'QUEUED' })
  assert.equal(queued, 1)
})

test('all durable file roots follow the configured persistent disk', async () => {
  const previous = process.env.RUNTIME_DATA_DIR
  const privatePrevious = process.env.PRIVATE_SUBMISSION_DIR
  try {
    process.env.RUNTIME_DATA_DIR = path.resolve('temp', 'storage-fixture')
    delete process.env.PRIVATE_SUBMISSION_DIR
    const storage = await import('../src/shared/infrastructure/runtime-storage.js')
    const { privateSubmissionRoot } = await import('../src/modules/submissions/infrastructure/submission-storage.js')
    for (const root of [storage.publicUploadsRoot(), storage.artifactFilesRoot(), privateSubmissionRoot()]) assert.ok(root.startsWith(process.env.RUNTIME_DATA_DIR + path.sep))
  } finally {
    if (previous === undefined) delete process.env.RUNTIME_DATA_DIR; else process.env.RUNTIME_DATA_DIR = previous
    if (privatePrevious === undefined) delete process.env.PRIVATE_SUBMISSION_DIR; else process.env.PRIVATE_SUBMISSION_DIR = privatePrevious
  }
})

test('production email cannot silently fall back to mocked delivery', async () => {
  const keys = ['NODE_ENV', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'RESEND_API_KEY', 'EMAIL_FROM']
  const saved = keys.map(k => process.env[k])
  try {
    for (const key of keys) delete process.env[key]
    process.env.NODE_ENV = 'production'
    const { NodemailerService } = await import('../src/shared/infrastructure/email/nodemailer.service.js')
    await assert.rejects(new NodemailerService().sendEmail('test@example.invalid', 'Fixture', '<p>Test</p>'), { statusCode: 503 })
  } finally { keys.forEach((k,i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i] }) }
})

test('AI-generated reference solvers remain data and never run in the API process', async () => {
  const { AiClientManager } = await import('../src/modules/grading/engine/infrastructure/ai/AiClientManager.js')
  const { GeminiAiProvider } = await import('../src/modules/grading/engine/infrastructure/ai/GeminiAiProvider.js')
  const original = AiClientManager.executeWithFallback
  ;(globalThis as any).__aitaSolverExecuted = false
  try {
    AiClientManager.executeWithFallback = async () => ({ choices: [{ message: { content: JSON.stringify({ r1: { type: 'stdio', config: {
      javascriptSolver: 'function solve(input) { globalThis.__aitaSolverExecuted = true; return "unsafe" }',
      testCases: [{ input: '1', expectedOutput: '2' }, { input: 'missing' }],
    } } }) } }] }) as any
    const rules = await new GeminiAiProvider().generateRubricRulesAsync([{ id: 'r1', title: 'Sum', description: 'Add one', marks: 10 }] as any, 'algorithm')
    assert.equal((globalThis as any).__aitaSolverExecuted, false)
    assert.equal('javascriptSolver' in rules[0].requiredEvidence[0].stdInOutProbe, false)
    assert.deepEqual(rules[0].requiredEvidence[0].stdInOutProbe.testCases, [{ input: '1', expectedOutput: '2' }])
  } finally { AiClientManager.executeWithFallback = original; delete (globalThis as any).__aitaSolverExecuted }
})

test('student tutor context excludes hidden execution output and private reference knowledge', async () => {
  const { RagEngineService } = await import('../src/modules/ai/infrastructure/rag/rag-engine.service.js')
  const { AiClientManager } = await import('../src/modules/grading/engine/infrastructure/ai/AiClientManager.js')
  const original = AiClientManager.executeWithFallback
  let seen: any[] = []
  const kb = {
    getPublicAssignmentKnowledge: async () => [{ content: 'public', docType: 'ASSIGNMENT_SPEC' }],
    getAssignmentKnowledge: async () => { throw new Error('Private assignment context must not be read') },
    getSubmissionKnowledge: async () => [{ content: 'source', docType: 'STUDENT_SOURCE_FILE' }, { content: 'hidden-answer', docType: 'EXECUTION_LOG' }],
    getCuratedPedagogicalKnowledge: () => [],
  }
  const retriever = { retrieveRelevantChunks: (_q: any, chunks: any[]) => { seen = chunks; return chunks }, assembleContext: () => ({ assembledContext: 'public source', sourcesUsed: [] }) }
  try {
    AiClientManager.executeWithFallback = async () => ({ choices: [{ message: { content: 'Advice' } }] }) as any
    await new RagEngineService(kb as any, retriever as any).chat({ role: 'STUDENT', query: 'Explain', examId: 'e', submissionId: 's' })
    assert.deepEqual(seen.map(c => c.content), ['public', 'source'])
  } finally { AiClientManager.executeWithFallback = original }
})

test('class read and roster guards reject unrelated students and lecturers before controller work', async () => {
  const { prisma } = await import('../src/database/prisma.js')
  const { ClassesController } = await import('../src/modules/classes/presentation/classes.controller.js')
  const originals = { cls: prisma.class.findFirst, instructor: prisma.instructorClass.findFirst }
  let query: any
  try {
    ;(prisma.class.findFirst as any) = async (q: any) => { query = q; return null }
    ;(prisma.instructorClass.findFirst as any) = async () => null
    const controller = Object.create(ClassesController.prototype) as any
    await assert.rejects(controller.assertCanReadClass(actor, 'SE19'), { statusCode: 404 })
    assert.deepEqual(query.where.StudentClass, { some: { UserId: 'u1' } })
    await assert.rejects(controller.getStudents({ user: { ...actor, role: 'LECTURER' }, params: { id: 'foreign' } }, {}), { statusCode: 403 })
    await assert.rejects(controller.update({ user: { ...actor, role: 'LECTURER' }, params: { id: 'foreign' }, body: {} }, {}), { statusCode: 403 })
  } finally { prisma.class.findFirst = originals.cls; prisma.instructorClass.findFirst = originals.instructor }
})

test('production preserves default credentials at owner request while still enforcing migration baseline', async () => {
  const bcrypt = await import('bcryptjs')
  const { ACCOUNTS } = await import('../src/database/dev-seed.js')
  const { assertProductionPreflight } = await import('../src/database/production-preflight.js')
  const fixture = ACCOUNTS[0]
  const hash = await bcrypt.hash(fixture.password, 4)
  const account = Object.freeze({ Id: 'fixture', Email: fixture.email, PasswordHash: hash, Status: 'Active' })
  const db: any = { user: { findMany: async () => [account] }, $queryRaw: async () => [{ ledger: null }] }
  await assert.rejects(assertProductionPreflight(db), /migration baseline is not recorded/)
  assert.equal(account.PasswordHash, hash)
  assert.equal(account.Status, 'Active')
})

test('AI assignment saves use the transaction client and propagate class-link failures for rollback', async () => {
  const { SaveAiAssignmentUseCase } = await import('../src/modules/ai/application/use-cases/save-ai-assignment.use-case.js')
  const events: string[] = []
  const db = { class: { count: async () => 1 }, exam: { create: async () => { events.push('exam'); return { Id: 'e' } } }, examClass: { create: async () => { throw new Error('fixture link failure') } } }
  const uow = {
    getClient: () => { throw new Error('Root client must not be used') },
    runInTransaction: async (work: any) => { try { await work({ getClient: () => db }); events.push('commit') } catch (error) { events.push('rollback'); throw error } },
  }
  const useCase = new SaveAiAssignmentUseCase(uow as any)
  await assert.rejects(useCase.execute({ user: actor, creatorId: actor.id, dto: {} }), { statusCode: 403 })
  await assert.rejects(useCase.execute({ user: { ...actor, role: 'ADMIN' }, creatorId: actor.id, dto: { classId: 'class', subjectId: 'subject', title: 'Fixture' } }), /fixture link failure/)
  assert.deepEqual(events, ['exam', 'rollback'])
})

test('email remains required by default and demo opt-out bypasses only mail configuration', async () => {
  const { assertProductionEmailConfiguration } = await import('../src/shared/application/email-policy.js')
  assert.throws(() => assertProductionEmailConfiguration({}), /Production requires an email provider/)
  assert.throws(() => assertProductionEmailConfiguration({ EMAIL_ENABLED: 'true' }), /Production requires an email provider/)
  assert.doesNotThrow(() => assertProductionEmailConfiguration({ EMAIL_ENABLED: 'false' }))
  assert.doesNotThrow(() => assertProductionEmailConfiguration({ RESEND_API_KEY: 'fixture-only', EMAIL_FROM: 'test@example.invalid' }))
})

test('disabled mail rejects delivery and all password-recovery paths before touching user data', async () => {
  const previous = process.env.EMAIL_ENABLED
  try {
    process.env.EMAIL_ENABLED = 'false'
    const { NodemailerService } = await import('../src/shared/infrastructure/email/nodemailer.service.js')
    await assert.rejects(new NodemailerService().sendEmail('test@example.invalid', 'Fixture', '<p>Test</p>'), { statusCode: 503 })
    const unavailableRepo = new Proxy({}, { get: () => { throw new Error('Account data must remain untouched') } })
    await assert.rejects(new ForgotPasswordUseCase(unavailableRepo as any, {} as any).execute({ dto: { email: user.Email } } as any), { statusCode: 503 })
    const { ResetPasswordUseCase: OtpReset } = await import('../src/modules/auth/application/use-cases/reset-password.use-case.js')
    await assert.rejects(new OtpReset(unavailableRepo as any, {} as any).execute({ dto: { email: user.Email, otp: '123456', newPassword: 'fixture-only' } } as any), { statusCode: 503 })
    const { ResetPasswordUseCase: AdminReset } = await import('../src/modules/users/application/use-cases/reset-password.use-case.js')
    await assert.rejects(new AdminReset(unavailableRepo as any, {} as any, {} as any, {} as any).execute('u1'), { statusCode: 503 })
    const { assertProductionPreflight } = await import('../src/database/production-preflight.js')
    await assert.rejects(assertProductionPreflight({ user: { findMany: async () => [] }, $queryRaw: async () => [{ ledger: null }] }), /migration baseline is not recorded/)
  } finally { if (previous === undefined) delete process.env.EMAIL_ENABLED; else process.env.EMAIL_ENABLED = previous }
})

test('demo schema validation rejects missing columns, incompatible types and unexpected nulls', async () => {
  const { assertRuntimeSchema } = await import('../src/database/runtime-schema-check.js')
  const models = [{ name: 'Fixture', fields: [{ name: 'Id', kind: 'scalar', type: 'String', isList: false, isRequired: true }] }]
  const db = (columns: any[]) => ({ $queryRaw: async () => columns })
  assert.deepEqual(await assertRuntimeSchema(db([{ table_name: 'Fixture', column_name: 'Id', udt_name: 'text', is_nullable: 'NO' }]), models), { models: 1, columns: 1 })
  await assert.rejects(assertRuntimeSchema(db([]), models), /Fixture.Id: missing/)
  await assert.rejects(assertRuntimeSchema(db([{ table_name: 'Fixture', column_name: 'Id', udt_name: 'int4', is_nullable: 'NO' }]), models), /incompatible type/)
  await assert.rejects(assertRuntimeSchema(db([{ table_name: 'Fixture', column_name: 'Id', udt_name: 'text', is_nullable: 'YES' }]), models), /must be NOT NULL/)
})

test('schema mode checks all current Prisma model columns without changing or claiming migration history', async () => {
  const { Prisma } = await import('@prisma/client')
  const { assertMigrationReadiness } = await import('../src/database/production-preflight.js')
  const types: Record<string, string> = { String: 'text', DateTime: 'timestamp', Boolean: 'bool', Int: 'int4', Decimal: 'numeric', BigInt: 'int8' }
  const columns = Prisma.dmmf.datamodel.models.flatMap(m => m.fields.filter(f => f.kind !== 'object').map(f => ({ table_name: m.dbName || m.name, column_name: f.dbName || f.name, udt_name: types[f.type], is_nullable: f.isRequired ? 'NO' : 'YES' })))
  let reads = 0
  const db = { $queryRaw: async (sql: TemplateStringsArray) => { reads++; assert.match(sql.join(''), /information_schema.columns/); return columns } }
  await assertMigrationReadiness(db, 'schema')
  assert.equal(reads, 1)
  await assert.rejects(assertMigrationReadiness(db, 'skip'), /MIGRATION_CHECK_MODE must be/)
  assert.equal(reads, 1)
  await assert.rejects(assertMigrationReadiness({ $queryRaw: async () => [{ ledger: null }] }, 'history'), /migration baseline is not recorded/)
})

test('listing users maps database rows without losing the mapper security-state context', async () => {
  const repo = new PrismaUserRepository({ user: { findMany: async () => [user, { ...user, Id: 'u2' }] } })
  const users = await repo.findMany({}, { skip: 0, take: 10 })
  assert.deepEqual(users.map(u => u.id), ['u1', 'u2'])
  assert.equal(UserMapper.securityState(users[0])?.PasswordHash, user.PasswordHash)
  assert.equal(UserMapper.securityState(users[1])?.Status, 'Active')
})
