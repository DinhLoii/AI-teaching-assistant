import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@127.0.0.1:5432/aita_test'
process.env.JWT_SECRET = 'integration-test-secret-at-least-32-characters'
const { DurableGradingQueue } = await import('../src/modules/grading/engine/application/queue/durable-grading-queue.js')
const { gradingLease, gradingLeaseScope } = await import('../src/modules/grading/engine/application/queue/grading-lease.js')
const { globalJobManager } = await import('../src/modules/grading/engine/application/queue/SubmissionJobManager.js')
const { assertAssignmentAccess, assertClassAccess } = await import('../src/modules/grading/engine/assignment/assignment-access.js')
const { RealtimeBus } = await import('../src/shared/infrastructure/realtime-bus.js')
const { PrismaSubmissionRepository } = await import('../src/modules/submissions/infrastructure/repositories/prisma-submission-repository.js')
const { Submission } = await import('../src/modules/submissions/domain/entities/submission.entity.js')
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
after(async () => { await db.$disconnect() })
const enabled = !!process.env.TEST_DATABASE_URL
const fixture = async () => db.submission.create({ data: { Id: randomUUID(), SubmittedAt: new Date(), ZipFileUrl: '/private-submissions/test.zip', ReviewStatus: 'DRAFT' } })

test('PostgreSQL enforces instructor scope and student enrollment with actual relational data', { skip: !enabled }, async () => {
  const teacher = await db.user.create({ data: { FullName: 'Test instructor' } })
  const other = await db.user.create({ data: { FullName: 'Other instructor' } })
  const student = await db.user.create({ data: { FullName: 'Test student' } })
  const cls = await db.class.create({ data: { InstructorClass: { create: { UserId: teacher.Id } }, StudentClass: { create: { UserId: student.Id } } } })
  const exam = await db.exam.create({ data: { CreatedBy: other.Id, Status: 'Published', IsDeleted: false, ExamClass: { create: { ClassId: cls.Id } } } })
  const user = (id: string, role: string) => ({ id, role, email: '', fullName: '' })
  await assertAssignmentAccess(exam.Id, user(teacher.Id, 'LECTURER'), true, db)
  await assertAssignmentAccess(exam.Id, user(student.Id, 'STUDENT'), false, db)
  await assert.rejects(assertAssignmentAccess(exam.Id, user(randomUUID(), 'LECTURER'), true, db))
  await assert.rejects(assertAssignmentAccess(exam.Id, user(student.Id, 'STUDENT'), true, db))
  await assert.rejects(assertClassAccess([cls.Id], user(other.Id, 'LECTURER'), db))
})

test('durable queue deduplicates parallel requests, serializes continuous work and fences expired attempts', { skip: !enabled }, async () => {
  const first = await fixture(), second = await fixture()
  const q1 = new DurableGradingQueue(db), q2 = new DurableGradingQueue(db)
  const results = await Promise.all([q1.enqueue(first.Id), q2.enqueue(first.Id)])
  assert.equal(results.filter(r => r.accepted).length, 1)
  await q2.enqueue(second.Id)
  const claims = await Promise.all([q1.claim(), q2.claim()])
  const active = claims.find(Boolean)!
  assert.equal(claims.filter(Boolean).length, 1)
  assert.equal(active.SubmissionId, first.Id)
  await db.$executeRaw`UPDATE "SubmissionGradingTask" SET "LeaseUntil"=NOW()-INTERVAL '1 second' WHERE "SubmissionId"=${first.Id}`
  const fencedWrite = () => db.submission.updateMany({ where: { Id: first.Id, ...gradingLeaseScope() }, data: { RawScore: 8 } })
  assert.equal((await gradingLease.run({ owner: active.LeaseOwner }, fencedWrite)).count, 0)
  const recovered = (await new DurableGradingQueue(db).claim())!
  assert.equal(recovered.SubmissionId, first.Id)
  assert.equal(recovered.Attempts, 2)
  assert.notEqual(recovered.LeaseOwner, active.LeaseOwner)
  const write = () => db.submission.updateMany({ where: { Id: first.Id, ...gradingLeaseScope() }, data: { RawScore: 8 } })
  assert.equal((await gradingLease.run({ owner: active.LeaseOwner }, write)).count, 0)
  assert.equal((await gradingLease.run({ owner: recovered.LeaseOwner }, write)).count, 1)
  await db.submissionGradingTask.updateMany({ data: { Status: 'completed', LeaseOwner: null, LeaseUntil: null } })
})

test('upload attempts and durable tasks commit together; queue failure rolls back the attempted upload', { skip: !enabled }, async () => {
  const user = await db.user.create({ data: { FullName: 'Submission fixture' } })
  const cls = await db.class.create({ data: {} })
  const exam = await db.exam.create({ data: { GradingStrategy: 'CONTINUOUS_QUEUE' } })
  const repository = new PrismaSubmissionRepository(db)
  const first = Submission.create(randomUUID(), user.Id, exam.Id, cls.Id, 1, '/private-submissions/first.zip')
  await repository.createAttempt(first)
  await db.submission.update({ where: { Id: first.id }, data: { FinalScore: 6 } })
  const second = Submission.create(randomUUID(), user.Id, exam.Id, cls.Id, 1, '/private-submissions/second.zip')
  await repository.createAttempt(second)
  assert.equal((await db.submission.findUniqueOrThrow({ where: { Id: first.id } })).FinalScore?.toNumber(), 6)
  assert.equal((await db.submission.findUniqueOrThrow({ where: { Id: second.id } })).AttemptNumber, 2)
  const failingRepository = new PrismaSubmissionRepository({ $transaction: (callback: any, options: any) => db.$transaction(async tx => callback(new Proxy(tx, { get(target, name) {
    if (name === '$executeRaw') return (parts: TemplateStringsArray, ...values: any[]) => {
      if (parts.join('').includes('INSERT INTO "SubmissionGradingTask"')) throw new Error('Simulated queue persistence failure')
      return target.$executeRaw(parts, ...values)
    }
    return Reflect.get(target, name)
  } })), options) } as any)
  const third = Submission.create(randomUUID(), user.Id, exam.Id, cls.Id, 1, '/private-submissions/third.zip')
  await assert.rejects(failingRepository.createAttempt(third), /queue persistence/)
  assert.equal(await db.submission.findUnique({ where: { Id: third.id } }), null)
  assert.equal((await db.submission.findUniqueOrThrow({ where: { Id: second.id } })).IsLatest, true)
  assert.equal(await db.submissionGradingTask.count({ where: { SubmissionId: { in: [first.id, second.id] } } }), 2)
  await db.submissionGradingTask.updateMany({ where: { SubmissionId: { in: [first.id, second.id] } }, data: { Status: 'completed' } })
})

test('transient grading failure retries; cancellation preserves the previous completed grade', { skip: !enabled }, async () => {
  const row = await fixture()
  const queue = new DurableGradingQueue(db)
  await queue.enqueue(row.Id, 'batch')
  const task = (await queue.claim())!
  await (queue as any).run(task, async () => { throw new Error('Provider unavailable 503') })
  const pending = await db.submissionGradingTask.findUniqueOrThrow({ where: { SubmissionId: row.Id } })
  assert.equal(pending.Status, 'pending')
  assert.equal(pending.Attempts, 1)
  await db.submissionGradingTask.update({ where: { SubmissionId: row.Id }, data: { AvailableAt: new Date(0) } })
  const retry = (await queue.claim())!
  await (queue as any).run(retry, async () => {
    globalJobManager.initJob(row.Id)
    await db.submission.update({ where: { Id: row.Id }, data: { GradingStatus: 'GRADED', ReportData: JSON.stringify({ totalScore: 8, passedRules: [{ ruleId: 'r1' }] }) } })
    globalJobManager.completeJob(row.Id, { totalScore: 8 })
  })
  const completed = await db.submissionGradingTask.findUniqueOrThrow({ where: { SubmissionId: row.Id } })
  assert.equal(completed.Status, 'completed')
  assert.equal(completed.LastError, null)
  await queue.enqueue(row.Id, 'batch')
  assert.equal((await db.submission.findUniqueOrThrow({ where: { Id: row.Id } })).ReviewStatus, 'DRAFT')
  await db.submission.update({ where: { Id: row.Id }, data: { RawScore: 6, FinalScore: 6, ReportData: JSON.stringify({ totalScore: 6, passedRules: [{ ruleId: 'r1' }] }) } })
  await queue.cancel(row.Id)
  const saved = await db.submission.findUniqueOrThrow({ where: { Id: row.Id } })
  assert.equal(Number(saved.FinalScore), 6)
  assert.equal(JSON.parse(saved.ReportData!).totalScore, 6)
  assert.equal((await db.submissionGradingTask.findUniqueOrThrow({ where: { SubmissionId: row.Id } })).Status, 'cancelled')
})

test('a late evaluator cannot replace the current attempt progress', () => {
  const id = randomUUID()
  gradingLease.run({ owner: 'new-attempt', startedAt: 200 }, () => globalJobManager.initJob(id))
  gradingLease.run({ owner: 'old-attempt', startedAt: 100 }, () => globalJobManager.failJob(id, 'stale failure'))
  assert.equal(globalJobManager.getJob(id)?.state, 'queued')
  globalJobManager.clearJob(id)
})

test('progress frames cannot regress to a previous retry or move backwards after completion', () => {
  const id = randomUUID()
  globalJobManager.receiveProgress({ submissionId: id, state: 'processing', progressPercent: 80, currentTask: 'current', requestVersion: 10, attempt: 2 })
  globalJobManager.receiveProgress({ submissionId: id, state: 'completed', progressPercent: 100, currentTask: 'old', requestVersion: 10, attempt: 1 })
  assert.equal(globalJobManager.getJob(id)?.currentTask, 'current')
  globalJobManager.receiveProgress({ submissionId: id, state: 'processing', progressPercent: 30, currentTask: 'out of order', requestVersion: 10, attempt: 2 })
  assert.equal(globalJobManager.getJob(id)?.progressPercent, 80)
  globalJobManager.receiveProgress({ submissionId: id, state: 'completed', progressPercent: 100, currentTask: 'done', requestVersion: 10, attempt: 2 })
  globalJobManager.receiveProgress({ submissionId: id, state: 'processing', progressPercent: 90, currentTask: 'late', requestVersion: 10, attempt: 2 })
  assert.equal(globalJobManager.getJob(id)?.state, 'completed')
  globalJobManager.clearJob(id)
})

test('independent API processes relay persisted events once without echoing their own messages', { skip: !enabled }, async () => {
  const sender = new RealtimeBus(db), receiver = new RealtimeBus(db)
  const events: any[] = [], echoes: any[] = []
  receiver.subscribe('fixture', value => events.push(value))
  sender.subscribe('fixture', value => echoes.push(value))
  sender.start(); receiver.start()
  try {
    sender.publish('fixture', { userId: 'test-user', event: { type: 'ALL_READ' } })
    for (let i = 0; i < 30 && events.length === 0; i++) { await new Promise(resolve => setTimeout(resolve, 30)); await receiver.poll() }
    await receiver.poll(); await sender.poll()
    assert.equal(events.length, 1)
    assert.equal(events[0].event.type, 'ALL_READ')
    assert.equal(echoes.length, 0)
  } finally { sender.stop(); receiver.stop() }
})
