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

const future = new Date(Date.now() + 86400000).toISOString()
const dto: any = { data: { examId: 'exam', studentId: 'student', extendedDueDate: future, penaltyMode: 'WAIVE' } }
const user: any = { id: 'teacher', role: 'LECTURER' }
function fixture() {
  const writes: any[] = []
  const tx = {
    submissionOverride: { upsert: async (query: any) => { writes.push(query); return { Id: 'override', ...query.create } } },
    submission: { findFirst: async () => ({ Id: 'existing' }), update: async (query: any) => { writes.push(query); return {} } },
  }
  const db: any = {
    exam: { findFirst: async () => ({ Id: 'exam' }), findUnique: async () => ({ Id: 'exam', Title: 'Assignment', ExamClass: [{ ClassId: 'class' }] }) },
    user: { findUnique: async () => ({ Id: 'student' }) },
    studentClass: { findFirst: async () => ({ ClassId: 'class' }) },
    $transaction: async (fn: any) => fn(tx),
    notification: { create: async () => ({ Id: 'notice' }) },
    notificationRecipient: { create: async () => ({}) },
  }
  return { db, writes }
}
test('reopen saves a student extension and marks the existing attempt in one transaction', async () => {
  const { db, writes } = fixture()
  const result = await new ReopenSubmissionUseCase(db).execute({ dto, user })
  assert.equal(result.success, true)
  assert.equal(writes[0].create.StudentId, 'student')
  assert.equal(writes[0].create.ClassId, 'class')
  assert.equal(writes[0].update.ClassId, 'class')
  assert.equal(writes[1].data.IsReopened, true)
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
