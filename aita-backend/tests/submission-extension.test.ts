import test from 'node:test'
import assert from 'node:assert/strict'
import { ReopenSubmissionUseCase } from '../src/modules/submissions/application/use-cases/reopen-submission.use-case.js'
import { SubmissionResponseDto } from '../src/modules/submissions/application/dtos/submission.dto.js'
import { PrismaSubmissionRepository } from '../src/modules/submissions/infrastructure/repositories/prisma-submission-repository.js'
import { CreateSubmissionUseCase } from '../src/modules/submissions/application/use-cases/create-submission.use-case.js'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { readSubmissionFile } from '../src/modules/submissions/infrastructure/submission-storage.js'
import { studentExamDeadlines } from '../src/modules/exams/application/student-deadlines.js'
import { GetExamUseCase } from '../src/modules/exams/application/use-cases/get-exam.use-case.js'
import { ListExamsUseCase } from '../src/modules/exams/application/use-cases/list-exams.use-case.js'
import { memoryCache } from '../src/shared/infrastructure/memory-cache.js'
import { StudentPortalController } from '../src/modules/student-portal/presentation/student-portal.controller.js'
import { databaseTransactionOptions } from '../src/database/transaction-options.js'
import { errorHandler } from '../src/middleware/errorHandler.js'
import { Submission } from '../src/modules/submissions/domain/entities/submission.entity.js'
import { requiresManualUiStart } from '../src/modules/submissions/application/ui-grading-policy.js'

test('each resubmission queues its new identity and returns the committed grading state', async () => {
  for (const [strategy, subject] of [['CONTINUOUS_QUEUE', 'PRF192'], ['BATCH_POST_DEADLINE', 'PRF192'], ['CONTINUOUS_QUEUE', 'FER202']]) {
    let saved: any, taskWrites = 0
    const tx = {
      $executeRaw: async (parts: TemplateStringsArray, ...values: any[]) => { if (parts.join('').includes('INSERT INTO')) { taskWrites++; assert.equal(values[0], 'new-attempt') } return 1 },
      exam: { findUnique: async () => ({ GradingStrategy: strategy, Subject: { SubjectCode: subject } }) },
      submission: { aggregate: async () => ({ _max: { AttemptNumber: 1 } }), updateMany: async () => ({ count: 1 }), create: async ({ data }: any) => { saved = data } },
    }
    const repository = new PrismaSubmissionRepository({ $transaction: async (work: any) => work(tx) })
    const attempt = Submission.create('new-attempt', 'student', 'exam', 'class', 1, '/private-submissions/new.zip')
    await repository.createAttempt(attempt)
    assert.equal(attempt.attemptNumber, 2)
    assert.equal(attempt.gradingStatus, saved.GradingStatus)
    const automatic = strategy === 'CONTINUOUS_QUEUE' && subject !== 'FER202'
    assert.equal(SubmissionResponseDto.from(attempt, 'STUDENT').gradingStatus, automatic ? 'Processing' : 'Pending')
    assert.equal(taskWrites, automatic ? 1 : 0)
  }
})

test('UI start policy uses explicit UI configuration and subject, not the generic project label', () => {
  assert.equal(requiresManualUiStart({ Subject: { SubjectCode: 'FER202' } }), true)
  assert.equal(requiresManualUiStart({ AiGeneratedContent: JSON.stringify({ projectType: 'frontend' }) }), true)
  assert.equal(requiresManualUiStart({ Subject: { SubjectCode: 'PRF192' }, SubmissionFormat: 'project' }), false)
  assert.equal(requiresManualUiStart({ AiGeneratedContent: JSON.stringify({ rubric: { rules: [{ scoringStrategy: 'AIVision' }] } }) }), true)
})

const future = new Date(Date.now() + 86400000).toISOString()
const dto: any = { data: { examId: 'exam', studentId: 'student', extendedDueDate: future, penaltyMode: 'WAIVE' } }
const user: any = { id: 'teacher', role: 'LECTURER' }
function fixture() {
  const writes: any[] = []
  const notices: any[] = []
  const tx = {
    submissionOverride: { upsert: async (query: any) => { writes.push(query); return { Id: 'override', ...query.create } } },
    $executeRaw: async (sql: TemplateStringsArray, ...values: any[]) => { writes.push({ sql: sql.join('?'), values }); return 1 },
    notification: { create: async (query: any) => { notices.push(query); return { Id: 'notice', ...query.data } } },
    notificationRecipient: { create: async (query: any) => { notices.push(query); return {} } },
  }
  const db: any = {
    exam: { findFirst: async () => ({ Id: 'exam' }), findUnique: async () => ({ Id: 'exam', Title: 'Assignment', ExamClass: [{ ClassId: 'class' }] }) },
    user: { findUnique: async () => ({ Id: 'student' }) },
    studentClass: { findFirst: async () => ({ ClassId: 'class' }) },
    $transaction: async (fn: any, options: any) => {
      assert.deepEqual(options, databaseTransactionOptions)
      assert.ok(options.timeout >= 30000)
      assert.ok(options.maxWait >= 15000)
      return fn(tx)
    },
  }
  return { db, writes, notices, tx }
}
test('reopen saves a student extension and marks the existing attempt in one transaction', async () => {
  const { db, writes, notices } = fixture()
  memoryCache.set('student_dash_student', { stale: true })
  const result = await new ReopenSubmissionUseCase(db).execute({ dto, user })
  assert.equal(result.success, true)
  assert.equal(writes[0].create.StudentId, 'student')
  assert.equal(writes[0].create.ClassId, 'class')
  assert.equal(writes[0].update.ClassId, 'class')
  assert.match(writes[1].sql, /SET "IsReopened"=true/)
  assert.deepEqual(writes[1].values.slice(1), ['exam', 'student', 'class'])
  assert.equal(notices[0].data.Type, 'ASSIGNMENT_REOPENED')
  assert.equal(notices[0].data.ReferenceId, 'exam')
  assert.equal(notices[1].data.UserId, 'student')
  assert.equal(memoryCache.get('student_dash_student'), null)
})

test('extensions use the same transaction budget for every subject, including first submissions', async () => {
  for (const examId of ['mobile-exam', 'java-exam', 'database-exam']) {
    const { db, tx, writes, notices } = fixture()
    tx.$executeRaw = async (sql: TemplateStringsArray, ...values: any[]) => { writes.push({ sql: sql.join('?'), values }); return 0 }
    const result = await new ReopenSubmissionUseCase(db).execute({ dto: { data: { ...dto.data, examId } } as any, user })
    assert.equal(result.success, true)
    assert.equal(writes[0].create.ExamId, examId)
    assert.equal(writes[1].values[1], examId)
    assert.equal(notices[0].data.ReferenceId, examId)
  }
})

test('expired transactions return a readable retry message without leaking Prisma internals', () => {
  const error = Object.assign(new Error('Invalid tx.submission.findFirst(): transaction expired at C:/source/private.ts'), { name: 'PrismaClientKnownRequestError', code: 'P2028' })
  let status: number | undefined, payload: any
  const res: any = { status(value: number) { status = value; return this }, json(value: any) { payload = value } }
  errorHandler(error, { method: 'POST', originalUrl: '/api/submissions/reopen', body: {}, query: {} } as any, res, () => {})
  assert.equal(status, 503)
  assert.match(JSON.stringify(payload), /DATABASE_TIMEOUT/)
  assert.doesNotMatch(JSON.stringify(payload), /findFirst|private\.ts|P2028/)
})

test('extension does not report success when its notification cannot be persisted', async () => {
  const { db, tx } = fixture()
  tx.notificationRecipient.create = async () => { throw Error('notification unavailable') }
  await assert.rejects(new ReopenSubmissionUseCase(db).execute({ dto, user }), /notification unavailable/)
})

test('student deadline reads use the extension before class and original exam deadlines', async () => {
  const calls: any[] = []
  const db: any = {
    examClass: { findMany: async (query: any) => { calls.push(query); return [{ ExamId: 'exam', DueDate: '2020-01-01' }, { ExamId: 'class-only', DueDate: future }] } },
    submissionOverride: { findMany: async (query: any) => { calls.push(query); return [{ ExamId: 'exam', ExtendedDueDate: future }] } },
  }
  const dates = await studentExamDeadlines(db, 'student', ['exam', 'class-only', 'original-only'], 'class')
  assert.equal(dates.get('exam')?.toISOString(), future)
  assert.equal(dates.get('class-only')?.toISOString(), future)
  assert.equal(dates.has('original-only'), false)
  assert.equal(calls[0].where.Class.StudentClass.some.UserId, 'student')
  assert.equal(calls[1].where.StudentId, 'student')
  assert.deepEqual(calls[1].where.OR, [{ ClassId: 'class' }, { ClassId: null }])

  const exam = { id: 'exam', status: 'Published', dueDate: '2020-01-01', classes: ['class'], subjectId: 'subject' }
  const repo: any = { findById: async () => exam, findMany: async () => [exam] }
  db.publishedAssignment = { findMany: async () => [] }
  const uow: any = { resolve: () => ({ findMany: async () => [{ id: 'class', subjectId: 'subject' }] }) }
  const detail = await new GetExamUseCase(repo, db).execute('exam', 'student', 'STUDENT', true)
  const [list] = await new ListExamsUseCase(repo, uow, db).execute({ user: { id: 'student', role: 'STUDENT' } as any, params: { view: 'summary' } })
  for (const response of [detail, list]) {
    assert.equal(response.due, future)
    assert.equal(response.dueAt, future)
    assert.equal(response.dueDate, future)
  }
  const staff = await new GetExamUseCase(repo, db).execute('exam', 'teacher', 'LECTURER', true)
  assert.equal(staff.dueDate, '2020-01-01T00:00:00.000Z')
  assert.equal(exam.dueDate, '2020-01-01')
})
test('submission IDs, unenrolled students and student callers cannot create extensions', async () => {
  const { db, writes } = fixture()
  db.user.findUnique = async () => null
  await assert.rejects(new ReopenSubmissionUseCase(db).execute({ dto, user }), /tài khoản sinh viên/)
  assert.equal(writes.length, 0)
  db.user.findUnique = async () => ({ Id: 'student' })
  db.studentClass.findFirst = async () => null
  await assert.rejects(new ReopenSubmissionUseCase(db).execute({ dto, user }), /không thuộc lớp/)
  await assert.rejects(new ReopenSubmissionUseCase(db).execute({ dto, user: { ...user, role: 'STUDENT' } }), /quyền/)
  assert.equal(writes.length, 0)
})

test('dashboard and class cards show an unsubmitted student\'s extension instead of the overdue exam date', async () => {
  const exam = { Id: 'exam', Title: 'Assignment', DueDate: new Date('2020-01-01'), ExamClass: [{ Class: { Id: 'class' } }] }
  const db: any = {
    exam: { findMany: async () => [exam], count: async () => 1 },
    submission: { findMany: async () => [], findFirst: async () => null },
    class: { findMany: async () => [], findFirst: async () => ({ Id: 'class', StudentClass: [], ExamClass: [{ Exam: exam }] }) },
    notification: { findMany: async () => [] },
    notificationRecipient: { count: async () => 1 },
    examClass: { findMany: async () => [{ ExamId: 'exam', DueDate: exam.DueDate }] },
    submissionOverride: { findMany: async () => [{ ExamId: 'exam', ExtendedDueDate: new Date(future) }] },
  }
  const controller = new StudentPortalController({ debug() {} } as any, db)
  const req: any = { user: { id: 'deadline-card-student' }, params: { id: 'class' } }
  let payload: any
  const res: any = { status() { return this }, json(body: any) { payload = body.Data ?? body.data; return this } }
  await controller.getDashboard(req, res)
  assert.equal(new Date(payload.upcomingAssignments[0].due).toISOString(), future)
  assert.equal(payload.upcomingAssignments[0].status, 'PENDING')
  await controller.getClassDetail(req, res)
  assert.equal(new Date(payload.assignments[0].dueDate).toISOString(), future)
  assert.equal(payload.assignments[0].isSubmitted, false)
})
test('student responses retain only their own extension through repository mapping', async () => {
  const db: any = { submission: { findMany: async (query: any) => {
    assert.ok(query.include.Exam.select.SubmissionOverride)
    return [{ Id: 'submission', ExamId: 'exam', StudentId: 'student', ClassId: 'class', ReviewStatus: 'DRAFT',
      Exam: { SubmissionOverride: [
        { StudentId: 'other', ClassId: 'class', ExtendedDueDate: new Date('2040-01-01') },
        { StudentId: 'student', ClassId: 'other-class', ExtendedDueDate: new Date('2041-01-01') },
        { StudentId: 'student', ClassId: 'class', ExtendedDueDate: new Date(future) },
      ] } }]
  } } }
  const [record] = await new PrismaSubmissionRepository(db).findMany({ studentId: 'student' })
  const response = SubmissionResponseDto.from(record, 'STUDENT')
  assert.equal(response.extendedDueDate, future)
  assert.equal(response.studentId, 'student')
})

test('upload honors an active extension on a closed exam and rejects expired extensions', async () => {
  let extension: Date | null = new Date(future)
  let closed = true
  let classDue = new Date('2000-01-01')
  const db = {
    submission: { findFirst: async () => null },
    exam: { findUnique: async () => ({ Status: closed ? 'Closed' : 'Published', DueDate: new Date('2100-01-01'), AllowLateSubmission: false, SubmissionOverride: extension ? [{ ExtendedDueDate: extension }] : [] }) },
    examClass: { findUnique: async () => ({ DueDate: classDue }) },
    publishedAssignment: { findUnique: async () => null },
  }
  const repositories: Record<string, any> = {
    ExamRepository: { findById: async () => ({ id: 'exam', dueDate: '2000-01-01' }) },
    ClassRepository: { findById: async () => ({ subjectId: 'subject' }) },
    SubjectRepository: { findById: async () => ({}) },
    EnrollmentRepository: { findMany: async () => [{}] },
  }
  const uow: any = { resolve: (token: symbol) => repositories[Symbol.keyFor(token)!] }
  const service = new CreateSubmissionUseCase({ findMany: async () => [] } as any, uow, db)
  const input: any = { dto: { data: { examId: 'exam', classId: 'class' } }, user: { id: 'student', role: 'STUDENT' }, file: { originalname: 'invalid.txt' } }
  // Reaching file validation proves the deadline gate accepted the active extension.
  await assert.rejects(service.execute(input), /tệp ZIP/)
  extension = new Date('2000-01-01')
  await assert.rejects(service.execute(input), /đã bị đóng/)
  closed = false
  await assert.rejects(service.execute(input), /Hạn nộp bài/)
  extension = null
  await assert.rejects(service.execute(input), /Hạn nộp bài/)
  classDue = new Date(future)
  await assert.rejects(service.execute(input), /tệp ZIP/)
})

test('upload acknowledges the committed archive while notification storage is still pending', { timeout: 5000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aita-upload-'))
  const previousRoot = process.env.PRIVATE_SUBMISSION_DIR
  process.env.PRIVATE_SUBMISSION_DIR = root
  let releaseCommit!: () => void, releaseNotification!: (value: any) => void, startedSave!: () => void
  const committed = new Promise<void>(resolve => { releaseCommit = resolve })
  const saving = new Promise<void>(resolve => { startedSave = resolve })
  const notificationLookup = new Promise(resolve => { releaseNotification = resolve })
  let acknowledged = false, saved: any
  const db: any = {
    submission: { findFirst: async () => null },
    exam: { findUnique: async () => ({ Status: 'Published', ExamClass: [], DueDate: new Date(future), SubmissionOverride: [] }) },
    examClass: { findUnique: async () => null },
    publishedAssignment: { findUnique: async () => null },
    user: { findUnique: () => notificationLookup },
    notificationRecipient: { deleteMany: async () => ({ count: 0 }) },
  }
  const repos: Record<string, any> = {
    ExamRepository: { findById: async () => ({ id: 'exam', title: 'Fixture', dueDate: future }) },
    ClassRepository: { findById: async () => ({ subjectId: 'subject', classCode: 'CLASS' }) },
    SubjectRepository: { findById: async () => ({ subjectCode: 'JAVA' }) },
    EnrollmentRepository: { findMany: async () => [{}] },
  }
  const repo: any = { createAttempt: async (record: any) => { saved = record; startedSave(); await committed; record.attemptNumber = 3 } }
  const service = new CreateSubmissionUseCase(repo, { resolve: (token: symbol) => repos[Symbol.keyFor(token)!] } as any, db)
  const zip = new AdmZip()
  zip.addFile('Main.java', Buffer.from('class Main {}'))
  const bytes = zip.toBuffer()
  try {
    const request = service.execute({ dto: { data: { examId: 'exam', classId: 'class' } } as any, user: { id: 'student', role: 'STUDENT' } as any, file: { originalname: 'submission.zip', buffer: bytes } as any }).then(result => { acknowledged = true; return result })
    await saving
    assert.equal(acknowledged, false, 'must wait for the archive reference and task transaction')
    releaseCommit()
    const accepted = await request
    assert.equal(accepted.id, saved.id)
    assert.equal(accepted.attemptNumber, 3)
    assert.deepEqual(await readSubmissionFile(accepted.zipFileUrl!), bytes)
    // A failed save must reject and remove its new ZIP rather than acknowledge it.
    const failing = new CreateSubmissionUseCase({ createAttempt: async () => { throw Error('transaction failed') } } as any, { resolve: (token: symbol) => repos[Symbol.keyFor(token)!] } as any, db)
    await assert.rejects(failing.execute({ dto: { data: { examId: 'exam', classId: 'class' } } as any, user: { id: 'student', role: 'STUDENT' } as any, file: { originalname: 'submission.zip', buffer: bytes } as any }), /transaction failed/)
    assert.equal((await fs.readdir(path.join(root, 'JAVA', 'CLASS'))).length, 1)
  } finally {
    releaseCommit()
    releaseNotification(null)
    if (previousRoot === undefined) delete process.env.PRIVATE_SUBMISSION_DIR
    else process.env.PRIVATE_SUBMISSION_DIR = previousRoot
    await fs.rm(root, { recursive: true, force: true })
  }
})
