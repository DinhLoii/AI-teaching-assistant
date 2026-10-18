import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryCache } from '../src/shared/infrastructure/memory-cache.js'
import { PrismaExamRepository } from '../src/modules/exams/infrastructure/repositories/prisma-exam-repository.js'
import { syncPendingEnrollments } from '../src/modules/classes/application/pending-enrollment-sync.js'
import { AutoZeroSubmissionService } from '../src/modules/submissions/application/services/auto-zero-submission.service.js'
import { Logger } from '../src/shared/infrastructure/logger.js'
import { dashboardResultSummaries } from '../src/modules/student-portal/application/dashboard-result-view.js'

test('dashboard projects structured grading summaries to text without exposing runtime diagnostics', () => {
  const result = dashboardResultSummaries({
    executionSummary: { runtimeStack: 'android', ready: false, limitation: '/private/compiler-error' },
    testcasesSummary: { passed: 2, total: 3 }, aiSummary: { unexpected: true },
  }, null)
  assert.match(result.execution, /chưa chạy trên máy ảo/)
  for (const value of Object.values(result)) {
    assert.equal(typeof value, 'string')
    assert.ok(!value.includes('/private'))
  }
  assert.equal(dashboardResultSummaries({ executionSummary: 'Legacy result' }, 'Teacher feedback').execution, 'Legacy result')
  assert.equal(dashboardResultSummaries({}, 'Teacher feedback').review, 'Teacher feedback')
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

test('local warning log level suppresses request chatter and is inherited by child loggers', t => {
  const debug = t.mock.method(console, 'debug', () => {})
  const info = t.mock.method(console, 'info', () => {})
  const warn = t.mock.method(console, 'warn', () => {})
  const error = t.mock.method(console, 'error', () => {})
  const logger = new Logger('local', 'warn')
  logger.debug('skip'); logger.info('skip')
  logger.createChild('child').debug('skip')
  logger.createChild('child').info('skip')
  logger.warn('warning'); logger.error('error')
  assert.equal(debug.mock.callCount(), 0)
  assert.equal(info.mock.callCount(), 0)
  assert.equal(warn.mock.callCount(), 1)
  assert.equal(error.mock.callCount(), 1)
})

test('concurrent cache misses execute once; failures can retry', async () => {
  const cache = new MemoryCache()
  const pending = deferred<number>()
  let calls = 0
  const load = () => { calls++; return pending.promise }
  const reads = Array.from({ length: 20 }, () => cache.wrap('classes_a', 60, load))
  await Promise.resolve()
  assert.equal(calls, 1)
  pending.resolve(7)
  assert.deepEqual(await Promise.all(reads), Array(20).fill(7))
  assert.equal(await cache.wrap('classes_a', 60, load), 7)
  assert.equal(calls, 1)
  await assert.rejects(cache.wrap('failed', 60, async () => { throw Error('temporary') }), /temporary/)
  assert.equal(await cache.wrap('failed', 60, async () => 8), 8)
})

test('invalidation prevents late reads from caching old data and keeps unrelated work', async () => {
  const cache = new MemoryCache()
  const old = deferred<string>(), fresh = deferred<string>(), unrelated = deferred<string>()
  const before = cache.wrap('exams_list_a', 60, () => old.promise)
  const subjects = cache.wrap('subjects_list', 60, () => unrelated.promise)
  cache.invalidatePrefix('exams_')
  const after = cache.wrap('exams_list_a', 60, () => fresh.promise)
  old.resolve('old')
  await before
  assert.equal(cache.get('exams_list_a'), null)
  fresh.resolve('new'); unrelated.resolve('subjects')
  await Promise.all([after, subjects])
  assert.equal(cache.get('exams_list_a'), 'new')
  assert.equal(cache.get('subjects_list'), 'subjects')
})

test('summary lists exclude grading trees and large configuration; detail retains them', async () => {
  const queries: any[] = []
  const db = { exam: {
    findMany: async (query: any) => { queries.push(query); return [{ Id: 'a', Title: 'A', Description: 'x'.repeat(10000), WeightPercentage: 15, ExamClass: [{ ClassId: 'class-a' }] }] },
    findUnique: async (query: any) => { queries.push(query); return null },
  } }
  const repo = new PrismaExamRepository(db)
  const rows = await repo.findMany({ lecturerScope: { userId: 'teacher', subjectIds: ['subject-a'] } }, { summary: true })
  assert.equal(rows[0].description?.length, 300)
  assert.equal(rows[0].weightPercentage, 15)
  const summary = queries[0]
  for (const field of ['ExamSection', 'AiGeneratedContent', 'OriginalPrompt', 'ExamAttachment']) assert.equal(summary.select[field], undefined)
  assert.deepEqual(summary.select.ExamClass, { select: { ClassId: true } })
  assert.equal(summary.where.AND[0].OR[0].CreatedBy, 'teacher')
  await repo.findById('a')
  assert.ok(queries[1].include.ExamSection.include.RubricRule.include.RubricCriterion)
  assert.ok(queries[1].include.TestCase)
  await repo.findMany({ studentScope: { classIds: ['class-a'], subjectIds: ['subject-a'] } }, { summary: true })
  assert.deepEqual(queries[2].where.AND[1].OR[0], { ExamClass: { some: { ClassId: { in: ['class-a'] } } } })
})

test('pending enrollments use three reads and one batch write, deduplicating subject/semester', async () => {
  const cache = new MemoryCache()
  let reads = 0, writes = 0
  const db = {
    pendingEnrollment: { findMany: async () => { reads++; return [
      { UserId: 'new', ClassCode: 'SE01', SemesterCode: 'SEM1', SubjectCode: 'PRM' },
      { UserId: 'new', ClassCode: 'SE01', SemesterCode: 'SEM1', SubjectCode: 'PRM' },
      { UserId: 'existing', ClassCode: 'SE01', SemesterCode: 'SEM1', SubjectCode: 'PRM' },
    ] } },
    class: { findMany: async () => { reads++; return [{ Id: 'class-a', ClassCode: 'SE01', SubjectId: 's', SemesterId: 'sem', Semester: { Code: 'SEM1' }, Subject: { SubjectCode: 'PRM' } }] } },
    studentClass: {
      findMany: async () => { reads++; return [{ UserId: 'existing', Class: { SubjectId: 's', SemesterId: 'sem' } }] },
      createMany: async ({ data, skipDuplicates }: any) => {
        writes++
        assert.equal(skipDuplicates, true)
        assert.deepEqual(data.map((row: any) => [row.UserId, row.ClassId]), [['new', 'class-a']])
        return { count: data.length }
      },
    },
  }
  await Promise.all(Array.from({ length: 20 }, () => syncPendingEnrollments(db, cache)))
  assert.equal(reads, 3)
  assert.equal(writes, 1)
  await syncPendingEnrollments(db, cache)
  assert.equal(reads, 3)
})

test('overdue-class synchronization creates zero scores in one batch and preserves submissions/extensions', async t => {
  const exam = {
    Id: 'performance-exam', DueDate: new Date('2000-01-01'), Status: 'Published', AllowLateSubmission: false,
    ExamClass: [{ ClassId: 'class-a', Class: { StudentClass: Array.from({ length: 120 }, (_, i) => ({ UserId: `student-${i}` })) } }],
    SubmissionOverride: [{ StudentId: 'student-0', ExtendedDueDate: new Date('2100-01-01') }],
  }
  const single = t.mock.fn(async () => { throw Error('Unexpected per-student write') })
  const batch = t.mock.fn(async (args: any) => {
    assert.equal(args.skipDuplicates, true)
    assert.equal(args.data.length, 118)
    for (const row of args.data) {
      assert.equal(row.TotalScore, 0)
      assert.equal(row.GradingStatus, 'Graded')
      assert.equal(row.ReviewStatus, 'PUBLISHED')
      assert.ok(!['student-0', 'student-1'].includes(row.StudentId))
    }
    return { count: args.data.length }
  })
  const db = {
    exam: { findUnique: async () => exam },
    publishedAssignment: { findUnique: async () => null },
    submission: { findMany: async () => [{ StudentId: 'student-1' }], create: single, createMany: batch },
  }
  assert.equal(await new AutoZeroSubmissionService(db as any).syncZeroScoresForExam(exam.Id), 118)
  assert.equal(batch.mock.callCount(), 1)
  assert.equal(single.mock.callCount(), 0)
})
